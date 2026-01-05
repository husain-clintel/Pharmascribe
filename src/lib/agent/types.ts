// Agent Memory Types for DynamoDB

export type MemoryType = 'DECISION' | 'PREFERENCE' | 'FACT' | 'SUMMARY' | 'CONTEXT'

export type MemoryCategory =
  | 'terminology'
  | 'formatting'
  | 'study_design'
  | 'conversation'
  | 'user_preference'
  | 'document_structure'
  | 'regulatory'

export interface AgentMemory {
  reportId: string
  memoryKey: string // Format: MEMORYTYPE#timestamp or MEMORYTYPE#category
  memoryType: MemoryType
  content: string // JSON stringified content
  importance: number // 1-10, higher = more important for retrieval
  category: MemoryCategory
  createdAt: string // ISO timestamp
  expiresAt?: number // Unix epoch seconds for TTL
}

// Content structures for different memory types
export interface DecisionContent {
  decision: string
  section?: string
  context?: string
  alternatives?: string[]
}

export interface PreferenceContent {
  preference: string
  type: 'formatting' | 'terminology' | 'style'
  examples?: string[]
}

export interface FactContent {
  fact: string
  source?: string
  confidence?: number
  [key: string]: any // Allow flexible fact structures
}

export interface SummaryContent {
  topics: string[]
  decisions: DecisionContent[]
  keyFacts: string[]
  conversationId?: string
}

export interface ContextContent {
  studyDesign?: {
    species?: string
    doses?: number[]
    route?: string
    duration?: string
    groups?: string[]
  }
  endpoints?: string[]
  findings?: string[]
  sections?: string[]
}

// API request/response types
export interface StoreMemoryRequest {
  reportId: string
  memoryType: MemoryType
  content: DecisionContent | PreferenceContent | FactContent | SummaryContent | ContextContent
  importance?: number
  category: MemoryCategory
  ttlDays?: number // Days until expiration, default 90
}

export interface RecallMemoryRequest {
  reportId: string
  memoryTypes?: MemoryType[]
  categories?: MemoryCategory[]
  minImportance?: number
  limit?: number
}

export interface RecallMemoryResponse {
  memories: AgentMemory[]
  count: number
}

export interface DeleteMemoryRequest {
  reportId: string
  memoryKey?: string // If not provided, deletes all memories for report
}

// Agent chat context
export interface AgentContext {
  reportId: string
  memories: AgentMemory[]
  currentSection?: string
  recentMessages?: { role: 'user' | 'assistant'; content: string }[]
}
