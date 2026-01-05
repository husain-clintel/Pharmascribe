import type { Handler } from 'aws-lambda'
import { invokeClaudeAsync, extractJSON, CLAUDE_SONNET } from '../shared/bedrock-client'
import type { TableGeneratorInput, TableGeneratorOutput, Table } from '../shared/types'

const SYSTEM_PROMPT = `You are an expert at creating pharmacokinetic data tables for regulatory submissions.

Table formatting requirements:
- Use proper statistical notation: Mean (%CV) or Mean ± SD
- Include units in column headers
- Use consistent decimal places
- Follow FDA CTD format guidelines

For PK parameter tables:
- Standard parameters: Cmax (ng/mL), Tmax (h), AUC0-t (ng·h/mL), AUC0-inf (ng·h/mL), T1/2 (h)
- Include CL/F and Vd/F for appropriate routes
- Show both male and female data when available

When returning tables, use this exact JSON structure:
{
  "table": {
    "id": "unique-id",
    "number": 1,
    "caption": "Table caption here",
    "headers": ["Header1", "Header2", ...],
    "data": [["row1col1", "row1col2"], ["row2col1", "row2col2"]]
  }
}`

// Table type templates
const TABLE_TEMPLATES: Record<string, {
  headers: string[]
  caption: string
}> = {
  'pk-summary': {
    headers: ['Parameter', 'Unit', 'Low Dose', 'Mid Dose', 'High Dose'],
    caption: 'Summary of Pharmacokinetic Parameters Following [ROUTE] Administration of [DRUG] in [SPECIES]'
  },
  'pk-individual': {
    headers: ['Animal ID', 'Sex', 'Dose (mg/kg)', 'Cmax (ng/mL)', 'Tmax (h)', 'AUC0-t (ng·h/mL)', 'T1/2 (h)'],
    caption: 'Individual Pharmacokinetic Parameters'
  },
  'concentration-time': {
    headers: ['Time (h)', 'Low Dose', 'Mid Dose', 'High Dose'],
    caption: 'Mean (±SD) Plasma Concentrations of [DRUG] Following [ROUTE] Administration in [SPECIES]'
  },
  'dose-proportionality': {
    headers: ['Parameter', 'Dose Ratio', 'Parameter Ratio', 'Proportionality Assessment'],
    caption: 'Dose Proportionality Assessment'
  },
  'sex-comparison': {
    headers: ['Parameter', 'Unit', 'Male Mean (%CV)', 'Female Mean (%CV)', 'M/F Ratio'],
    caption: 'Comparison of Pharmacokinetic Parameters Between Male and Female [SPECIES]'
  },
  'tk-exposure': {
    headers: ['Dose (mg/kg)', 'Day', 'Cmax (ng/mL)', 'AUC0-24 (ng·h/mL)', 'Accumulation Ratio'],
    caption: 'Toxicokinetic Exposure Summary'
  }
}

/**
 * Table Generator Lambda Handler
 */
export const handler: Handler<TableGeneratorInput, TableGeneratorOutput> = async (event) => {
  console.log('Table Generator invoked:', JSON.stringify(event, null, 2))

  try {
    const { reportId, tableType, sourceData, context, format = 'mean_cv' } = event

    if (!reportId || !tableType) {
      return { success: false, error: 'Missing required parameters' }
    }

    // Get template for this table type
    const template = TABLE_TEMPLATES[tableType] || TABLE_TEMPLATES['pk-summary']

    // Build the prompt
    const contextInfo = context ? `
Study: ${context.title || 'PK Study'}
Species: ${context.species || 'Not specified'}
Route: ${context.route || 'Not specified'}
` : ''

    const dataInfo = sourceData ? `
Source Data:
${JSON.stringify(sourceData, null, 2)}
` : ''

    const formatInstructions = format === 'mean_cv'
      ? 'Use Mean (%CV) format for all statistical values'
      : format === 'individual'
        ? 'Show individual animal data'
        : 'Use summary statistics'

    const prompt = `Create a ${tableType} table with the following context:

${contextInfo}
${dataInfo}

Table Template:
- Caption: ${template.caption}
- Default Headers: ${template.headers.join(', ')}

Instructions:
- ${formatInstructions}
- Use appropriate units
- Replace placeholders like [DRUG], [SPECIES], [ROUTE] with actual values from context
- If source data is provided, use those values; otherwise generate realistic placeholder values
- Ensure proper decimal places (typically 2-3 for concentrations, 2 for ratios)

Return the table as a JSON object with id, number, caption, headers, and data arrays.`

    // Invoke Claude
    const response = await invokeClaudeAsync(
      [{ role: 'user', content: prompt }],
      {
        modelId: CLAUDE_SONNET,
        system: SYSTEM_PROMPT,
        maxTokens: 2048
      }
    )

    // Extract table from response
    const result = extractJSON<{ table: Table }>(response)

    if (!result?.table) {
      // Try to extract just the table object
      const tableOnly = extractJSON<Table>(response)
      if (tableOnly) {
        return { success: true, table: tableOnly }
      }
      return { success: false, error: 'Failed to generate table structure' }
    }

    return { success: true, table: result.table }
  } catch (error: any) {
    console.error('Table Generator error:', error)
    return {
      success: false,
      error: error.message || 'Failed to generate table'
    }
  }
}

/**
 * Calculate Mean (%CV) from array of numbers
 */
export function calculateMeanCV(values: number[]): string {
  if (values.length === 0) return 'NC'

  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const sd = Math.sqrt(
    values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length
  )
  const cv = (sd / mean) * 100

  return `${mean.toFixed(2)} (${cv.toFixed(1)})`
}

/**
 * Calculate Mean ± SD from array of numbers
 */
export function calculateMeanSD(values: number[]): string {
  if (values.length === 0) return 'NC'

  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const sd = Math.sqrt(
    values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / (values.length - 1)
  )

  return `${mean.toFixed(2)} ± ${sd.toFixed(2)}`
}
