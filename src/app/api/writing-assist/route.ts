import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const anthropic = new Anthropic()

type AssistAction = 'polish' | 'elaborate' | 'shorten' | 'simplify' | 'formal' | 'technical'

const actionPrompts: Record<AssistAction, string> = {
  polish: `Polish and improve this text for a regulatory document. Fix any grammar, improve clarity, and enhance readability while maintaining the scientific accuracy and formal tone. Keep the same length approximately.`,

  elaborate: `Expand on this text with more detail and explanation. Add relevant context, examples, or supporting information that would be appropriate for an IND regulatory submission. Increase the length by about 50%.`,

  shorten: `Condense this text while preserving all key information. Remove redundancy and unnecessary words. Make it more concise without losing scientific accuracy or important details. Reduce length by about 30-40%.`,

  simplify: `Simplify this text to make it clearer and easier to understand while maintaining scientific accuracy. Use simpler sentence structures and clearer explanations. Keep appropriate for a regulatory document.`,

  formal: `Make this text more formal and professional for regulatory submission. Ensure it follows standard regulatory writing conventions, uses appropriate terminology, and maintains an objective scientific tone.`,

  technical: `Enhance the technical precision of this text. Add specific technical terminology, ensure accuracy of scientific statements, and include appropriate quantitative details where applicable.`
}

const actionLabels: Record<AssistAction, string> = {
  polish: 'Polished',
  elaborate: 'Elaborated',
  shorten: 'Shortened',
  simplify: 'Simplified',
  formal: 'Formalized',
  technical: 'Technical enhancement'
}

export async function POST(request: NextRequest) {
  try {
    const { text, action, sectionTitle } = await request.json()

    if (!text || !action) {
      return NextResponse.json(
        { error: 'Text and action are required' },
        { status: 400 }
      )
    }

    if (!actionPrompts[action as AssistAction]) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    const systemPrompt = `You are an expert regulatory writer specializing in IND (Investigational New Drug) submissions for the FDA. You help improve text for regulatory documents including PK reports, toxicology reports, CMC sections, and clinical pharmacology documents.

Your writing should:
- Follow FDA regulatory guidelines and expectations
- Use precise scientific and medical terminology appropriately
- Maintain objectivity and formal tone
- Be clear, accurate, and well-organized
- Follow IMRAD format conventions where applicable

IMPORTANT: Return ONLY the improved text. Do not include any explanations, introductions, or meta-commentary. Do not wrap the response in quotes or add any prefixes.`

    const userPrompt = `${actionPrompts[action as AssistAction]}

${sectionTitle ? `Section: ${sectionTitle}\n\n` : ''}Text to improve:
${text}

Improved text:`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      system: systemPrompt
    })

    const textContent = response.content.find(c => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No response from AI')
    }

    return NextResponse.json({
      result: textContent.text.trim(),
      action: action,
      label: actionLabels[action as AssistAction]
    })
  } catch (error) {
    console.error('Writing assist error:', error)
    return NextResponse.json(
      { error: 'Failed to process text' },
      { status: 500 }
    )
  }
}
