"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PHARMA_TOOLS = void 0;
exports.executePharmaTool = executePharmaTool;
const dynamodb_client_1 = require("../shared/dynamodb-client");
/**
 * Tool definitions for Anthropic Claude API
 */
exports.PHARMA_TOOLS = [
    {
        name: 'recall_memory',
        description: 'Recall relevant memories, decisions, and facts from the report context. Use this to understand user preferences, previous decisions, and study details.',
        input_schema: {
            type: 'object',
            properties: {
                reportId: {
                    type: 'string',
                    description: 'The report ID to recall memories for'
                },
                query: {
                    type: 'string',
                    description: 'Optional query to filter relevant memories'
                },
                minImportance: {
                    type: 'number',
                    description: 'Minimum importance level (1-10), defaults to 5'
                }
            },
            required: ['reportId']
        }
    },
    {
        name: 'store_memory',
        description: 'Store a decision, preference, fact, or summary to the report memory. Use this when the user makes a choice, expresses a preference, or when you extract important facts.',
        input_schema: {
            type: 'object',
            properties: {
                reportId: {
                    type: 'string',
                    description: 'The report ID to store memory for'
                },
                memoryType: {
                    type: 'string',
                    enum: ['DECISION', 'PREFERENCE', 'FACT', 'SUMMARY'],
                    description: 'Type of memory'
                },
                content: {
                    type: 'object',
                    description: 'The memory content (object with relevant fields)'
                },
                category: {
                    type: 'string',
                    enum: ['terminology', 'formatting', 'study_design', 'conversation', 'user_preference', 'document_structure', 'regulatory'],
                    description: 'Category of the memory'
                },
                importance: {
                    type: 'number',
                    description: 'Importance level (1-10), defaults to 7'
                }
            },
            required: ['reportId', 'memoryType', 'content', 'category']
        }
    },
    {
        name: 'run_qc_check',
        description: 'Run quality control checks on report content. Returns issues with terminology, formatting, consistency, and regulatory compliance.',
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
                    description: 'Optional section ID for context'
                },
                checkTypes: {
                    type: 'array',
                    items: {
                        type: 'string',
                        enum: ['terminology', 'formatting', 'consistency', 'regulatory']
                    },
                    description: 'Types of checks to run'
                }
            },
            required: ['reportId', 'content']
        }
    },
    {
        name: 'get_section_template',
        description: 'Get a template or guidelines for writing a specific report section. Use this to ensure proper structure and content requirements.',
        input_schema: {
            type: 'object',
            properties: {
                sectionType: {
                    type: 'string',
                    enum: ['executive_summary', 'study_design', 'materials_methods', 'pk_parameters', 'tk_parameters', 'results', 'discussion', 'conclusions', 'tables'],
                    description: 'The type of section to get template for'
                },
                studyType: {
                    type: 'string',
                    description: 'Type of study (e.g., "Single Dose PK", "Repeat Dose TK")'
                },
                species: {
                    type: 'string',
                    description: 'Species (e.g., "rat", "dog", "monkey")'
                }
            },
            required: ['sectionType']
        }
    },
    {
        name: 'calculate_pk_stats',
        description: 'Calculate pharmacokinetic statistics from concentration-time data. Returns Mean, SD, %CV for the provided values.',
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
                    description: 'Name of the parameter (for output formatting)'
                },
                decimalPlaces: {
                    type: 'number',
                    description: 'Number of decimal places for output, defaults to 2'
                }
            },
            required: ['values']
        }
    }
];
/**
 * Execute a pharma tool and return the result
 */
async function executePharmaTool(toolName, input, defaultReportId) {
    // Use provided reportId or fall back to default
    const reportId = input.reportId || defaultReportId;
    switch (toolName) {
        case 'recall_memory':
            return await executeRecallMemory(reportId, input);
        case 'store_memory':
            return await executeStoreMemory(reportId, input);
        case 'run_qc_check':
            return await executeQCCheck(reportId, input);
        case 'get_section_template':
            return await executeGetTemplate(input);
        case 'calculate_pk_stats':
            return await executeCalculateStats(input);
        default:
            return { error: `Unknown tool: ${toolName}` };
    }
}
/**
 * Execute recall_memory tool
 */
async function executeRecallMemory(reportId, input) {
    const minImportance = input.minImportance || 5;
    const memories = await (0, dynamodb_client_1.recallMemories)(reportId, {
        minImportance,
        limit: 20
    });
    const formattedMemories = memories.map(m => ({
        type: m.memoryType,
        category: m.category,
        content: (0, dynamodb_client_1.parseMemoryContent)(m),
        importance: m.importance,
        createdAt: m.createdAt
    }));
    return {
        success: true,
        count: memories.length,
        memories: formattedMemories
    };
}
/**
 * Execute store_memory tool
 */
async function executeStoreMemory(reportId, input) {
    const memory = await (0, dynamodb_client_1.storeMemory)(reportId, input.memoryType, input.content, input.category, input.importance || 7);
    return {
        success: true,
        message: `Memory stored: ${input.memoryType} in category ${input.category}`,
        memoryKey: memory.memoryKey
    };
}
/**
 * Execute run_qc_check tool
 */
async function executeQCCheck(reportId, input) {
    const content = input.content;
    const checkTypes = input.checkTypes || ['terminology', 'formatting'];
    const issues = [];
    // Terminology checks
    if (checkTypes.includes('terminology')) {
        // IV route terminology
        if (content.toLowerCase().includes('infused') && content.toLowerCase().includes('iv')) {
            issues.push({
                type: 'error',
                category: 'terminology',
                location: input.sectionId || 'content',
                message: 'Use "distributed" instead of "infused" for IV administration',
                suggestion: 'Replace "infused" with "distributed"'
            });
        }
        // Species capitalization
        const speciesPatterns = [
            { wrong: /\bRat\b/g, right: 'rat' },
            { wrong: /\bMouse\b/g, right: 'mouse' },
            { wrong: /\bDog\b/g, right: 'dog' },
            { wrong: /\bMonkey\b/g, right: 'monkey' }
        ];
        for (const pattern of speciesPatterns) {
            if (pattern.wrong.test(content)) {
                issues.push({
                    type: 'warning',
                    category: 'terminology',
                    location: input.sectionId || 'content',
                    message: `Species names should be lowercase: "${pattern.right}"`,
                    suggestion: `Use "${pattern.right}" instead`
                });
            }
        }
    }
    // Formatting checks
    if (checkTypes.includes('formatting')) {
        // Statistical notation
        if (content.includes('±') && !content.includes('Mean')) {
            issues.push({
                type: 'suggestion',
                category: 'formatting',
                location: input.sectionId || 'content',
                message: 'Consider using "Mean ± SD" or "Mean (%CV)" notation for clarity'
            });
        }
        // Table numbering
        if (content.includes('Table') && !/Table \d+/.test(content)) {
            issues.push({
                type: 'warning',
                category: 'formatting',
                location: input.sectionId || 'content',
                message: 'Tables should be numbered (e.g., "Table 1")'
            });
        }
    }
    // Regulatory checks
    if (checkTypes.includes('regulatory')) {
        if (content.toLowerCase().includes('section') && !content.includes('2.6') && !content.includes('2.7')) {
            issues.push({
                type: 'suggestion',
                category: 'regulatory',
                location: input.sectionId || 'content',
                message: 'Consider adding CTD section references (2.6 for summaries, 2.7 for clinical)'
            });
        }
    }
    // Calculate QC score
    const errorCount = issues.filter(i => i.type === 'error').length;
    const warningCount = issues.filter(i => i.type === 'warning').length;
    const score = Math.max(0, 100 - (errorCount * 15) - (warningCount * 5));
    return {
        success: true,
        score,
        issueCount: issues.length,
        issues
    };
}
/**
 * Execute get_section_template tool
 */
async function executeGetTemplate(input) {
    const templates = {
        executive_summary: `## Executive Summary Template
- Brief study overview (1-2 sentences)
- Key objectives
- Study design summary (species, doses, route, duration)
- Principal findings:
  - PK/TK parameters summary
  - Dose proportionality statement
  - Key observations
- Conclusions (regulatory implications)

Note: Keep to 1 page maximum. Use Mean (%CV) for parameters.`,
        study_design: `## Study Design Section
1. Study type and objective
2. Test system:
   - Species/strain
   - Age/weight at start
   - Number per group/sex
3. Test article:
   - Identification
   - Formulation/vehicle
4. Dosing regimen:
   - Dose levels (mg/kg)
   - Route of administration
   - Frequency and duration
5. Sample collection:
   - Time points
   - Matrix (plasma/serum)
   - Processing/storage`,
        pk_parameters: `## PK Parameters Section
Present parameters in order:
1. Cmax (peak concentration)
2. Tmax (time to peak)
3. AUC0-t (area to last timepoint)
4. AUC0-∞ (area extrapolated)
5. t½ (terminal half-life)
6. CL (clearance) - for IV
7. Vd or Vss (volume of distribution)
8. F (bioavailability) - if applicable

Use Mean (%CV) format. Include sex differences if significant.`,
        tk_parameters: `## TK Parameters Section
Similar to PK parameters but with toxicology context:
1. Present by dose group
2. Include accumulation ratios for repeat dose
3. Compare to efficacious exposure levels
4. Note any dose-dependent changes
5. Discuss exposure margins`,
        results: `## Results Section
1. Plasma concentration-time profiles
2. Summary tables (Mean ± SD or Mean (%CV))
3. Dose proportionality assessment
4. Sex differences (if applicable)
5. Key observations`,
        tables: `## Table Guidelines
1. Number tables sequentially (Table 1, Table 2, etc.)
2. Include descriptive caption above table
3. Standard columns:
   - Parameter | Unit | Dose 1 | Dose 2 | Dose 3
4. Use Mean (%CV) or Mean ± SD
5. Include footnotes for:
   - NC = Not calculated
   - BLQ = Below limit of quantification
   - n = number of subjects
6. Align decimal points
7. Use consistent significant figures`
    };
    const template = templates[input.sectionType] ||
        `Template for ${input.sectionType} not found. Please describe what content is needed.`;
    let contextualNotes = '';
    if (input.studyType) {
        contextualNotes += `\n\nStudy type context: ${input.studyType}`;
    }
    if (input.species) {
        contextualNotes += `\nSpecies: ${input.species}`;
    }
    return {
        success: true,
        template: template + contextualNotes
    };
}
/**
 * Execute calculate_pk_stats tool
 */
async function executeCalculateStats(input) {
    const values = input.values.filter(v => !isNaN(v) && v !== null);
    const n = values.length;
    if (n === 0) {
        return { error: 'No valid values provided' };
    }
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1);
    const sd = Math.sqrt(variance);
    const cv = (sd / mean) * 100;
    const dp = input.decimalPlaces || 2;
    return {
        success: true,
        parameter: input.parameterName || 'Value',
        n,
        mean: Number(mean.toFixed(dp)),
        sd: Number(sd.toFixed(dp)),
        cv: Number(cv.toFixed(1)),
        formatted: {
            meanCV: `${mean.toFixed(dp)} (${cv.toFixed(1)}%)`,
            meanSD: `${mean.toFixed(dp)} ± ${sd.toFixed(dp)}`
        }
    };
}
//# sourceMappingURL=tools.js.map