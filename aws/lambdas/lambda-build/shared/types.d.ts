export type MemoryType = 'DECISION' | 'PREFERENCE' | 'FACT' | 'SUMMARY' | 'CONTEXT';
export type MemoryCategory = 'terminology' | 'formatting' | 'study_design' | 'conversation' | 'user_preference' | 'document_structure' | 'regulatory';
export interface AgentMemory {
    reportId: string;
    memoryKey: string;
    memoryType: MemoryType;
    content: string;
    importance: number;
    category: MemoryCategory;
    createdAt: string;
    expiresAt?: number;
}
export interface ReportContext {
    reportId: string;
    title: string;
    studyType: string;
    species?: string;
    route?: string;
    duration?: string;
    sections: Section[];
    tables: Table[];
    uploadedFiles: UploadedFile[];
}
export interface Section {
    id: string;
    title: string;
    content: string;
    order: number;
}
export interface Table {
    id: string;
    number: number;
    caption: string;
    headers: string[];
    data: string[][];
}
export interface UploadedFile {
    id: string;
    filename: string;
    extractedText?: string;
    metadata?: Record<string, any>;
}
export interface OrchestratorInput {
    action: 'chat' | 'generate' | 'regenerate';
    reportId: string;
    message?: string;
    section?: string;
    context?: ReportContext;
    qcFindings?: QCIssue[];
    conversationHistory?: ConversationMessage[];
}
export interface ConversationMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}
export interface ContextCompactionConfig {
    maxTokenEstimate: number;
    targetTokenEstimate: number;
    preserveRecentMessages: number;
}
export interface OrchestratorOutput {
    success: boolean;
    response?: string;
    changes?: ReportChanges;
    error?: string;
    contextCompacted?: boolean;
    compactedHistory?: ConversationMessage[];
}
export interface ReportChanges {
    sections?: {
        id: string;
        content: string;
    }[];
    tables?: Table[];
    newTables?: Table[];
}
export interface MemoryManagerInput {
    action: 'recall' | 'store' | 'summarize';
    reportId: string;
    query?: string;
    memory?: {
        type: MemoryType;
        content: any;
        importance?: number;
        category: MemoryCategory;
    };
}
export interface MemoryManagerOutput {
    success: boolean;
    memories?: AgentMemory[];
    storedMemory?: AgentMemory;
    error?: string;
}
export interface SectionWriterInput {
    reportId: string;
    sectionId: string;
    sectionType: string;
    context: ReportContext;
    memories: AgentMemory[];
    instructions?: string;
}
export interface SectionWriterOutput {
    success: boolean;
    content?: string;
    error?: string;
}
export interface TableGeneratorInput {
    reportId: string;
    tableType: string;
    sourceData: any;
    context: ReportContext;
    format?: 'mean_cv' | 'individual' | 'summary';
}
export interface TableGeneratorOutput {
    success: boolean;
    table?: Table;
    error?: string;
}
export interface QCAgentInput {
    reportId: string;
    content: ReportContext;
    checkTypes?: ('terminology' | 'formatting' | 'consistency' | 'regulatory')[];
}
export interface QCIssue {
    type: 'error' | 'warning' | 'suggestion';
    category: string;
    location: string;
    message: string;
    suggestion?: string;
}
export interface QCAgentOutput {
    success: boolean;
    issues?: QCIssue[];
    score?: number;
    error?: string;
}
export interface BedrockMessage {
    role: 'user' | 'assistant';
    content: string;
}
export interface BedrockRequest {
    modelId: string;
    messages: BedrockMessage[];
    system?: string;
    maxTokens?: number;
    temperature?: number;
}
//# sourceMappingURL=types.d.ts.map