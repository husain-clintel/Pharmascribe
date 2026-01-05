import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// Increase timeout for AI processing
export const maxDuration = 60

const anthropic = new Anthropic()

export async function POST(request: NextRequest) {
  try {
    const { protocolContent, filename } = await request.json()

    if (!protocolContent) {
      return NextResponse.json(
        { error: 'No protocol content provided' },
        { status: 400 }
      )
    }

    const prompt = `You are analyzing a study protocol document to extract metadata for an IND regulatory report.

PROTOCOL CONTENT:
${protocolContent.slice(0, 50000)}

Extract the following information from this protocol. If a field is not found, leave it as an empty string.
Return ONLY a valid JSON object with these exact keys:

{
  "studyId": "The study identifier/number (e.g., 3103-03, AT25-AS200)",
  "reportTitle": "A descriptive title for the PK/Pharmacology report based on the study",
  "reportNumber": "Any report number if mentioned",
  "testFacility": "The test facility or CRO name",
  "testFacilityStudyNum": "Test facility's internal study number if different from studyId",
  "sponsor": "The sponsor company name",
  "species": "The animal species (e.g., cynomolgus, rat, mouse, dog)",
  "strain": "The animal strain if mentioned",
  "routeOfAdmin": "Route of administration (IV, SC, IM, PO, etc.)",
  "doseLevel": "Dose level(s) as a string (e.g., '0.15, 0.75 mg/kg')",
  "doseLevels": ["Array of individual dose levels as numbers"],
  "analytes": "Analyte(s) being measured (e.g., mRNA, drug substance name)",
  "matrices": "Biological matrix/matrices (e.g., plasma, serum, liver)",
  "studyDirector": "Study director name if mentioned",
  "studyObjectives": "Brief summary of study objectives",
  "numberOfAnimals": "Total number of animals or animals per group",
  "groupDesign": "Brief description of group design",
  "samplingTimepoints": "Sampling timepoints if mentioned",
  "testArticle": "Name/description of the test article",
  "formulation": "Formulation details if mentioned"
}

Important:
- For species, use lowercase values: "cynomolgus", "rhesus", "rat", "mouse", "dog", "rabbit", "human"
- For routeOfAdmin, use abbreviations: "IV", "SC", "IM", "PO", "IP", "Topical"
- Extract as much information as possible from the protocol
- The reportTitle should be descriptive and suitable for an IND submission

Return ONLY the JSON object, no other text.`

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5-20250114',
      max_tokens: 2000,
      messages: [
        { role: 'user', content: prompt }
      ]
    })

    // Extract the text response
    const textContent = response.content.find(c => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from AI')
    }

    // Parse the JSON from the response
    let metadata: any
    try {
      // Try to extract JSON from the response
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        metadata = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', textContent.text)
      throw new Error('Failed to parse metadata from protocol')
    }

    return NextResponse.json({
      success: true,
      metadata,
      source: filename
    })
  } catch (error) {
    console.error('Failed to extract metadata:', error)
    return NextResponse.json(
      { error: 'Failed to extract metadata: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}
