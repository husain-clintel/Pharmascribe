"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPharmaScribeMcpServer = createPharmaScribeMcpServer;
const zod_1 = require("zod");
const claude_agent_sdk_1 = require("@anthropic-ai/claude-agent-sdk");
const dynamodb_client_1 = require("../shared/dynamodb-client");
/**
 * PharmaScribe MCP Tools
 * Custom tools for pharmaceutical report writing domain
 */
// Memory Recall Tool - Retrieve relevant memories for a report
const recallMemoryTool = (0, claude_agent_sdk_1.tool)('recall_memory', 'Recall relevant memories, decisions, and facts from the report context. Use this to understand user preferences, previous decisions, and study details.', {
    reportId: zod_1.z.string().describe('The report ID to recall memories for'),
    query: zod_1.z.string().optional().describe('Optional query to filter relevant memories'),
    minImportance: zod_1.z.number().min(1).max(10).default(5).describe('Minimum importance level (1-10)')
}, async (args) => {
    const memories = await (0, dynamodb_client_1.recallMemories)(args.reportId, {
        minImportance: args.minImportance,
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
        content: [{
                type: 'text',
                text: JSON.stringify({
                    success: true,
                    count: memories.length,
                    memories: formattedMemories
                }, null, 2)
            }]
    };
});
// Store Memory Tool - Save decisions, preferences, and facts
const storeMemoryTool = (0, claude_agent_sdk_1.tool)('store_memory', 'Store a decision, preference, fact, or summary to the report memory. Use this when the user makes a choice, expresses a preference, or when you extract important facts from the data.', {
    reportId: zod_1.z.string().describe('The report ID to store memory for'),
    memoryType: zod_1.z.enum(['DECISION', 'PREFERENCE', 'FACT', 'SUMMARY']).describe('Type of memory'),
    content: zod_1.z.any().describe('The memory content (can be string or object)'),
    category: zod_1.z.enum([
        'terminology',
        'formatting',
        'study_design',
        'conversation',
        'user_preference',
        'document_structure',
        'regulatory'
    ]).describe('Category of the memory'),
    importance: zod_1.z.number().min(1).max(10).default(7).describe('Importance level (1-10)')
}, async (args) => {
    const memory = await (0, dynamodb_client_1.storeMemory)(args.reportId, args.memoryType, args.content, args.category, args.importance);
    return {
        content: [{
                type: 'text',
                text: JSON.stringify({
                    success: true,
                    message: `Memory stored: ${args.memoryType} in category ${args.category}`,
                    memoryKey: memory.memoryKey
                })
            }]
    };
});
// QC Check Tool - Run quality control checks on content
const qcCheckTool = (0, claude_agent_sdk_1.tool)('run_qc_check', 'Run quality control checks on report content. Returns issues with terminology, formatting, consistency, and regulatory compliance.', {
    reportId: zod_1.z.string().describe('The report ID'),
    content: zod_1.z.string().describe('The content to check'),
    sectionId: zod_1.z.string().optional().describe('Optional section ID for context'),
    checkTypes: zod_1.z.array(zod_1.z.enum(['terminology', 'formatting', 'consistency', 'regulatory']))
        .default(['terminology', 'formatting'])
        .describe('Types of checks to run')
}, async (args) => {
    // QC rules for pharmaceutical reports
    const issues = [];
    const content = args.content;
    // Terminology checks
    if (args.checkTypes.includes('terminology')) {
        // IV route terminology
        if (content.toLowerCase().includes('infused') && content.toLowerCase().includes('iv')) {
            issues.push({
                type: 'error',
                category: 'terminology',
                location: args.sectionId || 'content',
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
                    location: args.sectionId || 'content',
                    message: `Species names should be lowercase: "${pattern.right}"`,
                    suggestion: `Use "${pattern.right}" instead`
                });
            }
        }
    }
    // Formatting checks
    if (args.checkTypes.includes('formatting')) {
        // Statistical notation
        if (content.includes('±') && !content.includes('Mean')) {
            issues.push({
                type: 'suggestion',
                category: 'formatting',
                location: args.sectionId || 'content',
                message: 'Consider using "Mean ± SD" or "Mean (%CV)" notation for clarity'
            });
        }
        // Table numbering
        if (content.includes('Table') && !/Table \d+/.test(content)) {
            issues.push({
                type: 'warning',
                category: 'formatting',
                location: args.sectionId || 'content',
                message: 'Tables should be numbered (e.g., "Table 1")'
            });
        }
    }
    // Regulatory checks
    if (args.checkTypes.includes('regulatory')) {
        // CTD section references
        if (content.toLowerCase().includes('section') && !content.includes('2.6') && !content.includes('2.7')) {
            issues.push({
                type: 'suggestion',
                category: 'regulatory',
                location: args.sectionId || 'content',
                message: 'Consider adding CTD section references (2.6 for summaries, 2.7 for clinical)'
            });
        }
    }
    // Calculate QC score
    const errorCount = issues.filter(i => i.type === 'error').length;
    const warningCount = issues.filter(i => i.type === 'warning').length;
    const score = Math.max(0, 100 - (errorCount * 15) - (warningCount * 5));
    return {
        content: [{
                type: 'text',
                text: JSON.stringify({
                    success: true,
                    score,
                    issueCount: issues.length,
                    issues
                }, null, 2)
            }]
    };
});
// Section Template Tool - Get templates for standard sections
const getSectionTemplateTool = (0, claude_agent_sdk_1.tool)('get_section_template', 'Get a template or guidelines for writing a specific report section. Use this to ensure proper structure and content requirements.', {
    sectionType: zod_1.z.enum([
        'executive_summary',
        'study_design',
        'materials_methods',
        'pk_parameters',
        'tk_parameters',
        'results',
        'discussion',
        'conclusions',
        'tables'
    ]).describe('The type of section to get template for'),
    studyType: zod_1.z.string().optional().describe('Type of study (e.g., "Single Dose PK", "Repeat Dose TK")'),
    species: zod_1.z.string().optional().describe('Species (e.g., "rat", "dog", "monkey")')
}, async (args) => {
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
    const template = templates[args.sectionType] ||
        `Template for ${args.sectionType} not found. Please describe what content is needed.`;
    let contextualNotes = '';
    if (args.studyType) {
        contextualNotes += `\n\nStudy type context: ${args.studyType}`;
    }
    if (args.species) {
        contextualNotes += `\nSpecies: ${args.species}`;
    }
    return {
        content: [{
                type: 'text',
                text: template + contextualNotes
            }]
    };
});
// Calculate Statistics Tool - Compute PK statistics
const calculateStatsTool = (0, claude_agent_sdk_1.tool)('calculate_pk_stats', 'Calculate pharmacokinetic statistics from concentration-time data. Returns Mean, SD, %CV for the provided values.', {
    values: zod_1.z.array(zod_1.z.number()).describe('Array of numeric values'),
    parameterName: zod_1.z.string().optional().describe('Name of the parameter (for output formatting)'),
    decimalPlaces: zod_1.z.number().default(2).describe('Number of decimal places for output')
}, async (args) => {
    const values = args.values.filter(v => !isNaN(v) && v !== null);
    const n = values.length;
    if (n === 0) {
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({ error: 'No valid values provided' })
                }]
        };
    }
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1);
    const sd = Math.sqrt(variance);
    const cv = (sd / mean) * 100;
    const dp = args.decimalPlaces;
    const result = {
        parameter: args.parameterName || 'Value',
        n,
        mean: Number(mean.toFixed(dp)),
        sd: Number(sd.toFixed(dp)),
        cv: Number(cv.toFixed(1)),
        formatted: {
            meanCV: `${mean.toFixed(dp)} (${cv.toFixed(1)}%)`,
            meanSD: `${mean.toFixed(dp)} ± ${sd.toFixed(dp)}`
        }
    };
    return {
        content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2)
            }]
    };
});
/**
 * Create the PharmaScribe MCP Server with all custom tools
 */
function createPharmaScribeMcpServer() {
    return (0, claude_agent_sdk_1.createSdkMcpServer)({
        name: 'pharmascribe-tools',
        version: '1.0.0',
        tools: [
            recallMemoryTool,
            storeMemoryTool,
            qcCheckTool,
            getSectionTemplateTool,
            calculateStatsTool
        ]
    });
}
//# sourceMappingURL=mcp-tools.js.map