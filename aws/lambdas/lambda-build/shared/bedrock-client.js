"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_MODEL = exports.CLAUDE_HAIKU = exports.CLAUDE_SONNET = exports.CLAUDE_OPUS = void 0;
exports.invokeClaudeAsync = invokeClaudeAsync;
exports.extractJSON = extractJSON;
exports.formatContextForPrompt = formatContextForPrompt;
const client_bedrock_runtime_1 = require("@aws-sdk/client-bedrock-runtime");
const client = new client_bedrock_runtime_1.BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1'
});
// Model IDs - Using Claude Opus 4.5 for best quality
exports.CLAUDE_OPUS = 'anthropic.claude-opus-4-5-20251101-v1:0';
exports.CLAUDE_SONNET = 'anthropic.claude-sonnet-4-20250514-v1:0';
exports.CLAUDE_HAIKU = 'anthropic.claude-haiku-4-5-20251001-v1:0';
// Default to Opus 4.5 for main agent tasks
exports.DEFAULT_MODEL = exports.CLAUDE_OPUS;
/**
 * Invoke Claude via AWS Bedrock
 */
async function invokeClaudeAsync(messages, options = {}) {
    const { modelId = exports.DEFAULT_MODEL, system, maxTokens = 4096, temperature = 0.7 } = options;
    const requestBody = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: maxTokens,
        temperature,
        messages: messages.map(m => ({
            role: m.role,
            content: m.content
        })),
        ...(system && { system })
    };
    const command = new client_bedrock_runtime_1.InvokeModelCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(requestBody)
    });
    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    // Extract text from response
    if (responseBody.content && responseBody.content.length > 0) {
        const textBlock = responseBody.content.find((block) => block.type === 'text');
        return textBlock?.text || '';
    }
    return '';
}
/**
 * Extract JSON from Claude response
 */
function extractJSON(text) {
    // Try to find JSON in code blocks first
    const jsonPatterns = [
        /```json\n([\s\S]*?)\n```/,
        /```\n?([\s\S]*?)\n?```/,
        /\{[\s\S]*\}/
    ];
    for (const pattern of jsonPatterns) {
        const match = text.match(pattern);
        if (match) {
            try {
                const jsonStr = match[1] || match[0];
                return JSON.parse(jsonStr);
            }
            catch {
                continue;
            }
        }
    }
    return null;
}
/**
 * Format context for Claude prompt
 */
function formatContextForPrompt(context) {
    const parts = [];
    if (context.reportTitle) {
        parts.push(`## Report: ${context.reportTitle}`);
    }
    if (context.studyType || context.species || context.route) {
        parts.push(`## Study Details`);
        if (context.studyType)
            parts.push(`- Type: ${context.studyType}`);
        if (context.species)
            parts.push(`- Species: ${context.species}`);
        if (context.route)
            parts.push(`- Route: ${context.route}`);
    }
    if (context.memories && context.memories.length > 0) {
        parts.push(`\n## Previous Decisions & Context`);
        for (const mem of context.memories) {
            parts.push(`- [${mem.type}] ${mem.content}`);
        }
    }
    if (context.sections && context.sections.length > 0) {
        parts.push(`\n## Current Report Sections`);
        for (const section of context.sections) {
            parts.push(`### ${section.title}`);
            parts.push(section.content.substring(0, 500) + (section.content.length > 500 ? '...' : ''));
        }
    }
    return parts.join('\n');
}
//# sourceMappingURL=bedrock-client.js.map