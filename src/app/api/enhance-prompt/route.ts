import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 30

const anthropic = new Anthropic()

export async function POST(request: NextRequest) {
  try {
    const { prompt, context } = await request.json()

    if (!prompt) {
      return NextResponse.json(
        { error: 'No prompt provided' },
        { status: 400 }
      )
    }

    const metaPrompt = `You are a prompt enhancement assistant for a regulatory report writing system. Your job is to take a user's simple request and enhance it to be more specific, detailed, and effective for the AI report editor.

CONTEXT: The user is working on an IND regulatory report (PK, Pharmacology, Toxicology, etc.). They have uploaded study data and protocols.

USER'S ORIGINAL REQUEST:
"${prompt}"

${context ? `ADDITIONAL CONTEXT:\n${context}\n` : ''}

TASK: Enhance the user's prompt to be more specific and actionable. Consider:
1. What specific sections of the report might be affected
2. What regulatory guidelines or formatting requirements apply
3. What data sources should be referenced
4. What level of detail is appropriate

Return ONLY the enhanced prompt as a single paragraph or short set of instructions. Do not include any explanation or meta-commentary. The enhanced prompt should be ready to send directly to the AI report editor.

Enhanced prompt:`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        { role: 'user', content: metaPrompt }
      ]
    })

    const textContent = response.content.find(c => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No response from AI')
    }

    return NextResponse.json({
      enhanced: textContent.text.trim(),
      original: prompt
    })
  } catch (error) {
    console.error('Failed to enhance prompt:', error)
    return NextResponse.json(
      { error: 'Failed to enhance prompt' },
      { status: 500 }
    )
  }
}
