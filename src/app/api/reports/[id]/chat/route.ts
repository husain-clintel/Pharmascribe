import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import prisma from '@/lib/db/prisma'
import { generateChatPrompt } from '@/lib/ai/prompts/pk-report'
import { getContextMemories, storeDecision, parseMemoryContent } from '@/lib/agent/memory-client'
import type { DecisionContent, FactContent } from '@/lib/agent/types'
import { optionalReportOwnership } from '@/lib/auth/api-auth'
import type { QCResult } from '@/types'

// Increase timeout for AI chat with file context
export const maxDuration = 120

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // Check ownership (allows demo mode access)
    const { error: authError } = await optionalReportOwnership(request, id)
    if (authError) return authError

    const messages = await prisma.chatMessage.findMany({
      where: { reportId: id },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error('Failed to fetch chat messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // Check ownership (allows demo mode access)
    const { error: authError } = await optionalReportOwnership(request, id)
    if (authError) return authError

    const { message, qcFindings } = await request.json() as { message: string; qcFindings?: QCResult[] }

    // Get report with uploaded files for context
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        chatMessages: { orderBy: { createdAt: 'asc' } },
        uploadedFiles: true
      }
    })

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // Recall relevant memories from DynamoDB
    let memoryContext = ''
    try {
      const memories = await getContextMemories(id)
      if (memories.length > 0) {
        const memoryLines = memories.map(m => {
          const content = parseMemoryContent<DecisionContent | FactContent>(m)
          if (m.memoryType === 'DECISION') {
            const dc = content as DecisionContent
            return `- Decision: ${dc.decision}${dc.section ? ` (for ${dc.section})` : ''}`
          } else if (m.memoryType === 'FACT') {
            return `- Fact: ${JSON.stringify(content)}`
          } else {
            return `- ${m.memoryType}: ${JSON.stringify(content)}`
          }
        })
        memoryContext = `\n\n## Previous Context & Decisions:\n${memoryLines.join('\n')}\n`
        console.log(`Loaded ${memories.length} memories for report ${id}`)
      }
    } catch (memError) {
      console.error('Failed to load memories:', memError)
      // Continue without memories
    }

    // Get API key
    const apiKey = process.env.ANTHROPIC_API_KEY || (await prisma.apiSettings.findFirst({ where: { id: 'default' } }))?.geminiApiKey
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Claude API key not configured' },
        { status: 400 }
      )
    }

    // Save user message
    await prisma.chatMessage.create({
      data: {
        role: 'USER',
        content: message,
        reportId: id
      }
    })

    // Build chat history
    const chatHistory = report.chatMessages.map(m => ({
      role: m.role,
      content: m.content
    }))

    // Generate response using Claude
    const anthropic = new Anthropic({ apiKey })
    const basePrompt = generateChatPrompt(report as any, message, chatHistory)
    let prompt = memoryContext ? basePrompt + memoryContext : basePrompt

    // Add structured QC findings context if present
    if (qcFindings && qcFindings.length > 0) {
      // Build section mapping for the AI to use correct IDs
      const content = report.content as any
      const sectionIdMap = content?.sections?.map((s: any) =>
        `  "${s.title}" → "${s.id}"`
      ).join('\n') || ''

      const qcContext = `\n\n## QC ISSUES TO ADDRESS:\n\nThe user has selected the following QC issues to be fixed. You MUST address each one:\n\n${qcFindings.map((issue, i) => `${i + 1}. **[${issue.severity}] ${issue.category}**
   - Section: ${issue.section}
   - Issue: ${issue.issue}
   ${issue.suggestion ? `- Suggestion: ${issue.suggestion}` : ''}
   - Issue ID: ${issue.id}`).join('\n\n')}

## SECTION ID MAPPING (use exact IDs from right column):
${sectionIdMap}

## IMPORTANT INSTRUCTIONS FOR QC FIX:
1. Address EACH issue listed above
2. For each fix, explain what you changed and why
3. **CRITICAL**: Use the EXACT section IDs from the mapping above in your JSON changes
4. For example, if fixing "Executive Summary", use "id": "exec-summary" (check the mapping)
5. Make sure your changes are reflected in the JSON output
6. After fixing, verify the section content no longer has the issue
7. If an issue cannot be fixed automatically, explain why and suggest manual steps
`
      prompt = prompt + qcContext
      console.log(`Including ${qcFindings.length} QC findings in prompt`)
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    })

    const textBlock = response.content.find(block => block.type === 'text')
    const text = textBlock ? textBlock.text : ''

    // Check if response contains changes
    let madeChanges = false
    let metadata: any = null
    const changedSections: string[] = []
    let plotConfig: any = null

    // Try multiple JSON block patterns
    const jsonPatterns = [
      /```json\n([\s\S]*?)\n```/,
      /```json\s*([\s\S]*?)\s*```/,
      /```\n?([\s\S]*?)\n?```/
    ]

    let jsonMatch = null
    for (const pattern of jsonPatterns) {
      jsonMatch = text.match(pattern)
      if (jsonMatch) break
    }

    // Check if the JSON contains a plot configuration
    if (jsonMatch) {
      try {
        const parsedJson = JSON.parse(jsonMatch[1])
        if (parsedJson.plotType || parsedJson.type === 'plot') {
          // This is a plot generation request
          plotConfig = {
            type: parsedJson.plotType || parsedJson.type || 'line',
            title: parsedJson.title || 'Generated Plot',
            xLabel: parsedJson.xLabel || parsedJson.xAxis || 'X',
            yLabel: parsedJson.yLabel || parsedJson.yAxis || 'Y',
            data: parsedJson.data || [],
            showLegend: parsedJson.showLegend !== false,
            semiLogY: parsedJson.semiLogY || false,
            fileName: parsedJson.fileName
          }
          metadata = { ...metadata, plotConfig }
          console.log('Plot configuration detected in response')
        }
      } catch (e) {
        // Not a plot config, continue with normal processing
      }
    }

    if (jsonMatch) {
      try {
        const changes = JSON.parse(jsonMatch[1])
        const content = report.content as any || { sections: [], tables: [], figures: [] }

        // Handle section changes
        if (changes.changes?.sections && Array.isArray(changes.changes.sections)) {
          if (!content.sections) content.sections = []

          for (const change of changes.changes.sections) {
            if (!change.id || !change.content) continue

            // Try direct ID match first
            let sectionIndex = content.sections.findIndex(
              (s: any) => s.id === change.id
            )

            // If not found, try matching by normalized ID or title
            if (sectionIndex < 0) {
              const normalizedChangeId = change.id.toLowerCase().replace(/[^a-z0-9]/g, '')
              sectionIndex = content.sections.findIndex(
                (s: any) => {
                  const normalizedSectionId = s.id?.toLowerCase().replace(/[^a-z0-9]/g, '') || ''
                  const normalizedTitle = s.title?.toLowerCase().replace(/[^a-z0-9]/g, '') || ''
                  return normalizedSectionId === normalizedChangeId || normalizedTitle === normalizedChangeId
                }
              )
              if (sectionIndex >= 0) {
                console.log(`Matched section by fuzzy match: ${change.id} -> ${content.sections[sectionIndex].id}`)
              }
            }

            if (sectionIndex >= 0) {
              content.sections[sectionIndex].content = change.content
              changedSections.push(content.sections[sectionIndex].id)
              console.log(`Updated section: ${content.sections[sectionIndex].id}`)
            } else {
              console.log(`Section not found: ${change.id}`)
            }
          }
        }

        // Handle table changes
        if (changes.changes?.tables && Array.isArray(changes.changes.tables)) {
          if (!content.tables) content.tables = []

          for (const tableChange of changes.changes.tables) {
            const tableIndex = content.tables.findIndex(
              (t: any) => t.id === tableChange.id
            )
            if (tableIndex >= 0) {
              content.tables[tableIndex] = { ...content.tables[tableIndex], ...tableChange }
              changedSections.push(`table-${tableChange.id}`)
            }
          }
        }

        // Handle figure changes
        if (changes.changes?.figures && Array.isArray(changes.changes.figures)) {
          if (!content.figures) content.figures = []

          for (const figureChange of changes.changes.figures) {
            const figureIndex = content.figures.findIndex(
              (f: any) => f.id === figureChange.id
            )
            if (figureIndex >= 0) {
              content.figures[figureIndex] = { ...content.figures[figureIndex], ...figureChange }
              changedSections.push(`figure-${figureChange.id}`)
            }
          }
        }

        // Handle NEW tables (adding tables, not updating)
        if (changes.changes?.newTables && Array.isArray(changes.changes.newTables)) {
          if (!content.tables) content.tables = []

          for (const newTable of changes.changes.newTables) {
            // Ensure required fields
            if (!newTable.id || !newTable.caption) continue

            // Auto-assign number if not provided
            if (!newTable.number) {
              newTable.number = content.tables.length + 1
            }

            // Ensure data is properly formatted as 2D array
            if (newTable.data && !Array.isArray(newTable.data[0])) {
              // Convert 1D array to 2D if needed
              newTable.data = [newTable.data]
            }

            content.tables.push(newTable)
            changedSections.push(`new-table-${newTable.id}`)
            console.log(`Added new table: ${newTable.id}`)
          }
        }

        // Handle NEW figures (adding figures)
        if (changes.changes?.newFigures && Array.isArray(changes.changes.newFigures)) {
          if (!content.figures) content.figures = []

          for (const newFigure of changes.changes.newFigures) {
            if (!newFigure.id || !newFigure.caption) continue

            if (!newFigure.number) {
              newFigure.number = content.figures.length + 1
            }

            content.figures.push(newFigure)
            changedSections.push(`new-figure-${newFigure.id}`)
            console.log(`Added new figure: ${newFigure.id}`)
          }
        }

        // Handle appendix tables
        if (changes.changes?.appendixTables && Array.isArray(changes.changes.appendixTables)) {
          if (!content.appendixTables) content.appendixTables = []

          for (const appendixTable of changes.changes.appendixTables) {
            if (!appendixTable.id || !appendixTable.caption) continue

            // Check if it's an update or new addition
            const existingIndex = content.appendixTables.findIndex(
              (t: any) => t.id === appendixTable.id
            )

            if (existingIndex >= 0) {
              content.appendixTables[existingIndex] = { ...content.appendixTables[existingIndex], ...appendixTable }
            } else {
              content.appendixTables.push(appendixTable)
            }
            changedSections.push(`appendix-table-${appendixTable.id}`)
          }
        }

        // Save changes if any were made
        if (changedSections.length > 0) {
          await prisma.report.update({
            where: { id },
            data: { content }
          })

          madeChanges = true
          metadata = { changes: changedSections }
          console.log(`Applied changes to: ${changedSections.join(', ')}`)

          // If QC findings were being addressed, mark them as FIXED
          if (qcFindings && qcFindings.length > 0) {
            try {
              // Mark all the QC issues as FIXED since the agent addressed them
              const qcIssueIds = qcFindings.map(f => f.id)
              await prisma.qCResult.updateMany({
                where: {
                  id: { in: qcIssueIds },
                  reportId: id,
                  status: 'PENDING'
                },
                data: {
                  status: 'FIXED',
                  resolvedAt: new Date(),
                  resolution: `Auto-fixed by AI agent. Changes applied to: ${changedSections.join(', ')}`
                }
              })
              console.log(`Marked ${qcIssueIds.length} QC issues as FIXED`)

              // Add fixed QC issue IDs to metadata
              metadata.fixedQcIssues = qcIssueIds
            } catch (qcError) {
              console.error('Failed to update QC status:', qcError)
            }
          }

          // Store this as a decision in agent memory
          try {
            await storeDecision(
              id,
              `Made changes to: ${changedSections.join(', ')}`,
              changedSections[0],
              `User request: ${message.substring(0, 100)}`
            )
          } catch (memError) {
            console.error('Failed to store decision:', memError)
          }
        }
      } catch (e) {
        console.error('JSON parsing failed:', e)
        // JSON parsing failed, no changes made
      }
    }

    // Clean response (remove JSON block if present)
    const cleanedResponse = text.replace(/```json\n[\s\S]*?\n```/g, '').trim()

    // Save assistant message
    await prisma.chatMessage.create({
      data: {
        role: 'ASSISTANT',
        content: cleanedResponse,
        metadata,
        reportId: id
      }
    })

    return NextResponse.json({
      response: cleanedResponse,
      madeChanges,
      metadata
    })
  } catch (error) {
    console.error('Failed to process chat:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to process message'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
