"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const tools_1 = require("./tools");
// Initialize Anthropic client
const anthropic = new sdk_1.default({
    apiKey: process.env.ANTHROPIC_API_KEY
});
// Model to use
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929';
// System prompt for the pharmaceutical report writing agent
const SYSTEM_PROMPT = `You are PharmaScribe, an expert pharmaceutical/toxicology report writer assistant. You help create and edit IND (Investigational New Drug) reports, specifically pharmacokinetic (PK) and toxicokinetic (TK) sections.

Your expertise includes:
- FDA regulatory writing standards (CTD format)
- Pharmacokinetic analysis and reporting
- Toxicology study interpretation
- Scientific writing best practices

## Available Tools
You have access to specialized pharmaceutical tools. Use them proactively:
- **recall_memory**: Retrieve previous decisions, preferences, and study facts
- **store_memory**: Save important decisions and preferences for future reference
- **run_qc_check**: Check content for terminology, formatting, and regulatory compliance
- **get_section_template**: Get templates and guidelines for standard report sections
- **calculate_pk_stats**: Compute Mean, SD, %CV from concentration data

## Key Terminology Rules
- For IV administration, use "distributed" not "infused"
- Use proper statistical notation: Mean (%CV) or Mean ± SD
- Species names should be lowercase (rat, dog, monkey)
- Follow FDA CTD format guidelines

## Workflow
1. When starting work on a report, use recall_memory to understand context and preferences
2. When the user makes a decision or expresses a preference, use store_memory to save it
3. Before finalizing content, use run_qc_check to validate terminology and formatting
4. Use get_section_template when creating new sections
5. Use calculate_pk_stats when computing statistical summaries

When making changes to report content, respond with a JSON block containing the changes:

\`\`\`json
{
  "changes": {
    "sections": [
      { "id": "section-id", "content": "new content here" }
    ],
    "tables": [
      { "id": "table-id", "caption": "...", "headers": [...], "data": [[...]] }
    ]
  },
  "explanation": "Brief explanation of changes made"
}
\`\`\`

Always maintain scientific accuracy and regulatory compliance. Be helpful, proactive about quality, and explain your reasoning.`;
// Maximum turns in the agentic loop
const MAX_TURNS = 10;
/**
 * Main Agent Orchestrator Lambda Handler
 * Uses Anthropic SDK with tool use in an agentic loop
 */
const handler = async (event) => {
    console.log('Agent Orchestrator invoked:', JSON.stringify(event, null, 2));
    try {
        const { action, reportId, message, section, context, qcFindings, conversationHistory } = event;
        if (!reportId) {
            return { success: false, error: 'Missing reportId' };
        }
        // Build the initial prompt
        const userPrompt = buildPrompt(action, message, section, context, qcFindings, conversationHistory, reportId);
        // Run the agentic loop
        const result = await runAgentLoop(userPrompt, reportId);
        return result;
    }
    catch (error) {
        console.error('Orchestrator error:', error);
        return {
            success: false,
            error: error.message || 'Internal orchestrator error'
        };
    }
};
exports.handler = handler;
/**
 * Run the agentic loop - agent uses tools until it produces a final response
 */
async function runAgentLoop(initialPrompt, reportId) {
    const messages = [
        { role: 'user', content: initialPrompt }
    ];
    let turns = 0;
    while (turns < MAX_TURNS) {
        turns++;
        console.log(`Agent turn ${turns}`);
        // Call Claude with tools
        const response = await anthropic.messages.create({
            model: MODEL,
            max_tokens: 8192,
            system: SYSTEM_PROMPT,
            tools: tools_1.PHARMA_TOOLS,
            messages
        });
        console.log(`Response stop_reason: ${response.stop_reason}`);
        // Check if we're done (no more tool use)
        if (response.stop_reason === 'end_turn') {
            // Extract the final text response
            const textContent = response.content.find(c => c.type === 'text');
            const finalText = textContent?.type === 'text' ? textContent.text : '';
            // Parse changes if present
            const changes = extractChanges(finalText);
            return {
                success: true,
                response: cleanResponse(finalText),
                changes: changes || undefined
            };
        }
        // Handle tool use
        if (response.stop_reason === 'tool_use') {
            // Add assistant's response (with tool calls) to messages
            messages.push({ role: 'assistant', content: response.content });
            // Execute each tool call
            const toolResults = [];
            for (const content of response.content) {
                if (content.type === 'tool_use') {
                    console.log(`Executing tool: ${content.name}`);
                    try {
                        const result = await (0, tools_1.executePharmaTool)(content.name, content.input, reportId);
                        toolResults.push({
                            type: 'tool_result',
                            tool_use_id: content.id,
                            content: JSON.stringify(result)
                        });
                    }
                    catch (error) {
                        toolResults.push({
                            type: 'tool_result',
                            tool_use_id: content.id,
                            content: JSON.stringify({ error: error.message }),
                            is_error: true
                        });
                    }
                }
            }
            // Add tool results to messages
            messages.push({ role: 'user', content: toolResults });
        }
        else {
            // Unexpected stop reason
            console.warn(`Unexpected stop_reason: ${response.stop_reason}`);
            break;
        }
    }
    // Max turns reached
    return {
        success: false,
        error: `Agent reached maximum turns (${MAX_TURNS}) without completing`
    };
}
/**
 * Build the prompt based on the action type
 */
function buildPrompt(action, message, section, context, qcFindings, conversationHistory, reportId) {
    const parts = [];
    // Add report context
    parts.push(`## Report Context (ID: ${reportId})`);
    if (context) {
        if (context.title)
            parts.push(`- Title: ${context.title}`);
        if (context.studyType)
            parts.push(`- Study Type: ${context.studyType}`);
        if (context.species)
            parts.push(`- Species: ${context.species}`);
        if (context.route)
            parts.push(`- Route: ${context.route}`);
    }
    // Add QC findings if present
    if (qcFindings && qcFindings.length > 0) {
        parts.push('\n## QC Findings to Address');
        for (const finding of qcFindings) {
            parts.push(`- [${finding.type.toUpperCase()}] ${finding.category}: ${finding.message}`);
            if (finding.suggestion)
                parts.push(`  → Suggestion: ${finding.suggestion}`);
        }
    }
    // Add conversation history summary
    if (conversationHistory && conversationHistory.length > 0) {
        parts.push('\n## Recent Conversation');
        const recentHistory = conversationHistory.slice(-4);
        for (const msg of recentHistory) {
            const role = msg.role === 'user' ? 'User' : 'Assistant';
            const content = msg.content.length > 300
                ? msg.content.substring(0, 300) + '...'
                : msg.content;
            parts.push(`**${role}:** ${content}`);
        }
    }
    // Add current sections context
    if (context?.sections && context.sections.length > 0) {
        parts.push('\n## Current Report Sections');
        for (const sec of context.sections.slice(0, 5)) {
            const preview = sec.content?.substring(0, 200) || 'No content';
            parts.push(`### ${sec.title || sec.id}\n${preview}...`);
        }
    }
    // Add action-specific instructions
    parts.push('\n## Your Task');
    switch (action) {
        case 'chat':
            parts.push('Respond to the user\'s message helpfully. Use your tools to recall context, check quality, and store important decisions.');
            parts.push(`\n**User Message:** ${message}`);
            break;
        case 'generate':
            parts.push('Generate content for the report. Use get_section_template for proper structure, recall_memory for context, and run_qc_check before finalizing.');
            if (section) {
                parts.push(`\n**Section to Generate:** ${section}`);
            }
            else {
                parts.push('\nGenerate all standard PK/TK report sections.');
            }
            break;
        case 'regenerate':
            parts.push(`Regenerate the "${section}" section with improvements. Consider previous decisions from memory and address any QC issues.`);
            parts.push('\nUse run_qc_check to validate the new content before returning it.');
            break;
        default:
            parts.push(`Unknown action: ${action}. Please respond with an error.`);
    }
    return parts.join('\n');
}
/**
 * Extract changes JSON from the agent response
 */
function extractChanges(text) {
    const jsonPatterns = [
        /```json\n([\s\S]*?)\n```/,
        /```\n?(\{[\s\S]*?\})\n?```/,
        /\{[\s\S]*"changes"[\s\S]*\}/
    ];
    for (const pattern of jsonPatterns) {
        const match = text.match(pattern);
        if (match) {
            try {
                const jsonStr = match[1] || match[0];
                const parsed = JSON.parse(jsonStr);
                return parsed.changes || null;
            }
            catch {
                continue;
            }
        }
    }
    return null;
}
/**
 * Clean the response by removing JSON blocks for display
 */
function cleanResponse(text) {
    return text.replace(/```json[\s\S]*?```/g, '').trim();
}
//# sourceMappingURL=index.js.map