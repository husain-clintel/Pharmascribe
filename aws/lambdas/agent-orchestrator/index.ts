import type { Handler } from 'aws-lambda'
import Anthropic from '@anthropic-ai/sdk'
import { executePharmaTool, PHARMA_TOOLS } from './tools'
import type {
  OrchestratorInput,
  OrchestratorOutput,
  ConversationMessage
} from '../shared/types'

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

// Model to use - prefer Sonnet for extended thinking support
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929'

// System prompt - designed to be thorough like Claude Code
const SYSTEM_PROMPT = `You are ARIA (AI Regulatory IND Assistant), an elite pharmaceutical/toxicology report writing agent. You operate with the same thoroughness and attention to detail as a senior regulatory affairs scientist combined with a meticulous software engineer.

## Core Principles

### 1. THINK DEEPLY BEFORE ACTING
Before responding to ANY request:
- Analyze the FULL context of the report, not just the immediate question
- Consider how this request relates to ALL sections of the report
- Identify potential inconsistencies or issues that weren't explicitly mentioned
- Think about data stratifications: dose groups, time points, sex differences, statistical summaries

### 2. ASK CLARIFYING QUESTIONS WHEN NEEDED
When you encounter ambiguity or need user input:
- Use the **ask_user_question** tool to get clarification
- Provide multiple choice options when possible (2-4 options)
- Always include an "Other" option for custom input
- Ask about preferences, formatting choices, or data interpretation
- Examples of when to ask:
  - Statistical notation preference (Mean ± SD vs Mean (%CV))
  - How to handle missing data points
  - Preferred terminology for specific concepts
  - Which sections to prioritize
  - How to resolve conflicting information

### 3. PROVIDE STEP SUMMARIES
After completing each significant action, provide a brief summary:
- What you analyzed
- What you found
- What you changed or decided
- What you're doing next

Format step summaries as:
**Step N Complete:** [Brief description of what was done]
- Found: [key findings]
- Action: [what was changed/decided]
- Next: [what comes next]

### 4. BE PROACTIVELY THOROUGH
When asked to fix or change something:
- Fix the specific issue requested
- THEN systematically check ALL related sections for the same issue
- Check for consistency across tables, figures, and narrative text
- Verify that changes don't create new inconsistencies elsewhere
- Report ALL issues found, not just the one asked about

### 5. UNDERSTAND DATA HIERARCHIES
PK/TK reports have complex data structures:
- **Dose levels**: 1st dose, 3rd dose, last dose, etc.
- **Time stratifications**: Day 1, Day 7, Day 28, etc.
- **Group summaries**: By sex, by dose group, combined
- **Statistical presentations**: Individual values, Mean, SD, %CV
- **Recovery groups**: Main study vs recovery animals

ALWAYS verify that data is correctly stratified and summarized across ALL relevant dimensions.

### 6. VALIDATE BEFORE FINALIZING
Before returning any changes:
- Run QC checks on ALL affected content
- Verify cross-references between sections
- Check table-to-text consistency
- Ensure terminology is consistent throughout

## Your Expertise

### Regulatory Knowledge
- FDA IND submission requirements
- CTD format (Module 2.6 Nonclinical Summaries, Module 4 Study Reports)
- ICH guidelines for nonclinical studies
- GLP compliance terminology

### Scientific Writing
- PK parameter reporting conventions
- Statistical notation standards
- Dose-response relationship descriptions
- Species-specific considerations

### Common Issues to Watch For
- Inconsistent dose numbering (1st vs first vs Day 1)
- Mixed statistical notations (Mean ± SD vs Mean (%CV))
- Incorrect species capitalization
- Missing or inconsistent time point references
- Table captions not matching content
- Cross-reference errors
- Unit inconsistencies

## Available Tools

Use these tools EXTENSIVELY - more tool use is better than less:

1. **ask_user_question**: Ask clarifying questions when you need user input. Provide options for easy selection.

2. **recall_memory**: ALWAYS start by recalling context. Understand previous decisions, user preferences, and study facts before doing anything.

3. **store_memory**: Save EVERY significant decision, preference, or fact discovered. Build comprehensive context over time.

4. **run_qc_check**: Run on ALL content you generate or modify. Run on RELATED sections too. Multiple QC passes are good.

5. **get_section_template**: Use when writing new sections. Understand expected structure before writing.

6. **calculate_pk_stats**: Verify statistical calculations. Double-check existing values when they seem off.

7. **analyze_report_structure**: Use to understand the full report layout and identify related sections.

8. **cross_check_sections**: Use after making changes to verify consistency across the entire report.

9. **validate_data_stratification**: Validate data is correctly stratified across all dimensions.

## Response Protocol

### When Asking Questions
Use the ask_user_question tool with clear options:
\`\`\`
{
  "question": "How would you like statistical values presented in the tables?",
  "options": [
    {"id": "mean_cv", "label": "Mean (%CV)", "description": "Shows variability as coefficient of variation"},
    {"id": "mean_sd", "label": "Mean ± SD", "description": "Shows variability as standard deviation"},
    {"id": "both", "label": "Both formats", "description": "Mean ± SD in text, Mean (%CV) in tables"}
  ],
  "allowCustom": true,
  "context": "This affects how PK parameters are displayed throughout the report"
}
\`\`\`

### When Making Changes
Include step summaries and format changes as:
\`\`\`json
{
  "stepSummary": {
    "stepsCompleted": [
      {"step": 1, "action": "Analyzed report structure", "findings": ["3 sections", "1 table", "missing Day 14 data"]},
      {"step": 2, "action": "Checked terminology consistency", "findings": ["Found 'Rat' should be 'rat'"]},
      {"step": 3, "action": "Cross-checked sections", "findings": ["Executive summary matches results"]}
    ],
    "totalSteps": 3,
    "issuesFound": 2,
    "issuesResolved": 2
  },
  "changes": {
    "sections": [
      { "id": "section-id", "content": "new content", "rationale": "why changed" }
    ],
    "tables": [
      { "id": "table-id", "caption": "...", "headers": [...], "data": [[...]], "rationale": "why changed" }
    ]
  },
  "verification": {
    "qcScore": 95,
    "crossChecksPerformed": ["section-to-table", "terminology", "statistics"],
    "issuesResolved": ["list of issues fixed"],
    "remainingIssues": ["any issues that need user decision"]
  },
  "relatedFindings": [
    { "section": "...", "issue": "...", "recommendation": "..." }
  ]
}
\`\`\`

## Critical Reminders

- You are NOT just answering questions - you are an autonomous agent that ACTS
- ASK QUESTIONS when uncertain rather than making assumptions
- SUMMARIZE your progress after each significant step
- Taking more time to be thorough is ALWAYS better than being quick but incomplete
- When in doubt, check more sections, run more QC, use more tools
- The user expects you to find issues THEY DIDN'T NOTICE
- Every change should trigger a review of related content
- Build up comprehensive memory of the report over time

Remember: A senior regulatory scientist would never just fix one cell in a table - they would verify the entire table, check related tables, and ensure narrative consistency. They would also ask clarifying questions when needed. BE THAT SCIENTIST.`

// Maximum turns - increased for thoroughness
const MAX_TURNS = 20

// Enable extended thinking for deeper reasoning
const USE_EXTENDED_THINKING = true
const THINKING_BUDGET = 10000 // tokens for thinking

/**
 * Main Agent Orchestrator Lambda Handler
 * Uses Anthropic SDK with extended thinking and tool use in an agentic loop
 */
export const handler: Handler<OrchestratorInput, OrchestratorOutput> = async (event) => {
  console.log('Agent Orchestrator invoked:', JSON.stringify(event, null, 2))

  try {
    const { action, reportId, message, section, context, qcFindings, conversationHistory, questionResponse } = event

    if (!reportId) {
      return { success: false, error: 'Missing reportId' }
    }

    // Build the initial prompt with full context
    const userPrompt = buildPrompt(action, message, section, context, qcFindings, conversationHistory, reportId, questionResponse)

    // Run the agentic loop with extended thinking
    const result = await runAgentLoop(userPrompt, reportId, context)

    return result

  } catch (error: any) {
    console.error('Orchestrator error:', error)
    return {
      success: false,
      error: error.message || 'Internal orchestrator error'
    }
  }
}

/**
 * Run the agentic loop with extended thinking for thorough analysis
 */
async function runAgentLoop(
  initialPrompt: string,
  reportId: string,
  context: any
): Promise<OrchestratorOutput> {
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: initialPrompt }
  ]

  let turns = 0
  let allToolsUsed: string[] = []
  let thinkingContent: string[] = []
  let stepSummaries: any[] = []
  let pendingQuestion: any = null

  while (turns < MAX_TURNS) {
    turns++
    console.log(`Agent turn ${turns}`)

    // Build request with optional extended thinking
    const requestParams: any = {
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      tools: PHARMA_TOOLS,
      messages
    }

    // Add extended thinking if enabled and supported
    if (USE_EXTENDED_THINKING) {
      requestParams.thinking = {
        type: 'enabled',
        budget_tokens: THINKING_BUDGET
      }
    }

    // Call Claude
    const response = await anthropic.messages.create(requestParams)

    console.log(`Response stop_reason: ${response.stop_reason}`)

    // Extract thinking content if present
    for (const block of response.content) {
      if (block.type === 'thinking') {
        thinkingContent.push(block.thinking)
        console.log('Agent thinking:', block.thinking.substring(0, 500) + '...')
      }
    }

    // Check if we're done (no more tool use)
    if (response.stop_reason === 'end_turn') {
      // Extract the final text response
      const textContent = response.content.find(c => c.type === 'text')
      const finalText = textContent?.type === 'text' ? textContent.text : ''

      // Parse changes and step summary if present
      const parsed = extractResponseData(finalText)

      // Log summary of work done
      console.log(`Agent completed in ${turns} turns. Tools used: ${allToolsUsed.join(', ')}`)

      return {
        success: true,
        response: cleanResponse(finalText),
        changes: parsed.changes || undefined,
        question: pendingQuestion || undefined,
        stepSummary: parsed.stepSummary || (stepSummaries.length > 0 ? { stepsCompleted: stepSummaries } : undefined),
        metadata: {
          turns,
          toolsUsed: allToolsUsed,
          hadExtendedThinking: thinkingContent.length > 0
        }
      }
    }

    // Handle tool use
    if (response.stop_reason === 'tool_use') {
      // Add assistant's response (with tool calls) to messages
      messages.push({ role: 'assistant', content: response.content })

      // Execute each tool call
      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const content of response.content) {
        if (content.type === 'tool_use') {
          console.log(`Executing tool: ${content.name}`, JSON.stringify(content.input).substring(0, 200))
          allToolsUsed.push(content.name)

          // Special handling for ask_user_question
          if (content.name === 'ask_user_question') {
            pendingQuestion = content.input
            console.log('Agent asking question:', JSON.stringify(pendingQuestion))

            // Return immediately with the question
            return {
              success: true,
              response: `I have a question before proceeding:\n\n**${pendingQuestion.question}**`,
              question: pendingQuestion,
              requiresInput: true,
              stepSummary: stepSummaries.length > 0 ? { stepsCompleted: stepSummaries } : undefined,
              metadata: {
                turns,
                toolsUsed: allToolsUsed,
                hadExtendedThinking: thinkingContent.length > 0,
                pausedForQuestion: true
              }
            }
          }

          try {
            const result = await executePharmaTool(
              content.name,
              content.input as Record<string, any>,
              reportId,
              context
            )

            // Track step summaries from tool results
            if (result.stepSummary) {
              stepSummaries.push(result.stepSummary)
            }

            toolResults.push({
              type: 'tool_result',
              tool_use_id: content.id,
              content: JSON.stringify(result)
            })
          } catch (error: any) {
            console.error(`Tool error (${content.name}):`, error.message)
            toolResults.push({
              type: 'tool_result',
              tool_use_id: content.id,
              content: JSON.stringify({ error: error.message }),
              is_error: true
            })
          }
        }
      }

      // Add tool results to messages
      messages.push({ role: 'user', content: toolResults })
    } else {
      // Unexpected stop reason
      console.warn(`Unexpected stop_reason: ${response.stop_reason}`)
      break
    }
  }

  // Max turns reached
  console.log(`Agent reached ${MAX_TURNS} turns - performing final extraction`)

  return {
    success: false,
    error: `Agent reached maximum turns (${MAX_TURNS}) - task may be too complex. Consider breaking it into smaller requests.`,
    stepSummary: stepSummaries.length > 0 ? { stepsCompleted: stepSummaries } : undefined,
    metadata: {
      turns: MAX_TURNS,
      toolsUsed: allToolsUsed,
      hadExtendedThinking: thinkingContent.length > 0
    }
  }
}

/**
 * Build a comprehensive prompt with full context
 */
function buildPrompt(
  action: string,
  message: string | undefined,
  section: string | undefined,
  context: any,
  qcFindings: any[] | undefined,
  conversationHistory: ConversationMessage[] | undefined,
  reportId: string,
  questionResponse?: { questionId: string; answer: string | string[] }
): string {
  const parts: string[] = []

  // Emphasize thoroughness at the start
  parts.push('# IMPORTANT: Be thorough. Ask questions when unclear. Summarize your progress.\n')

  // If this is a response to a question, include it prominently
  if (questionResponse) {
    parts.push('## User Response to Your Question')
    parts.push(`The user answered: **${Array.isArray(questionResponse.answer) ? questionResponse.answer.join(', ') : questionResponse.answer}**`)
    parts.push('Please continue with your analysis using this information.\n')
  }

  // Add report context
  parts.push(`## Report Context (ID: ${reportId})`)
  if (context) {
    if (context.title) parts.push(`- **Title**: ${context.title}`)
    if (context.studyType) parts.push(`- **Study Type**: ${context.studyType}`)
    if (context.species) parts.push(`- **Species**: ${context.species}`)
    if (context.route) parts.push(`- **Route**: ${context.route}`)
    if (context.doses) parts.push(`- **Dose Levels**: ${JSON.stringify(context.doses)}`)
    if (context.timePoints) parts.push(`- **Time Points**: ${JSON.stringify(context.timePoints)}`)
    if (context.groups) parts.push(`- **Study Groups**: ${JSON.stringify(context.groups)}`)
  }

  // Add full sections context - NOT truncated
  if (context?.sections && context.sections.length > 0) {
    parts.push('\n## Current Report Sections (FULL CONTENT)')
    parts.push('Review ALL sections for consistency when making any change.\n')
    for (const sec of context.sections) {
      parts.push(`### Section: ${sec.title || sec.id}`)
      parts.push(`ID: ${sec.id}`)
      parts.push(`Content:\n${sec.content || 'No content yet'}`)
      parts.push('---')
    }
  }

  // Add full tables context
  if (context?.tables && context.tables.length > 0) {
    parts.push('\n## Current Tables (VERIFY CONSISTENCY)')
    for (const table of context.tables) {
      parts.push(`### Table: ${table.caption || table.id}`)
      parts.push(`ID: ${table.id}`)
      parts.push(`Headers: ${JSON.stringify(table.headers)}`)
      parts.push(`Data rows: ${table.data?.length || 0}`)
      if (table.data) {
        parts.push('Data preview:')
        parts.push('```')
        parts.push(JSON.stringify(table.data.slice(0, 5), null, 2))
        if (table.data.length > 5) parts.push(`... and ${table.data.length - 5} more rows`)
        parts.push('```')
      }
      parts.push('---')
    }
  }

  // Add QC findings - these MUST be addressed
  if (qcFindings && qcFindings.length > 0) {
    parts.push('\n## QC Findings (MUST ADDRESS ALL)')
    for (const finding of qcFindings) {
      parts.push(`- [${finding.type.toUpperCase()}] ${finding.category}: ${finding.message}`)
      if (finding.location) parts.push(`  Location: ${finding.location}`)
      if (finding.suggestion) parts.push(`  Suggestion: ${finding.suggestion}`)
    }
  }

  // Add conversation history - important for context
  if (conversationHistory && conversationHistory.length > 0) {
    parts.push('\n## Conversation History (Understand previous context)')
    for (const msg of conversationHistory.slice(-10)) {
      const role = msg.role === 'user' ? 'User' : 'Assistant'
      parts.push(`**${role}** (${msg.timestamp || 'recent'}):`)
      parts.push(msg.content)
      parts.push('')
    }
  }

  // Add action-specific instructions
  parts.push('\n## Your Task')
  switch (action) {
    case 'chat':
      parts.push(`
**User's Request:** ${message}

**Your Approach:**
1. FIRST: Use recall_memory to understand full context and previous decisions
2. CLARIFY: If anything is unclear, use ask_user_question to get clarification
3. ANALYZE: Consider how this request affects ALL sections, not just the one mentioned
4. ACT: Make the requested changes (provide step summaries)
5. VERIFY: Run QC checks on changed content AND related sections
6. EXPAND: Check for similar issues in other sections and report them
7. STORE: Save any decisions or preferences for future reference
8. SUMMARIZE: Provide a final summary of all steps completed

Remember: Ask questions rather than making assumptions. Summarize your progress.`)
      break

    case 'generate':
      parts.push(`
**Section to Generate:** ${section || 'All standard PK/TK report sections'}

**Your Approach:**
1. Use get_section_template for proper structure
2. Ask clarifying questions about preferences (notation, format)
3. Use recall_memory for study context and preferences
4. Generate content following regulatory standards (summarize progress)
5. Run run_qc_check on ALL generated content
6. Verify consistency with existing sections
7. Provide final summary of what was generated`)
      break

    case 'regenerate':
      parts.push(`
**Section to Regenerate:** ${section}

**Your Approach:**
1. Recall memory to understand why regeneration is needed
2. Ask if user has specific changes in mind
3. Review the current section and related sections
4. Regenerate with improvements (summarize each major change)
5. Run comprehensive QC
6. Verify no new inconsistencies were introduced
7. Summarize all changes made`)
      break

    default:
      parts.push(`Unknown action: ${action}. Please respond with an error.`)
  }

  // Final reminder
  parts.push('\n---')
  parts.push('**FINAL REMINDER**: Ask questions when unclear. Summarize your progress after each step. Be thorough.')

  return parts.join('\n')
}

/**
 * Extract response data including changes and step summaries
 */
function extractResponseData(text: string): { changes?: any; stepSummary?: any } {
  const jsonPatterns = [
    /```json\n([\s\S]*?)\n```/,
    /```\n?(\{[\s\S]*?\})\n?```/,
    /\{[\s\S]*"changes"[\s\S]*\}/,
    /\{[\s\S]*"stepSummary"[\s\S]*\}/
  ]

  for (const pattern of jsonPatterns) {
    const match = text.match(pattern)
    if (match) {
      try {
        const jsonStr = match[1] || match[0]
        const parsed = JSON.parse(jsonStr)
        return {
          changes: parsed.changes || null,
          stepSummary: parsed.stepSummary || null
        }
      } catch {
        continue
      }
    }
  }

  return {}
}

/**
 * Clean the response by removing JSON blocks for display
 */
function cleanResponse(text: string): string {
  return text.replace(/```json[\s\S]*?```/g, '').trim()
}
