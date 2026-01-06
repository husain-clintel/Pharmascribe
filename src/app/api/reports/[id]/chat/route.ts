import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import prisma from '@/lib/db/prisma'
import { generateChatPrompt } from '@/lib/ai/prompts/pk-report'
import { getContextMemories, storeDecision, parseMemoryContent } from '@/lib/agent/memory-client'
import type { DecisionContent, FactContent } from '@/lib/agent/types'
import { requireReportOwnership } from '@/lib/auth/api-auth'

// Increase timeout for AI chat with file context
export const maxDuration = 120

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // Check ownership
    const { error: authError } = await requireReportOwnership(request, id)
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
    // Check ownership
    const { error: authError } = await requireReportOwnership(request, id)
    if (authError) return authError

    const { message } = await request.json()

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
    const prompt = memoryContext ? basePrompt + memoryContext : basePrompt

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5-20250114',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    })

    const textBlock = response.content.find(block => block.type === 'text')
    const text = textBlock ? textBlock.text : ''

    // Check if response contains changes
    let madeChanges = false
    let metadata: any = null
    const changedSections: string[] = []

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

    if (jsonMatch) {
      try {
        const changes = JSON.parse(jsonMatch[1])
        const content = report.content as any || { sections: [], tables: [], figures: [] }

        // Handle section changes
        if (changes.changes?.sections && Array.isArray(changes.changes.sections)) {
          if (!content.sections) content.sections = []

          for (const change of changes.changes.sections) {
            if (!change.id || !change.content) continue

            const sectionIndex = content.sections.findIndex(
              (s: any) => s.id === change.id
            )
            if (sectionIndex >= 0) {
              content.sections[sectionIndex].content = change.content
              changedSections.push(change.id)
              console.log(`Updated section: ${change.id}`)
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
