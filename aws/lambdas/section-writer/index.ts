import type { Handler } from 'aws-lambda'
import { invokeClaudeAsync, CLAUDE_SONNET } from '../shared/bedrock-client'
import { parseMemoryContent } from '../shared/dynamodb-client'
import type { SectionWriterInput, SectionWriterOutput } from '../shared/types'

// Section-specific prompts
const SECTION_PROMPTS: Record<string, string> = {
  'executive-summary': `Write an executive summary for this pharmacokinetic/toxicokinetic study report.

The executive summary should:
- Be 2-3 paragraphs
- Summarize the study design (species, doses, route, duration)
- Highlight key PK parameters (Cmax, AUC, T1/2)
- Note any dose-proportionality findings
- Mention sex differences if observed
- Use professional regulatory writing style`,

  'study-design': `Write the Study Design section.

Include:
- Test article identification
- Species and strain
- Number of animals per group/sex
- Dose levels and route of administration
- Dosing frequency and duration
- Blood sampling time points
- Bioanalytical method summary`,

  'pk-parameters': `Write the Pharmacokinetic Parameters section.

Include:
- Complete list of PK parameters calculated (Cmax, Tmax, AUC0-t, AUC0-inf, T1/2, CL, Vd)
- Statistical methods used
- Software used for calculations
- Any non-compartmental analysis details`,

  'results': `Write the Results section.

Structure:
1. Plasma concentration-time profiles
2. Key PK parameters by dose group
3. Dose proportionality assessment
4. Sex comparison (if applicable)
5. Day 1 vs steady-state comparison (if repeat-dose)

Use proper scientific notation and units.`,

  'discussion': `Write the Discussion section.

Address:
- Interpretation of PK parameters
- Dose proportionality conclusions
- Comparison to previous studies (if mentioned)
- Relevance to safety assessment
- Any limitations`,

  'conclusions': `Write the Conclusions section.

Brief, bulleted conclusions covering:
- Key PK characteristics
- Dose proportionality
- Sex differences (if any)
- Implications for toxicity assessment`
}

const SYSTEM_PROMPT = `You are an expert pharmaceutical regulatory writer specializing in IND (Investigational New Drug) applications. You write pharmacokinetic and toxicokinetic report sections following FDA CTD format guidelines.

Writing style requirements:
- Professional, scientific tone
- Third person, passive voice preferred
- Precise terminology
- Proper units and statistical notation
- Clear, concise sentences

Terminology rules:
- For IV route: use "distributed" not "infused"
- Use Mean (%CV) or Mean ± SD for statistics
- Use proper abbreviations: PK, TK, Cmax, Tmax, AUC, T1/2, etc.

Return ONLY the section content without any preamble or explanation.`

/**
 * Section Writer Lambda Handler
 */
export const handler: Handler<SectionWriterInput, SectionWriterOutput> = async (event) => {
  console.log('Section Writer invoked:', JSON.stringify(event, null, 2))

  try {
    const { reportId, sectionId, sectionType, context, memories, instructions } = event

    if (!reportId || !sectionType) {
      return { success: false, error: 'Missing required parameters' }
    }

    // Get section-specific prompt
    const basePrompt = SECTION_PROMPTS[sectionType] || SECTION_PROMPTS['results']

    // Build context
    const contextParts: string[] = []

    // Study information
    if (context) {
      contextParts.push('## Study Information')
      if (context.title) contextParts.push(`Report Title: ${context.title}`)
      if (context.studyType) contextParts.push(`Study Type: ${context.studyType}`)
      if (context.species) contextParts.push(`Species: ${context.species}`)
      if (context.route) contextParts.push(`Route: ${context.route}`)
      if (context.duration) contextParts.push(`Duration: ${context.duration}`)
    }

    // Memory context (previous decisions and preferences)
    if (memories && memories.length > 0) {
      contextParts.push('\n## Previous Decisions & Preferences')
      for (const mem of memories) {
        const content = parseMemoryContent<any>(mem)
        if (mem.memoryType === 'DECISION') {
          contextParts.push(`- ${content.decision || JSON.stringify(content)}`)
        } else if (mem.memoryType === 'PREFERENCE') {
          contextParts.push(`- Preference: ${content.preference || JSON.stringify(content)}`)
        }
      }
    }

    // Source data from uploaded files
    if (context?.uploadedFiles?.length > 0) {
      contextParts.push('\n## Source Data')
      for (const file of context.uploadedFiles) {
        if (file.extractedText) {
          contextParts.push(`\n### From ${file.filename}:`)
          contextParts.push(file.extractedText.substring(0, 4000))
        }
        if (file.metadata) {
          contextParts.push(`Metadata: ${JSON.stringify(file.metadata)}`)
        }
      }
    }

    // Build the full prompt
    const fullPrompt = `${contextParts.join('\n')}

## Task
${basePrompt}

${instructions ? `\n## Additional Instructions:\n${instructions}` : ''}

Write the section content now:`

    // Invoke Claude
    const content = await invokeClaudeAsync(
      [{ role: 'user', content: fullPrompt }],
      {
        modelId: CLAUDE_SONNET,
        system: SYSTEM_PROMPT,
        maxTokens: 4096,
        temperature: 0.5 // Lower temperature for more consistent output
      }
    )

    return {
      success: true,
      content: content.trim()
    }
  } catch (error: any) {
    console.error('Section Writer error:', error)
    return {
      success: false,
      error: error.message || 'Failed to write section'
    }
  }
}
