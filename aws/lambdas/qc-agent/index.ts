import type { Handler } from 'aws-lambda'
import { invokeClaudeAsync, extractJSON, CLAUDE_HAIKU } from '../shared/bedrock-client'
import type { QCAgentInput, QCAgentOutput, QCIssue } from '../shared/types'

// QC Rules
const TERMINOLOGY_RULES = [
  { pattern: /\binfused\b/gi, issue: 'Use "distributed" instead of "infused" for IV administration', replacement: 'distributed' },
  { pattern: /\badministrated\b/gi, issue: 'Use "administered" instead of "administrated"', replacement: 'administered' },
  { pattern: /\bper oral\b/gi, issue: 'Use "oral" or "PO" instead of "per oral"', replacement: 'oral' },
  { pattern: /\bi\.v\.\b/gi, issue: 'Use "IV" instead of "i.v."', replacement: 'IV' },
  { pattern: /\bi\.m\.\b/gi, issue: 'Use "IM" instead of "i.m."', replacement: 'IM' },
  { pattern: /\bs\.c\.\b/gi, issue: 'Use "SC" instead of "s.c."', replacement: 'SC' },
]

const FORMATTING_RULES = [
  { pattern: /\d+\s*\+\/-\s*\d+/g, issue: 'Use "±" symbol instead of "+/-" for statistical notation' },
  { pattern: /\bng\/ml\b/gi, issue: 'Use "ng/mL" with capital L for liter' },
  { pattern: /\bug\/ml\b/gi, issue: 'Use "μg/mL" with μ symbol and capital L' },
  { pattern: /\bhr\b/g, issue: 'Use "h" instead of "hr" for hours in scientific notation' },
  { pattern: /\bhrs\b/gi, issue: 'Use "h" instead of "hrs" for hours' },
  { pattern: /\bmin\b(?!imum|imal)/gi, issue: 'Consider using "min" consistently for minutes' },
]

const CONSISTENCY_CHECKS = [
  'Verify dose units are consistent throughout (mg/kg or mg/m²)',
  'Check that species name is spelled consistently',
  'Ensure PK parameter abbreviations are defined on first use',
  'Verify statistical method is stated (Mean ± SD or Mean (%CV))',
]

const SYSTEM_PROMPT = `You are a quality control specialist for pharmaceutical regulatory documents. Your job is to identify issues in IND report content.

For each issue found, provide:
1. Type: error, warning, or suggestion
2. Category: terminology, formatting, consistency, or regulatory
3. Location: section or table where found
4. Message: description of the issue
5. Suggestion: how to fix it

Return issues as a JSON array.`

/**
 * QC Agent Lambda Handler
 */
export const handler: Handler<QCAgentInput, QCAgentOutput> = async (event) => {
  console.log('QC Agent invoked:', JSON.stringify(event, null, 2))

  try {
    const { reportId, content, checkTypes = ['terminology', 'formatting', 'consistency', 'regulatory'] } = event

    if (!reportId || !content) {
      return { success: false, error: 'Missing required parameters' }
    }

    const issues: QCIssue[] = []

    // Run rule-based checks on sections
    if (content.sections) {
      for (const section of content.sections) {
        // Terminology checks
        if (checkTypes.includes('terminology')) {
          for (const rule of TERMINOLOGY_RULES) {
            const matches = section.content.match(rule.pattern)
            if (matches) {
              issues.push({
                type: 'warning',
                category: 'terminology',
                location: `Section: ${section.title}`,
                message: rule.issue,
                suggestion: `Replace with "${rule.replacement}"`
              })
            }
          }
        }

        // Formatting checks
        if (checkTypes.includes('formatting')) {
          for (const rule of FORMATTING_RULES) {
            const matches = section.content.match(rule.pattern)
            if (matches) {
              issues.push({
                type: 'warning',
                category: 'formatting',
                location: `Section: ${section.title}`,
                message: rule.issue
              })
            }
          }
        }
      }
    }

    // Run AI-based consistency and regulatory checks
    if (checkTypes.includes('consistency') || checkTypes.includes('regulatory')) {
      const aiIssues = await runAIChecks(content, checkTypes)
      issues.push(...aiIssues)
    }

    // Calculate quality score
    const score = calculateScore(issues)

    return {
      success: true,
      issues,
      score
    }
  } catch (error: any) {
    console.error('QC Agent error:', error)
    return {
      success: false,
      error: error.message || 'QC check failed'
    }
  }
}

/**
 * Run AI-powered QC checks
 */
async function runAIChecks(
  content: QCAgentInput['content'],
  checkTypes: string[]
): Promise<QCIssue[]> {
  // Prepare content summary for AI analysis
  const contentSummary = content.sections
    ?.map(s => `## ${s.title}\n${s.content.substring(0, 1000)}`)
    .join('\n\n')
    .substring(0, 8000)

  const tableSummary = content.tables
    ?.map(t => `Table ${t.number}: ${t.caption}`)
    .join('\n')

  const checksToRun = []
  if (checkTypes.includes('consistency')) {
    checksToRun.push(...CONSISTENCY_CHECKS)
  }
  if (checkTypes.includes('regulatory')) {
    checksToRun.push(
      'Check for required regulatory statements',
      'Verify GLP compliance language if applicable',
      'Check for proper study identification',
      'Verify conclusions are supported by data'
    )
  }

  const prompt = `Review this pharmaceutical report content for quality issues:

${contentSummary}

${tableSummary ? `\nTables:\n${tableSummary}` : ''}

Check for these specific issues:
${checksToRun.map(c => `- ${c}`).join('\n')}

Return a JSON array of issues found. Each issue should have:
- type: "error" | "warning" | "suggestion"
- category: "consistency" | "regulatory"
- location: where in the document
- message: what the issue is
- suggestion: how to fix it (optional)

If no issues found, return an empty array: []`

  try {
    const response = await invokeClaudeAsync(
      [{ role: 'user', content: prompt }],
      {
        modelId: CLAUDE_HAIKU,
        system: SYSTEM_PROMPT,
        maxTokens: 1500
      }
    )

    const aiIssues = extractJSON<QCIssue[]>(response)
    return Array.isArray(aiIssues) ? aiIssues : []
  } catch (e) {
    console.error('AI check failed:', e)
    return []
  }
}

/**
 * Calculate quality score based on issues
 */
function calculateScore(issues: QCIssue[]): number {
  let score = 100

  for (const issue of issues) {
    switch (issue.type) {
      case 'error':
        score -= 10
        break
      case 'warning':
        score -= 3
        break
      case 'suggestion':
        score -= 1
        break
    }
  }

  return Math.max(0, Math.min(100, score))
}
