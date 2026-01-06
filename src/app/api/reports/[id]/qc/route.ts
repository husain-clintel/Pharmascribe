import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import prisma from '@/lib/db/prisma'
import { generateQCPrompt } from '@/lib/ai/prompts/pk-report'
import { requireReportOwnership } from '@/lib/auth/api-auth'

// Increase timeout for AI QC
export const maxDuration = 60

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // Check ownership
    const { error: authError } = await requireReportOwnership(request, id)
    if (authError) return authError

    const qcResults = await prisma.qCResult.findMany({
      where: { reportId: id },
      orderBy: [
        { severity: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json(qcResults)
  } catch (error) {
    console.error('Failed to fetch QC results:', error)
    return NextResponse.json(
      { error: 'Failed to fetch QC results' },
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

    // Get report
    const report = await prisma.report.findUnique({
      where: { id }
    })

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    if (!report.content) {
      return NextResponse.json(
        { error: 'Report has no content to QC' },
        { status: 400 }
      )
    }

    // Get API key
    const apiKey = process.env.ANTHROPIC_API_KEY || (await prisma.apiSettings.findFirst({ where: { id: 'default' } }))?.geminiApiKey
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Claude API key not configured' },
        { status: 400 }
      )
    }

    // Update status
    await prisma.report.update({
      where: { id },
      data: { status: 'QC_PENDING' }
    })

    // Clear existing QC results
    await prisma.qCResult.deleteMany({
      where: { reportId: id }
    })

    // Generate QC analysis using Claude
    const anthropic = new Anthropic({ apiKey })
    const prompt = generateQCPrompt(report as any)

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5-20250114',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    })

    const textBlock = response.content.find(block => block.type === 'text')
    const text = textBlock ? textBlock.text : ''

    // Parse issues from response
    let issues: any[] = []
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        issues = JSON.parse(jsonMatch[0])
      }
    } catch (e) {
      console.error('Failed to parse QC response:', e)
    }

    // Save QC results
    if (issues.length > 0) {
      await prisma.qCResult.createMany({
        data: issues.map((issue: any) => ({
          category: issue.category || 'CONSISTENCY',
          severity: issue.severity || 'MINOR',
          section: issue.section || 'Unknown',
          issue: issue.issue || 'Issue found',
          suggestion: issue.suggestion,
          reportId: id
        }))
      })
    }

    // Update status
    await prisma.report.update({
      where: { id },
      data: { status: 'QC_COMPLETE' }
    })

    // Fetch and return results
    const qcResults = await prisma.qCResult.findMany({
      where: { reportId: id },
      orderBy: [
        { severity: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json({
      results: qcResults,
      summary: {
        total: qcResults.length,
        critical: qcResults.filter(r => r.severity === 'CRITICAL').length,
        major: qcResults.filter(r => r.severity === 'MAJOR').length,
        minor: qcResults.filter(r => r.severity === 'MINOR').length,
        info: qcResults.filter(r => r.severity === 'INFO').length
      }
    })
  } catch (error) {
    console.error('Failed to run QC:', error)

    // Reset status on error
    try {
      await prisma.report.update({
        where: { id },
        data: { status: 'REVIEW' }
      })
    } catch (updateError) {
      console.error('Failed to reset status:', updateError)
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to run QC'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // Check ownership
    const { error: authError } = await requireReportOwnership(request, id)
    if (authError) return authError

    const body = await request.json()
    const { issueId, status, resolution } = body

    const qcResult = await prisma.qCResult.update({
      where: { id: issueId },
      data: {
        status,
        resolution,
        resolvedAt: status === 'FIXED' || status === 'DISMISSED' ? new Date() : null
      }
    })

    return NextResponse.json(qcResult)
  } catch (error) {
    console.error('Failed to update QC result:', error)
    return NextResponse.json(
      { error: 'Failed to update QC result' },
      { status: 500 }
    )
  }
}
