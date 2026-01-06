import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import prisma from '@/lib/db/prisma'
import { PK_REPORT_SYSTEM_PROMPT, generateReportPrompt } from '@/lib/ai/prompts/pk-report'
import { PHARMACOLOGY_REPORT_SYSTEM_PROMPT, generatePharmacologyReportPrompt } from '@/lib/ai/prompts/pharmacology-report'
import { optionalReportOwnership } from '@/lib/auth/api-auth'

// Type for dynamic generation answers
interface GenerationAnswers {
  [questionId: string]: string | string[]
}

// Increase timeout for AI generation (5 minutes for Pro plan)
export const maxDuration = 300

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // Extract generation answers from request body
    let generationAnswers: GenerationAnswers | undefined
    try {
      const body = await request.json()
      generationAnswers = body.generationAnswers
    } catch {
      // No body or invalid JSON - that's fine, answers are optional
    }

    // Check ownership (allows demo mode access)
    const { error: authError } = await optionalReportOwnership(request, id)
    if (authError) return authError

    // Get report with files
    const report = await prisma.report.findUnique({
      where: { id },
      include: { uploadedFiles: true }
    })

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // Get API key - check environment variable first, then database
    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      // Try database as fallback
      const settings = await prisma.apiSettings.findFirst({
        where: { id: 'default' }
      })

      if (!settings?.geminiApiKey) {
        return NextResponse.json(
          { error: 'Claude API key not configured. Please set ANTHROPIC_API_KEY environment variable or configure in Settings.' },
          { status: 400 }
        )
      }
    }

    const finalApiKey = apiKey || (await prisma.apiSettings.findFirst({ where: { id: 'default' } }))?.geminiApiKey

    if (!finalApiKey) {
      return NextResponse.json(
        { error: 'Claude API key not found' },
        { status: 400 }
      )
    }

    // Build context from uploaded files
    let context = null
    if (report.uploadedFiles && report.uploadedFiles.length > 0) {
      context = {
        files: report.uploadedFiles.map(f => ({
          filename: f.filename,
          fileType: f.fileType,
          extractedData: f.extractedData
        }))
      }
    }

    // Update status to generating
    await prisma.report.update({
      where: { id },
      data: { status: 'GENERATING' }
    })

    // Generate report using Claude - select prompt based on report type
    const anthropic = new Anthropic({ apiKey: finalApiKey })

    let systemPrompt: string
    let prompt: string

    switch (report.reportType) {
      case 'PHARMACOLOGY':
        systemPrompt = PHARMACOLOGY_REPORT_SYSTEM_PROMPT
        prompt = generatePharmacologyReportPrompt(report as any, context, generationAnswers)
        break
      case 'PK_REPORT':
      default:
        systemPrompt = PK_REPORT_SYSTEM_PROMPT
        prompt = generateReportPrompt(report as any, context, generationAnswers)
        break
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }]
    })

    const textBlock = response.content.find(block => block.type === 'text')
    const text = textBlock ? textBlock.text : ''

    // Parse JSON from response - try multiple extraction methods
    let content
    try {
      let jsonStr = ''

      // Method 1: Look for JSON in markdown code block
      const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim()
      }

      // Method 2: Try to find a balanced JSON object starting with { and ending with }
      if (!jsonStr) {
        // Find the first { and try to extract balanced JSON
        const startIdx = text.indexOf('{')
        if (startIdx !== -1) {
          let depth = 0
          let endIdx = -1
          let inString = false
          let escapeNext = false

          for (let i = startIdx; i < text.length; i++) {
            const char = text[i]

            if (escapeNext) {
              escapeNext = false
              continue
            }

            if (char === '\\' && inString) {
              escapeNext = true
              continue
            }

            if (char === '"' && !escapeNext) {
              inString = !inString
              continue
            }

            if (!inString) {
              if (char === '{') depth++
              if (char === '}') {
                depth--
                if (depth === 0) {
                  endIdx = i
                  break
                }
              }
            }
          }

          if (endIdx !== -1) {
            jsonStr = text.slice(startIdx, endIdx + 1)
          }
        }
      }

      // Method 3: Fallback to simple regex (original method)
      if (!jsonStr) {
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          jsonStr = jsonMatch[0]
        }
      }

      if (!jsonStr) {
        throw new Error('No JSON found in response')
      }

      content = JSON.parse(jsonStr)

      // Post-process: Clean up any JSON artifacts in section content
      if (content.sections && Array.isArray(content.sections)) {
        content.sections = content.sections.map((section: any) => {
          if (typeof section.content === 'string') {
            // Remove any stray JSON-like patterns that shouldn't be in content
            let cleaned = section.content
              // Remove markdown code block syntax if accidentally included
              .replace(/```(?:json)?\s*/g, '')
              .replace(/```\s*/g, '')
              // Clean up escaped newlines that should be actual newlines
              .replace(/\\n/g, '\n')
              // Remove any JSON object patterns that look like {\"key\": \"value\"}
              .replace(/\{\\?"[^"]+\\?":\s*\\?"[^"]*\\?"(?:,\s*\\?"[^"]+\\?":\s*\\?"[^"]*\\?")*\\?\}/g, '')
              .trim()
            return { ...section, content: cleaned }
          }
          return section
        })
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      // Create a basic structure if parsing fails
      content = {
        sections: [
          {
            id: 'exec-summary',
            title: 'Executive Summary',
            level: 1,
            numbered: false,
            content: text.slice(0, 500) + '...',
            order: 1
          }
        ],
        tables: [],
        figures: [],
        metadata: {
          studyId: report.studyId,
          reportTitle: report.reportTitle,
          reportVersion: '1.0',
          reportDate: new Date().toLocaleDateString()
        }
      }
    }

    // Post-process: Add blob URLs to figures from uploaded files
    if (content.figures && Array.isArray(content.figures) && report.uploadedFiles) {
      const figureFiles = report.uploadedFiles.filter(f =>
        f.fileType === 'FIGURE' ||
        /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(f.filename)
      )

      content.figures = content.figures.map((fig: any, index: number) => {
        // Try to match by filename or use index
        const matchedFile = figureFiles.find(f =>
          f.filename === fig.filename ||
          f.filename.toLowerCase().includes(fig.filename?.toLowerCase() || '')
        ) || figureFiles[index]

        if (matchedFile) {
          return {
            ...fig,
            filename: matchedFile.filename,
            blobUrl: matchedFile.blobUrl,
            fileId: matchedFile.id
          }
        }
        return fig
      })

      // Also add any figure files that weren't included
      const includedFilenames = content.figures.map((f: any) => f.filename?.toLowerCase())
      figureFiles.forEach((file, index) => {
        if (!includedFilenames.includes(file.filename?.toLowerCase())) {
          content.figures.push({
            id: `figure-${content.figures.length + 1}`,
            number: content.figures.length + 1,
            filename: file.filename,
            blobUrl: file.blobUrl,
            fileId: file.id,
            caption: `Figure ${content.figures.length + 1}: ${file.filename}`,
            sectionId: 'plasma-pk'
          })
        }
      })
    }

    // Initialize figures array if missing but we have figure files
    if ((!content.figures || content.figures.length === 0) && report.uploadedFiles) {
      const figureFiles = report.uploadedFiles.filter(f =>
        f.fileType === 'FIGURE' ||
        /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(f.filename)
      )

      if (figureFiles.length > 0) {
        content.figures = figureFiles.map((file, index) => ({
          id: `figure-${index + 1}`,
          number: index + 1,
          filename: file.filename,
          blobUrl: file.blobUrl,
          fileId: file.id,
          caption: `Mean Plasma Concentration-Time Profile`,
          sectionId: 'plasma-pk'
        }))
      }
    }

    // Update report with generated content
    const updatedReport = await prisma.report.update({
      where: { id },
      data: {
        content: content,
        status: 'REVIEW',
        ...(context && { extractedContext: context })
      },
      include: {
        uploadedFiles: true,
        chatMessages: true
      }
    })

    return NextResponse.json(updatedReport)
  } catch (error) {
    console.error('Failed to generate report:', error)

    // Update status back to draft on error
    try {
      await prisma.report.update({
        where: { id },
        data: { status: 'DRAFT' }
      })
    } catch (updateError) {
      console.error('Failed to reset status:', updateError)
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to generate report'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
