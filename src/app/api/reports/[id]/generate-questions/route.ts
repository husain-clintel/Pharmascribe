import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import prisma from '@/lib/db/prisma'
import { optionalReportOwnership } from '@/lib/auth/api-auth'

// Timeout for AI processing
export const maxDuration = 60

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
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

    // Get API key
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Claude API key not configured' },
        { status: 400 }
      )
    }

    // Build context from uploaded files
    let filesContext = ''
    let hasProtocol = false
    let hasNCAData = false
    let hasConcentrationData = false
    let hasFigures = false

    if (report.uploadedFiles && report.uploadedFiles.length > 0) {
      for (const file of report.uploadedFiles) {
        if (file.fileType === 'PROTOCOL') hasProtocol = true
        if (file.fileType === 'NCA_PARAMETERS') hasNCAData = true
        if (file.fileType === 'CONCENTRATION_DATA') hasConcentrationData = true
        if (file.fileType === 'FIGURE') hasFigures = true

        filesContext += `
--- File: ${file.filename} (Type: ${file.fileType}) ---
${file.extractedData ? JSON.stringify(file.extractedData, null, 2).slice(0, 4000) : 'No extracted data'}
`
      }
    }

    // Generate questions using Claude
    const anthropic = new Anthropic({ apiKey })

    const prompt = `You are an expert regulatory writer helping prepare an IND ${report.reportType === 'PHARMACOLOGY' ? 'Pharmacology' : 'PK'} report.

STUDY METADATA:
- Study ID: ${report.studyId}
- Report Title: ${report.reportTitle}
- Report Type: ${report.reportType}
- Species: ${report.species || 'Not specified'}
- Route of Administration: ${report.routeOfAdmin || 'Not specified'}
- Dose Level(s): ${report.doseLevel || 'Not specified'}
- Analyte(s): ${report.analytes || 'Not specified'}
- Matrix/Matrices: ${report.matrices || 'Not specified'}

UPLOADED FILES AND DATA:
${filesContext || 'No files uploaded'}

FILE AVAILABILITY:
- Protocol uploaded: ${hasProtocol ? 'Yes' : 'No'}
- NCA Parameters uploaded: ${hasNCAData ? 'Yes' : 'No'}
- Concentration Data uploaded: ${hasConcentrationData ? 'Yes' : 'No'}
- Figures uploaded: ${hasFigures ? 'Yes' : 'No'}

Based on the study data and protocol above, generate 4-6 SPECIFIC questions to ask the user that will help generate a better, more tailored report.

The questions should be:
1. SPECIFIC to THIS study's data - reference actual values, groups, timepoints, or findings from the uploaded data
2. About DECISIONS that need to be made for the report (not just confirmations)
3. Helpful for understanding what to emphasize, how to interpret findings, or what context to include

Good question examples:
- "The data shows high variability (CV >50%) for AUC in the 1 mg/kg group. How should this be addressed in the discussion?"
- "Subject 8501 has an outlier Cmax value (3x higher than group mean). Should this animal be excluded from summary statistics?"
- "The protocol mentions both plasma and liver sampling, but only plasma data was uploaded. Should liver distribution be discussed as a limitation?"
- "Dose proportionality appears to break down above 5 mg/kg. What is the proposed therapeutic dose range for context?"

Bad question examples (too generic):
- "What is the target audience?" (too generic, not data-specific)
- "What regulatory guidelines should be followed?" (not specific to this data)

Return a JSON array of questions with this structure:
[
  {
    "id": "unique-id",
    "question": "The specific question text",
    "context": "Brief explanation of why this question matters based on the data",
    "type": "select" | "multiselect" | "text",
    "options": ["Option 1", "Option 2"] // only for select/multiselect types
  }
]

Generate questions that are SPECIFIC to the uploaded data. If no data was uploaded, ask about what data is available and key study details.

Return ONLY the JSON array, no other text.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    })

    const textContent = response.content.find(c => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No response from AI')
    }

    // Parse the JSON response
    let questions
    try {
      const jsonMatch = textContent.text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON array found in response')
      }
    } catch (parseError) {
      console.error('Failed to parse questions:', textContent.text)
      // Return default questions if parsing fails
      questions = [
        {
          id: 'key-findings',
          question: 'What are the key findings that should be emphasized in the report?',
          context: 'This helps prioritize the most important results in the executive summary and conclusions.',
          type: 'text'
        },
        {
          id: 'limitations',
          question: 'Are there any study limitations or data quality issues that should be acknowledged?',
          context: 'Transparency about limitations is important for regulatory submissions.',
          type: 'text'
        },
        {
          id: 'detail-level',
          question: 'What level of detail is needed for this report?',
          context: 'This affects the depth of methodology description and data presentation.',
          type: 'select',
          options: ['Comprehensive - Full detail for IND submission', 'Standard - Balanced detail', 'Summary - Key findings only']
        }
      ]
    }

    return NextResponse.json({
      success: true,
      questions,
      studyContext: {
        hasProtocol,
        hasNCAData,
        hasConcentrationData,
        hasFigures,
        fileCount: report.uploadedFiles?.length || 0
      }
    })
  } catch (error) {
    console.error('Failed to generate questions:', error)
    return NextResponse.json(
      { error: 'Failed to generate questions: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}
