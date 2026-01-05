import type { BedrockMessage } from './types';
export declare const CLAUDE_OPUS = "anthropic.claude-opus-4-5-20251101-v1:0";
export declare const CLAUDE_SONNET = "anthropic.claude-sonnet-4-20250514-v1:0";
export declare const CLAUDE_HAIKU = "anthropic.claude-haiku-4-5-20251001-v1:0";
export declare const DEFAULT_MODEL = "anthropic.claude-opus-4-5-20251101-v1:0";
interface InvokeOptions {
    modelId?: string;
    system?: string;
    maxTokens?: number;
    temperature?: number;
}
/**
 * Invoke Claude via AWS Bedrock
 */
export declare function invokeClaudeAsync(messages: BedrockMessage[], options?: InvokeOptions): Promise<string>;
/**
 * Extract JSON from Claude response
 */
export declare function extractJSON<T>(text: string): T | null;
/**
 * Format context for Claude prompt
 */
export declare function formatContextForPrompt(context: {
    reportTitle?: string;
    studyType?: string;
    species?: string;
    route?: string;
    sections?: {
        id: string;
        title: string;
        content: string;
    }[];
    memories?: {
        type: string;
        content: string;
    }[];
}): string;
export {};
//# sourceMappingURL=bedrock-client.d.ts.map