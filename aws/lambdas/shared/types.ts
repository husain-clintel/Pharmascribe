// Shared types for Lambda functions

export type MemoryType = 'DECISION' | 'PREFERENCE' | 'FACT' | 'SUMMARY' | 'CONTEXT' | 'ISSUE' | 'CORRECTION'

export type MemoryCategory =
  | 'terminology'
  | 'formatting'
  | 'study_design'
  | 'conversation'
  | 'user_preference'
  | 'document_structure'
  | 'regulatory'
  | 'data_stratification'
  | 'cross_reference'

export interface AgentMemory {
  reportId: string
  memoryKey: string
  memoryType: MemoryType
  content: string
  importance: number
  category: MemoryCategory
  createdAt: string
  expiresAt?: number
  relatedSections?: string[]
}

export interface ReportContext {
  reportId: string
  title: string
  studyType: string
  species?: string
  route?: string
  duration?: string
  sections: Section[]
  tables: Table[]
  uploadedFiles: UploadedFile[]
}

export interface Section {
  id: string
  title: string
  content: string
  order: number
}

export interface Table {
  id: string
  number: number
  caption: string
  headers: string[]
  data: string[][]
}

export interface UploadedFile {
  id: string
  filename: string
  extractedText?: string
  metadata?: Record<string, any>
}

// Agent Orchestrator Types
export interface OrchestratorInput {
  action: 'chat' | 'generate' | 'regenerate'
  reportId: string
  message?: string
  section?: string
  context?: ReportContext
  // QC findings from previous operations
  qcFindings?: QCIssue[]
  // Conversation history for context management
  conversationHistory?: ConversationMessage[]
  // Response to a previous question from the agent
  questionResponse?: {
    questionId: string
    answer: string | string[]
  }
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

// Context compaction settings
export interface ContextCompactionConfig {
  maxTokenEstimate: number  // Trigger compaction above this
  targetTokenEstimate: number  // Target size after compaction
  preserveRecentMessages: number  // Keep last N messages uncompacted
}

export interface OrchestratorOutput {
  success: boolean
  response?: string
  changes?: ReportChanges
  error?: string
  // Context management
  contextCompacted?: boolean
  compactedHistory?: ConversationMessage[]
  // Agent is asking a question
  question?: AgentQuestion
  requiresInput?: boolean
  // Step-by-step summary of actions taken
  stepSummary?: {
    stepsCompleted: StepSummary[]
    totalSteps?: number
    issuesFound?: number
    issuesResolved?: number
  }
  // Execution metadata for thoroughness tracking
  metadata?: {
    turns: number
    toolsUsed: string[]
    hadExtendedThinking: boolean
    pausedForQuestion?: boolean
  }
}

// Agent question for clarification
export interface AgentQuestion {
  question: string
  options: QuestionOption[]
  allowCustom?: boolean
  allowMultiple?: boolean
  context?: string
  category?: 'formatting' | 'terminology' | 'data' | 'preference' | 'clarification' | 'priority'
}

export interface QuestionOption {
  id: string
  label: string
  description?: string
}

export interface StepSummary {
  step: number
  action: string
  findings?: string[]
  changes?: string[]
}

export interface ReportChanges {
  sections?: { id: string; content: string }[]
  tables?: Table[]
  newTables?: Table[]
}

// Memory Manager Types
export interface MemoryManagerInput {
  action: 'recall' | 'store' | 'summarize'
  reportId: string
  query?: string
  memory?: {
    type: MemoryType
    content: any
    importance?: number
    category: MemoryCategory
  }
}

export interface MemoryManagerOutput {
  success: boolean
  memories?: AgentMemory[]
  storedMemory?: AgentMemory
  error?: string
}

// Section Writer Types
export interface SectionWriterInput {
  reportId: string
  sectionId: string
  sectionType: string
  context: ReportContext
  memories: AgentMemory[]
  instructions?: string
}

export interface SectionWriterOutput {
  success: boolean
  content?: string
  error?: string
}

// Table Generator Types
export interface TableGeneratorInput {
  reportId: string
  tableType: string
  sourceData: any
  context: ReportContext
  format?: 'mean_cv' | 'individual' | 'summary'
}

export interface TableGeneratorOutput {
  success: boolean
  table?: Table
  error?: string
}

// QC Agent Types
export interface QCAgentInput {
  reportId: string
  content: ReportContext
  checkTypes?: ('terminology' | 'formatting' | 'consistency' | 'regulatory')[]
}

export interface QCIssue {
  type: 'error' | 'warning' | 'suggestion'
  category: string
  location: string
  message: string
  suggestion?: string
}

export interface QCAgentOutput {
  success: boolean
  issues?: QCIssue[]
  score?: number
  error?: string
}

// Bedrock Types
export interface BedrockMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface BedrockRequest {
  modelId: string
  messages: BedrockMessage[]
  system?: string
  maxTokens?: number
  temperature?: number
}
