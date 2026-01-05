import type Anthropic from '@anthropic-ai/sdk'
import { recallMemories, storeMemory, parseMemoryContent } from '../shared/dynamodb-client'
import type { MemoryType, MemoryCategory, QCIssue } from '../shared/types'

/**
 * Tool definitions for Anthropic Claude API
 * Designed for thorough, comprehensive pharmaceutical report analysis
 */
export const PHARMA_TOOLS: Anthropic.Tool[] = [
  {
    name: 'ask_user_question',
    description: 'Ask the user a clarifying question when you need input to proceed. Provide multiple choice options for easy selection. Use this when uncertain about preferences, formatting choices, data interpretation, or how to resolve ambiguities.',
    input_schema: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'The question to ask the user. Be clear and specific.'
        },
        options: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Unique identifier for this option' },
              label: { type: 'string', description: 'Short label for the option (shown as button/chip)' },
              description: { type: 'string', description: 'Longer description explaining this option' }
            },
            required: ['id', 'label']
          },
          description: '2-4 predefined options for the user to choose from'
        },
        allowCustom: {
          type: 'boolean',
          description: 'Whether to allow custom text input in addition to options. Default true.'
        },
        allowMultiple: {
          type: 'boolean',
          description: 'Whether user can select multiple options. Default false.'
        },
        context: {
          type: 'string',
          description: 'Additional context about why this question is being asked'
        },
        category: {
          type: 'string',
          enum: ['formatting', 'terminology', 'data', 'preference', 'clarification', 'priority'],
          description: 'Category of the question for UI styling'
        }
      },
      required: ['question', 'options']
    }
  },
  {
    name: 'recall_memory',
    description: 'ALWAYS use this first. Recall ALL relevant memories, decisions, preferences, and facts from the report context. Essential for understanding user preferences, previous decisions, study details, and maintaining consistency.',
    input_schema: {
      type: 'object',
      properties: {
        reportId: {
          type: 'string',
          description: 'The report ID to recall memories for'
        },
        query: {
          type: 'string',
          description: 'Optional query to filter relevant memories (e.g., "dose stratification", "table formatting")'
        },
        minImportance: {
          type: 'number',
          description: 'Minimum importance level (1-10), defaults to 3 for comprehensive recall'
        },
        categories: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by categories: terminology, formatting, study_design, user_preference, document_structure, regulatory'
        }
      },
      required: ['reportId']
    }
  },
  {
    name: 'store_memory',
    description: 'Store EVERY significant decision, preference, fact, or discovery to build comprehensive context over time. Use liberally - more memory is better.',
    input_schema: {
      type: 'object',
      properties: {
        reportId: {
          type: 'string',
          description: 'The report ID to store memory for'
        },
        memoryType: {
          type: 'string',
          enum: ['DECISION', 'PREFERENCE', 'FACT', 'SUMMARY', 'ISSUE', 'CORRECTION'],
          description: 'Type of memory - use ISSUE for problems found, CORRECTION for fixes made'
        },
        content: {
          type: 'object',
          description: 'The memory content with relevant fields (what, where, why, related sections)'
        },
        category: {
          type: 'string',
          enum: ['terminology', 'formatting', 'study_design', 'conversation', 'user_preference', 'document_structure', 'regulatory', 'data_stratification', 'cross_reference'],
          description: 'Category of the memory'
        },
        importance: {
          type: 'number',
          description: 'Importance level (1-10). Use 8+ for decisions, 7 for preferences, 9+ for corrections'
        },
        relatedSections: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of section IDs this memory relates to'
        }
      },
      required: ['reportId', 'memoryType', 'content', 'category']
    }
  },
  {
    name: 'run_qc_check',
    description: 'Run comprehensive quality control checks. Use on ALL content you generate or modify, AND on related sections. Multiple QC passes are encouraged.',
    input_schema: {
      type: 'object',
      properties: {
        reportId: {
          type: 'string',
          description: 'The report ID'
        },
        content: {
          type: 'string',
          description: 'The content to check'
        },
        sectionId: {
          type: 'string',
          description: 'Section ID for context and cross-referencing'
        },
        checkTypes: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['terminology', 'formatting', 'consistency', 'regulatory', 'statistics', 'cross_reference', 'data_stratification']
          },
          description: 'Types of checks to run. Default runs ALL checks.'
        },
        relatedContent: {
          type: 'object',
          description: 'Related content to check for consistency (e.g., tables, other sections)'
        }
      },
      required: ['reportId', 'content']
    }
  },
  {
    name: 'get_section_template',
    description: 'Get detailed template and guidelines for writing a specific report section. Use before writing new sections.',
    input_schema: {
      type: 'object',
      properties: {
        sectionType: {
          type: 'string',
          enum: ['executive_summary', 'study_design', 'materials_methods', 'pk_parameters', 'tk_parameters', 'results', 'discussion', 'conclusions', 'tables', 'dose_proportionality', 'sex_differences', 'accumulation'],
          description: 'The type of section to get template for'
        },
        studyType: {
          type: 'string',
          description: 'Type of study (e.g., "Single Dose PK", "Repeat Dose TK", "28-Day Toxicity")'
        },
        species: {
          type: 'string',
          description: 'Species (e.g., "rat", "dog", "monkey", "mouse")'
        },
        includeExamples: {
          type: 'boolean',
          description: 'Include example text and common phrasings'
        }
      },
      required: ['sectionType']
    }
  },
  {
    name: 'calculate_pk_stats',
    description: 'Calculate pharmacokinetic statistics from concentration-time data. Use to verify existing values or compute new summaries.',
    input_schema: {
      type: 'object',
      properties: {
        values: {
          type: 'array',
          items: { type: 'number' },
          description: 'Array of numeric values'
        },
        parameterName: {
          type: 'string',
          description: 'Name of the parameter (e.g., "Cmax", "AUC0-t")'
        },
        decimalPlaces: {
          type: 'number',
          description: 'Number of decimal places for output, defaults to 2'
        },
        groupBy: {
          type: 'string',
          description: 'Grouping context (e.g., "Male", "10 mg/kg", "Day 1")'
        }
      },
      required: ['values']
    }
  },
  {
    name: 'analyze_report_structure',
    description: 'Analyze the complete report structure to understand relationships between sections, tables, and data. Use to identify what needs to be checked when making changes.',
    input_schema: {
      type: 'object',
      properties: {
        reportId: {
          type: 'string',
          description: 'The report ID'
        },
        focusArea: {
          type: 'string',
          description: 'Specific area to focus on (e.g., "tables", "pk_data", "dose_groups")'
        },
        identifyRelationships: {
          type: 'boolean',
          description: 'Whether to identify cross-references and dependencies between sections'
        }
      },
      required: ['reportId']
    }
  },
  {
    name: 'cross_check_sections',
    description: 'Verify consistency across multiple sections of the report. Use after making ANY change to ensure no inconsistencies were introduced.',
    input_schema: {
      type: 'object',
      properties: {
        reportId: {
          type: 'string',
          description: 'The report ID'
        },
        changedSectionId: {
          type: 'string',
          description: 'The section that was changed'
        },
        changeType: {
          type: 'string',
          enum: ['terminology', 'data_value', 'formatting', 'structure', 'dose_info', 'time_point', 'statistical'],
          description: 'Type of change made'
        },
        checkAllSections: {
          type: 'boolean',
          description: 'Whether to check ALL sections (true) or just related ones (false). Default true.'
        }
      },
      required: ['reportId', 'changedSectionId', 'changeType']
    }
  },
  {
    name: 'validate_data_stratification',
    description: 'Validate that data is correctly stratified across dose groups, time points, sex, and summary levels. Critical for catching missed stratifications.',
    input_schema: {
      type: 'object',
      properties: {
        reportId: {
          type: 'string',
          description: 'The report ID'
        },
        tableId: {
          type: 'string',
          description: 'Specific table to validate'
        },
        expectedStratifications: {
          type: 'object',
          properties: {
            doseGroups: { type: 'array', items: { type: 'string' } },
            timePoints: { type: 'array', items: { type: 'string' } },
            sexGroups: { type: 'array', items: { type: 'string' } },
            summaryLevels: { type: 'array', items: { type: 'string' } }
          },
          description: 'Expected stratification dimensions'
        },
        validateCompleteness: {
          type: 'boolean',
          description: 'Check that all expected combinations are present'
        }
      },
      required: ['reportId']
    }
  }
]

/**
 * Execute a pharma tool and return the result
 * @param context - Full report context for comprehensive analysis
 */
export async function executePharmaTool(
  toolName: string,
  input: Record<string, any>,
  defaultReportId: string,
  context?: any
): Promise<any> {
  const reportId = input.reportId || defaultReportId

  switch (toolName) {
    case 'recall_memory':
      return await executeRecallMemory(reportId, input)

    case 'store_memory':
      return await executeStoreMemory(reportId, input)

    case 'run_qc_check':
      return await executeQCCheck(reportId, input, context)

    case 'get_section_template':
      return await executeGetTemplate(input)

    case 'calculate_pk_stats':
      return await executeCalculateStats(input)

    case 'analyze_report_structure':
      return await executeAnalyzeStructure(reportId, input, context)

    case 'cross_check_sections':
      return await executeCrossCheck(reportId, input, context)

    case 'validate_data_stratification':
      return await executeValidateStratification(reportId, input, context)

    default:
      return { error: `Unknown tool: ${toolName}` }
  }
}

/**
 * Execute recall_memory tool - comprehensive memory retrieval
 */
async function executeRecallMemory(reportId: string, input: Record<string, any>) {
  const minImportance = input.minImportance || 3 // Lower default for thorough recall

  const memories = await recallMemories(reportId, {
    minImportance,
    limit: 50 // Increased limit for comprehensive context
  })

  // Filter by categories if specified
  let filteredMemories = memories
  if (input.categories && input.categories.length > 0) {
    filteredMemories = memories.filter(m => input.categories.includes(m.category))
  }

  const formattedMemories = filteredMemories.map(m => ({
    type: m.memoryType,
    category: m.category,
    content: parseMemoryContent<any>(m),
    importance: m.importance,
    createdAt: m.createdAt,
    relatedSections: m.relatedSections || []
  }))

  // Group by category for easier understanding
  const byCategory: Record<string, any[]> = {}
  for (const mem of formattedMemories) {
    if (!byCategory[mem.category]) byCategory[mem.category] = []
    byCategory[mem.category].push(mem)
  }

  return {
    success: true,
    totalCount: memories.length,
    returnedCount: formattedMemories.length,
    memories: formattedMemories,
    byCategory,
    summary: `Found ${formattedMemories.length} memories across ${Object.keys(byCategory).length} categories`
  }
}

/**
 * Execute store_memory tool - enhanced with related sections
 */
async function executeStoreMemory(reportId: string, input: Record<string, any>) {
  // Enhance content with related sections if provided
  const contentToStore = {
    ...input.content,
    relatedSections: input.relatedSections || []
  }

  const memory = await storeMemory(
    reportId,
    input.memoryType as MemoryType,
    contentToStore,
    input.category as MemoryCategory,
    input.importance || 7
  )

  return {
    success: true,
    message: `Memory stored: ${input.memoryType} in category ${input.category}`,
    memoryKey: memory.memoryKey,
    importance: input.importance || 7,
    relatedSections: input.relatedSections || []
  }
}

/**
 * Execute run_qc_check tool - comprehensive quality control
 */
async function executeQCCheck(reportId: string, input: Record<string, any>, context?: any) {
  const content = input.content
  const checkTypes = input.checkTypes || ['terminology', 'formatting', 'consistency', 'regulatory', 'statistics', 'data_stratification']
  const issues: QCIssue[] = []

  // Terminology checks - comprehensive
  if (checkTypes.includes('terminology')) {
    // IV route terminology
    if (content.toLowerCase().includes('infused') && content.toLowerCase().includes('iv')) {
      issues.push({
        type: 'error',
        category: 'terminology',
        location: input.sectionId || 'content',
        message: 'Use "distributed" instead of "infused" for IV administration',
        suggestion: 'Replace "infused" with "distributed"'
      })
    }

    // Species capitalization
    const speciesPatterns = [
      { wrong: /\bRat\b/g, right: 'rat' },
      { wrong: /\bMouse\b/g, right: 'mouse' },
      { wrong: /\bDog\b/g, right: 'dog' },
      { wrong: /\bMonkey\b/g, right: 'monkey' },
      { wrong: /\bRabbit\b/g, right: 'rabbit' }
    ]
    for (const pattern of speciesPatterns) {
      if (pattern.wrong.test(content)) {
        issues.push({
          type: 'warning',
          category: 'terminology',
          location: input.sectionId || 'content',
          message: `Species names should be lowercase: "${pattern.right}"`,
          suggestion: `Use "${pattern.right}" instead`
        })
      }
    }

    // Common terminology errors
    const termErrors = [
      { wrong: /\barea under curve\b/gi, right: 'area under the curve' },
      { wrong: /\bhalf life\b/gi, right: 'half-life' },
      { wrong: /\bdose proportional\b/gi, right: 'dose-proportional' },
      { wrong: /\btime point\b/gi, right: 'timepoint' }
    ]
    for (const term of termErrors) {
      if (term.wrong.test(content)) {
        issues.push({
          type: 'warning',
          category: 'terminology',
          location: input.sectionId || 'content',
          message: `Terminology: use "${term.right}"`,
          suggestion: `Replace with "${term.right}"`
        })
      }
    }
  }

  // Formatting checks - enhanced
  if (checkTypes.includes('formatting')) {
    // Statistical notation consistency
    const hasMeanSD = content.includes('±') || content.includes('Mean ± SD')
    const hasMeanCV = content.includes('%CV') || content.includes('Mean (%CV)')
    if (hasMeanSD && hasMeanCV) {
      issues.push({
        type: 'warning',
        category: 'formatting',
        location: input.sectionId || 'content',
        message: 'Mixed statistical notation (± and %CV) - consider using consistent notation throughout'
      })
    }

    // Table numbering
    if (content.includes('Table') && !/Table \d+/.test(content)) {
      issues.push({
        type: 'warning',
        category: 'formatting',
        location: input.sectionId || 'content',
        message: 'Tables should be numbered (e.g., "Table 1")'
      })
    }

    // Figure numbering
    if (content.includes('Figure') && !/Figure \d+/.test(content)) {
      issues.push({
        type: 'warning',
        category: 'formatting',
        location: input.sectionId || 'content',
        message: 'Figures should be numbered (e.g., "Figure 1")'
      })
    }

    // Unit formatting
    if (/\d+mg\/kg/i.test(content)) {
      issues.push({
        type: 'warning',
        category: 'formatting',
        location: input.sectionId || 'content',
        message: 'Add space between number and unit (e.g., "10 mg/kg" not "10mg/kg")'
      })
    }
  }

  // Data stratification checks
  if (checkTypes.includes('data_stratification')) {
    // Check for dose numbering consistency
    const hasFirstDose = /1st dose|first dose|Day 1/i.test(content)
    const hasOrdinalDose = /\d+(?:st|nd|rd|th) dose/i.test(content)
    const hasLastDose = /last dose|final dose/i.test(content)

    if (hasFirstDose && hasLastDose && !hasOrdinalDose) {
      issues.push({
        type: 'suggestion',
        category: 'data_stratification',
        location: input.sectionId || 'content',
        message: 'Consider including intermediate dose timepoints (e.g., 3rd dose, Day 7) for completeness'
      })
    }

    // Check for sex-specific data mentions
    const mentionsMales = /\bmales?\b/i.test(content)
    const mentionsFemales = /\bfemales?\b/i.test(content)
    const mentionsCombined = /\bcombined\b/i.test(content)

    if ((mentionsMales || mentionsFemales) && !mentionsCombined) {
      issues.push({
        type: 'suggestion',
        category: 'data_stratification',
        location: input.sectionId || 'content',
        message: 'Sex-specific data mentioned - consider including combined summary if appropriate'
      })
    }
  }

  // Regulatory checks
  if (checkTypes.includes('regulatory')) {
    if (!content.includes('GLP') && content.toLowerCase().includes('toxicology')) {
      issues.push({
        type: 'suggestion',
        category: 'regulatory',
        location: input.sectionId || 'content',
        message: 'Toxicology study mentioned - consider noting GLP compliance status'
      })
    }

    if (content.toLowerCase().includes('summary') && !content.includes('2.6') && !content.includes('Module')) {
      issues.push({
        type: 'suggestion',
        category: 'regulatory',
        location: input.sectionId || 'content',
        message: 'Summary section - consider adding CTD Module reference (e.g., Module 2.6)'
      })
    }
  }

  // Statistics validation
  if (checkTypes.includes('statistics')) {
    // Check for reasonable %CV values
    const cvMatches = content.match(/\((\d+(?:\.\d+)?)\s*%?\)/g)
    if (cvMatches) {
      for (const match of cvMatches) {
        const cvValue = parseFloat(match.replace(/[()%]/g, ''))
        if (cvValue > 100) {
          issues.push({
            type: 'warning',
            category: 'statistics',
            location: input.sectionId || 'content',
            message: `High %CV value (${cvValue}%) detected - verify this is correct`,
            suggestion: 'Very high variability - confirm data or explain in text'
          })
        }
      }
    }
  }

  // Calculate QC score
  const errorCount = issues.filter(i => i.type === 'error').length
  const warningCount = issues.filter(i => i.type === 'warning').length
  const suggestionCount = issues.filter(i => i.type === 'suggestion').length
  const score = Math.max(0, 100 - (errorCount * 20) - (warningCount * 10) - (suggestionCount * 2))

  return {
    success: true,
    score,
    issueCount: issues.length,
    breakdown: {
      errors: errorCount,
      warnings: warningCount,
      suggestions: suggestionCount
    },
    issues,
    checksPerformed: checkTypes,
    recommendation: score >= 90 ? 'Content looks good' :
                   score >= 70 ? 'Minor issues to address' :
                   score >= 50 ? 'Several issues need attention' :
                   'Significant revisions recommended'
  }
}

/**
 * Execute get_section_template tool - enhanced with examples
 */
async function executeGetTemplate(input: Record<string, any>) {
  const templates: Record<string, { template: string; examples?: string[] }> = {
    executive_summary: {
      template: `## Executive Summary Template

### Structure
1. **Study Overview** (1-2 sentences)
   - Study type and primary objective
   - Test article identification

2. **Study Design Summary**
   - Species/strain, n per group/sex
   - Dose levels (mg/kg)
   - Route of administration
   - Duration and dosing frequency

3. **Principal Findings**
   - PK/TK parameters summary (Cmax, AUC, t½)
   - Dose proportionality statement
   - Sex differences (if significant)
   - Accumulation (for repeat dose)

4. **Conclusions**
   - Regulatory implications
   - Key takeaways for development

### Formatting Rules
- Keep to 1 page maximum
- Use Mean (%CV) for PK parameters
- Species names lowercase
- Include units with all values

### Data Stratification Requirements
- Present data by dose group
- Include 1st dose and last dose for repeat dose studies
- Note any Day-specific findings
- Summarize both sexes if different`,
      examples: [
        'Following a single intravenous administration of Test Article to male and female rats at 1, 3, and 10 mg/kg, systemic exposure (AUC0-∞) increased in a dose-proportional manner.',
        'Mean terminal half-life (t½) ranged from 2.1 to 2.8 hours across dose groups with no notable sex differences.'
      ]
    },

    pk_parameters: {
      template: `## PK Parameters Section

### Parameter Order
1. Cmax (peak concentration)
2. Tmax (time to peak) - median (range) format
3. AUC0-t (area under curve to last timepoint)
4. AUC0-∞ (area extrapolated to infinity)
5. t½ (terminal half-life)
6. CL or CL/F (clearance)
7. Vd or Vss (volume of distribution)
8. F (bioavailability) - if oral study

### Formatting Standards
- Use Mean (%CV) for most parameters
- Use median (range) for Tmax
- Include units: ng/mL, hr, ng·hr/mL, mL/min/kg, L/kg
- Use consistent decimal places

### Stratification Requirements
- Present by dose group
- Include both sexes
- For repeat dose: Day 1 vs steady-state
- Include accumulation ratios where applicable`,
      examples: [
        'Cmax values were 125 (23.4%), 389 (18.7%), and 1250 (21.2%) ng/mL for the 1, 3, and 10 mg/kg dose groups, respectively.',
        'Median Tmax was 1.0 hour (range: 0.5-2.0 hours) across all dose groups.'
      ]
    },

    dose_proportionality: {
      template: `## Dose Proportionality Section

### Assessment Methods
1. Visual inspection of dose-normalized parameters
2. Power model analysis (if data permits)
3. Proportionality ratio calculations

### Key Comparisons
- Compare AUC ratio to dose ratio
- Evaluate Cmax proportionality
- Note any deviations from linearity

### Stratification
- Assess at each timepoint (Day 1, steady-state)
- Evaluate separately by sex if applicable
- Consider dose range tested`,
      examples: [
        'Systemic exposure (AUC0-∞) increased approximately dose-proportionally over the 1 to 10 mg/kg dose range, with exposure ratios of 1:3.2:10.5 (dose ratios 1:3:10).',
        'Dose proportionality was maintained at steady-state (Day 28), consistent with Day 1 findings.'
      ]
    },

    tables: {
      template: `## Table Guidelines

### Numbering and Captions
- Number sequentially: Table 1, Table 2, etc.
- Caption above table, descriptive
- Include study number in caption

### Standard Structure
| Parameter | Unit | Low Dose | Mid Dose | High Dose |
|-----------|------|----------|----------|-----------|
| Cmax | ng/mL | Mean (%CV) | Mean (%CV) | Mean (%CV) |

### Required Footnotes
- n = number of animals
- NC = Not calculated
- BLQ = Below limit of quantification
- LLOQ value
- Any exclusions with rationale

### Stratification Requirements
- Separate tables for:
  - Different timepoints (Day 1 vs Day 28)
  - Different sexes (if significantly different)
  - Main study vs recovery groups

### Formatting
- Align decimal points
- Consistent significant figures
- Bold headers
- Use horizontal lines sparingly`,
      examples: []
    },

    study_design: {
      template: `## Study Design Section

### Required Elements
1. **Objective Statement**
   - Primary and secondary objectives
   - GLP status

2. **Test System**
   - Species/strain
   - Source
   - Age and weight at study start
   - Number per group/sex

3. **Test Article**
   - Identity and lot number
   - Formulation/vehicle
   - Concentration(s) prepared

4. **Dosing Regimen**
   - Dose levels (mg/kg)
   - Route and method
   - Frequency and duration
   - Dose volume

5. **Sample Collection**
   - Timepoints
   - Matrix (plasma/serum)
   - Processing conditions
   - Storage conditions

6. **Analytical Method**
   - Bioanalytical method reference
   - LLOQ and dynamic range`,
      examples: []
    }
  }

  const sectionData = templates[input.sectionType]
  if (!sectionData) {
    return {
      success: true,
      template: `Template for "${input.sectionType}" not found. Standard sections include: executive_summary, pk_parameters, dose_proportionality, tables, study_design.`,
      available: Object.keys(templates)
    }
  }

  let response: any = {
    success: true,
    template: sectionData.template
  }

  // Add examples if requested
  if (input.includeExamples && sectionData.examples && sectionData.examples.length > 0) {
    response.examples = sectionData.examples
  }

  // Add study-specific context
  if (input.studyType) {
    response.studyTypeNotes = getStudyTypeNotes(input.studyType)
  }
  if (input.species) {
    response.speciesNotes = getSpeciesNotes(input.species)
  }

  return response
}

function getStudyTypeNotes(studyType: string): string {
  const notes: Record<string, string> = {
    'Single Dose PK': 'Focus on basic PK parameters. Include dose proportionality assessment.',
    'Repeat Dose TK': 'Include accumulation ratios (Day X/Day 1). Compare 1st and last dose parameters.',
    '28-Day Toxicity': 'Present TK on Day 1 and Day 28. Note exposure at NOAEL.',
    'Dose Range Finding': 'Emphasize tolerability and preliminary PK. Support dose selection.',
  }
  return notes[studyType] || `Study type: ${studyType}`
}

function getSpeciesNotes(species: string): string {
  const notes: Record<string, string> = {
    'rat': 'Use "rat" (lowercase). Sprague-Dawley or Wistar strain typically. Consider sex differences in metabolism.',
    'dog': 'Use "dog" (lowercase). Beagle typically. Note any breed-specific considerations.',
    'monkey': 'Use "monkey" (lowercase). Specify species (cynomolgus, rhesus). Limited animal numbers typical.',
    'mouse': 'Use "mouse" (lowercase). Consider strain-specific metabolism (CD-1, C57BL/6).',
  }
  return notes[species] || `Species: ${species}`
}

/**
 * Execute calculate_pk_stats tool
 */
async function executeCalculateStats(input: Record<string, any>) {
  const values = (input.values as number[]).filter(v => !isNaN(v) && v !== null && v !== undefined)
  const n = values.length

  if (n === 0) {
    return { success: false, error: 'No valid values provided' }
  }

  if (n === 1) {
    return {
      success: true,
      parameter: input.parameterName || 'Value',
      groupBy: input.groupBy,
      n: 1,
      value: values[0],
      note: 'Single value - no variability calculated'
    }
  }

  const mean = values.reduce((a, b) => a + b, 0) / n
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1)
  const sd = Math.sqrt(variance)
  const cv = mean !== 0 ? (sd / mean) * 100 : 0
  const min = Math.min(...values)
  const max = Math.max(...values)
  const median = getMedian(values)

  const dp = input.decimalPlaces || 2

  return {
    success: true,
    parameter: input.parameterName || 'Value',
    groupBy: input.groupBy,
    n,
    mean: Number(mean.toFixed(dp)),
    sd: Number(sd.toFixed(dp)),
    cv: Number(cv.toFixed(1)),
    median: Number(median.toFixed(dp)),
    min: Number(min.toFixed(dp)),
    max: Number(max.toFixed(dp)),
    formatted: {
      meanCV: `${mean.toFixed(dp)} (${cv.toFixed(1)}%)`,
      meanSD: `${mean.toFixed(dp)} ± ${sd.toFixed(dp)}`,
      medianRange: `${median.toFixed(dp)} (${min.toFixed(dp)}-${max.toFixed(dp)})`
    },
    qualityNote: cv > 50 ? 'High variability detected' : cv > 30 ? 'Moderate variability' : 'Low variability'
  }
}

function getMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * Execute analyze_report_structure tool
 */
async function executeAnalyzeStructure(reportId: string, input: Record<string, any>, context?: any) {
  if (!context) {
    return {
      success: false,
      error: 'No report context available for structure analysis'
    }
  }

  const sections = context.sections || []
  const tables = context.tables || []

  // Analyze structure
  const structure = {
    sectionCount: sections.length,
    tableCount: tables.length,
    sections: sections.map((s: any) => ({
      id: s.id,
      title: s.title,
      hasContent: !!s.content && s.content.length > 0,
      contentLength: s.content?.length || 0,
      mentionsTables: s.content?.includes('Table') || false,
      mentionsFigures: s.content?.includes('Figure') || false
    })),
    tables: tables.map((t: any) => ({
      id: t.id,
      caption: t.caption,
      columnCount: t.headers?.length || 0,
      rowCount: t.data?.length || 0
    }))
  }

  // Identify relationships if requested
  let relationships: any[] = []
  if (input.identifyRelationships) {
    // Find table references in sections
    for (const section of sections) {
      const tableRefs = section.content?.match(/Table \d+/g) || []
      for (const ref of tableRefs) {
        relationships.push({
          type: 'section_references_table',
          from: section.id,
          to: ref,
          context: 'Table reference in text'
        })
      }
    }

    // Find cross-section references
    for (const section of sections) {
      for (const otherSection of sections) {
        if (section.id !== otherSection.id &&
            section.content?.toLowerCase().includes(otherSection.title?.toLowerCase())) {
          relationships.push({
            type: 'section_references_section',
            from: section.id,
            to: otherSection.id,
            context: 'Section title mentioned'
          })
        }
      }
    }
  }

  return {
    success: true,
    reportId,
    structure,
    relationships,
    focusArea: input.focusArea,
    recommendations: generateStructureRecommendations(structure)
  }
}

function generateStructureRecommendations(structure: any): string[] {
  const recommendations: string[] = []

  // Check for empty sections
  const emptySections = structure.sections.filter((s: any) => !s.hasContent)
  if (emptySections.length > 0) {
    recommendations.push(`${emptySections.length} section(s) have no content: ${emptySections.map((s: any) => s.id).join(', ')}`)
  }

  // Check for tables without references
  if (structure.tableCount > 0) {
    const referencedTables = structure.sections
      .filter((s: any) => s.mentionsTables)
      .length
    if (referencedTables === 0) {
      recommendations.push('Tables exist but no sections reference them - add table citations to narrative')
    }
  }

  return recommendations
}

/**
 * Execute cross_check_sections tool
 */
async function executeCrossCheck(reportId: string, input: Record<string, any>, context?: any) {
  if (!context) {
    return {
      success: false,
      error: 'No report context available for cross-checking'
    }
  }

  const sections = context.sections || []
  const tables = context.tables || []
  const changedSection = sections.find((s: any) => s.id === input.changedSectionId)

  const issues: any[] = []
  const checks: string[] = []

  // Determine which sections to check based on change type
  const sectionsToCheck = input.checkAllSections ? sections :
    getRelatedSections(input.changedSectionId, input.changeType, sections)

  checks.push(`Checking ${sectionsToCheck.length} sections for consistency`)

  // Terminology consistency
  if (input.changeType === 'terminology') {
    for (const section of sectionsToCheck) {
      if (section.id !== input.changedSectionId) {
        // Check if other sections have same terminology issues
        if (section.content?.toLowerCase().includes('infused') &&
            section.content?.toLowerCase().includes('iv')) {
          issues.push({
            sectionId: section.id,
            issue: 'Same terminology issue exists',
            type: 'terminology',
            message: 'Also uses "infused" with IV - should be updated for consistency'
          })
        }
      }
    }
  }

  // Data value consistency
  if (input.changeType === 'data_value' || input.changeType === 'statistical') {
    // Check tables for matching values
    for (const table of tables) {
      checks.push(`Checked table ${table.id} for value consistency`)
    }
  }

  // Dose info consistency
  if (input.changeType === 'dose_info') {
    const dosePattern = /\d+\s*mg\/kg/gi
    for (const section of sectionsToCheck) {
      const doses = section.content?.match(dosePattern) || []
      if (doses.length > 0) {
        checks.push(`Found dose references in ${section.id}: ${[...new Set(doses)].join(', ')}`)
      }
    }
  }

  return {
    success: true,
    reportId,
    changedSectionId: input.changedSectionId,
    changeType: input.changeType,
    sectionsChecked: sectionsToCheck.map((s: any) => s.id),
    checksPerformed: checks,
    issuesFound: issues.length,
    issues,
    recommendation: issues.length === 0 ?
      'No consistency issues found' :
      `Found ${issues.length} consistency issue(s) that should be addressed`
  }
}

function getRelatedSections(sectionId: string, changeType: string, sections: any[]): any[] {
  // Return sections likely to be affected by this type of change
  const relatedIds: string[] = [sectionId]

  // Executive summary is related to everything
  if (sectionId !== 'executive_summary') {
    const execSummary = sections.find((s: any) =>
      s.id === 'executive_summary' || s.title?.toLowerCase().includes('summary'))
    if (execSummary) relatedIds.push(execSummary.id)
  }

  // Results and discussion are related
  if (sectionId.includes('result') || sectionId.includes('discussion')) {
    const related = sections.filter((s: any) =>
      s.id.includes('result') || s.id.includes('discussion'))
    relatedIds.push(...related.map((s: any) => s.id))
  }

  return sections.filter((s: any) => relatedIds.includes(s.id))
}

/**
 * Execute validate_data_stratification tool
 */
async function executeValidateStratification(reportId: string, input: Record<string, any>, context?: any) {
  if (!context) {
    return {
      success: false,
      error: 'No report context available for stratification validation'
    }
  }

  const tables = context.tables || []
  const sections = context.sections || []
  const issues: any[] = []
  const validations: string[] = []

  // Get expected stratifications
  const expected = input.expectedStratifications || {
    doseGroups: ['Low', 'Mid', 'High'],
    timePoints: ['Day 1'],
    sexGroups: ['Male', 'Female', 'Combined'],
    summaryLevels: ['Individual', 'Mean']
  }

  // Validate table if specified
  if (input.tableId) {
    const table = tables.find((t: any) => t.id === input.tableId)
    if (table) {
      validations.push(`Validating table: ${table.caption || table.id}`)

      // Check headers for stratification dimensions
      const headers = table.headers || []
      const headerStr = headers.join(' ').toLowerCase()

      // Check dose groups
      for (const dose of expected.doseGroups) {
        if (!headerStr.includes(dose.toLowerCase())) {
          issues.push({
            type: 'missing_stratification',
            dimension: 'dose',
            expected: dose,
            location: table.id
          })
        }
      }

      // Check for sex columns if expected
      if (expected.sexGroups.length > 1) {
        const hasSexData = expected.sexGroups.some((sex: string) =>
          headerStr.includes(sex.toLowerCase()))
        if (!hasSexData) {
          issues.push({
            type: 'missing_stratification',
            dimension: 'sex',
            expected: expected.sexGroups.join(', '),
            location: table.id
          })
        }
      }
    }
  }

  // Check sections for stratification mentions
  for (const section of sections) {
    if (!section.content) continue

    const content = section.content.toLowerCase()
    validations.push(`Checking section: ${section.id}`)

    // Check for complete dose coverage
    const mentionsDoses = expected.doseGroups.some((dose: string) =>
      content.includes(dose.toLowerCase()) || content.includes('mg/kg'))

    // Check for time point coverage
    const mentionsTimePoints = expected.timePoints.some((tp: string) =>
      content.includes(tp.toLowerCase()))

    if (mentionsDoses && !mentionsTimePoints && expected.timePoints.length > 1) {
      issues.push({
        type: 'incomplete_stratification',
        dimension: 'timepoint',
        sectionId: section.id,
        message: 'Dose data mentioned but timepoint stratification unclear'
      })
    }
  }

  return {
    success: true,
    reportId,
    expectedStratifications: expected,
    validationsPerformed: validations,
    issuesFound: issues.length,
    issues,
    completeness: issues.length === 0 ? 'Complete' :
                  issues.length < 3 ? 'Mostly complete' : 'Needs attention',
    recommendations: issues.map(i =>
      `Add ${i.dimension} stratification${i.expected ? ` for ${i.expected}` : ''} in ${i.location || i.sectionId}`
    )
  }
}
