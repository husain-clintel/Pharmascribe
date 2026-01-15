import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  DeleteCommand,
  BatchWriteCommand
} from '@aws-sdk/lib-dynamodb'
import type {
  AgentMemory,
  MemoryType,
  MemoryCategory,
  StoreMemoryRequest,
  RecallMemoryRequest,
  RecallMemoryResponse
} from './types'

const TABLE_NAME = process.env.DYNAMODB_MEMORY_TABLE || 'aria-agent-memory'

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
})

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true
  }
})

/**
 * Store a memory in DynamoDB
 */
export async function storeMemory(request: StoreMemoryRequest): Promise<AgentMemory> {
  const now = new Date()
  const timestamp = now.toISOString()

  // Create memoryKey: TYPE#timestamp for time-based or TYPE#category for categorical
  const memoryKey = `${request.memoryType}#${timestamp}`

  // Calculate TTL (default 90 days)
  const ttlDays = request.ttlDays ?? 90
  const expiresAt = Math.floor(now.getTime() / 1000) + (ttlDays * 24 * 60 * 60)

  const memory: AgentMemory = {
    reportId: request.reportId,
    memoryKey,
    memoryType: request.memoryType,
    content: JSON.stringify(request.content),
    importance: request.importance ?? 5,
    category: request.category,
    createdAt: timestamp,
    expiresAt
  }

  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: memory
  }))

  return memory
}

/**
 * Recall memories from DynamoDB
 */
export async function recallMemory(request: RecallMemoryRequest): Promise<RecallMemoryResponse> {
  const { reportId, memoryTypes, categories, minImportance, limit = 50 } = request

  // Query all memories for this report
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'reportId = :reportId',
    ExpressionAttributeValues: {
      ':reportId': reportId
    },
    Limit: 200 // Fetch more than needed, then filter
  }))

  let memories = (result.Items || []) as AgentMemory[]

  // Apply filters
  if (memoryTypes && memoryTypes.length > 0) {
    memories = memories.filter(m => memoryTypes.includes(m.memoryType))
  }

  if (categories && categories.length > 0) {
    memories = memories.filter(m => categories.includes(m.category))
  }

  if (minImportance !== undefined) {
    memories = memories.filter(m => m.importance >= minImportance)
  }

  // Sort by importance (descending) then by createdAt (descending)
  memories.sort((a, b) => {
    if (b.importance !== a.importance) {
      return b.importance - a.importance
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  // Apply limit
  memories = memories.slice(0, limit)

  return {
    memories,
    count: memories.length
  }
}

/**
 * Delete a specific memory or all memories for a report
 */
export async function deleteMemory(reportId: string, memoryKey?: string): Promise<void> {
  if (memoryKey) {
    // Delete specific memory
    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        reportId,
        memoryKey
      }
    }))
  } else {
    // Delete all memories for report - first query, then batch delete
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'reportId = :reportId',
      ExpressionAttributeValues: {
        ':reportId': reportId
      },
      ProjectionExpression: 'reportId, memoryKey'
    }))

    const items = result.Items || []

    if (items.length === 0) return

    // Batch delete in groups of 25 (DynamoDB limit)
    for (let i = 0; i < items.length; i += 25) {
      const batch = items.slice(i, i + 25)
      await docClient.send(new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: batch.map(item => ({
            DeleteRequest: {
              Key: {
                reportId: item.reportId,
                memoryKey: item.memoryKey
              }
            }
          }))
        }
      }))
    }
  }
}

/**
 * Store a user decision
 */
export async function storeDecision(
  reportId: string,
  decision: string,
  section?: string,
  context?: string
): Promise<AgentMemory> {
  return storeMemory({
    reportId,
    memoryType: 'DECISION',
    content: { decision, section, context },
    importance: 9, // Decisions are high importance
    category: 'user_preference'
  })
}

/**
 * Store a fact extracted from documents
 */
export async function storeFact(
  reportId: string,
  fact: Record<string, any>,
  category: MemoryCategory = 'study_design'
): Promise<AgentMemory> {
  return storeMemory({
    reportId,
    memoryType: 'FACT',
    content: fact,
    importance: 8,
    category
  })
}

/**
 * Store study context (species, doses, route, etc.)
 */
export async function storeStudyContext(
  reportId: string,
  context: {
    species?: string
    doses?: number[]
    route?: string
    duration?: string
    groups?: string[]
    endpoints?: string[]
  }
): Promise<AgentMemory> {
  return storeMemory({
    reportId,
    memoryType: 'CONTEXT',
    content: { studyDesign: context },
    importance: 10, // Study context is critical
    category: 'study_design',
    ttlDays: 365 // Keep for 1 year
  })
}

/**
 * Store a conversation summary
 */
export async function storeSummary(
  reportId: string,
  topics: string[],
  decisions: { decision: string; section?: string }[],
  keyFacts: string[]
): Promise<AgentMemory> {
  return storeMemory({
    reportId,
    memoryType: 'SUMMARY',
    content: { topics, decisions, keyFacts },
    importance: 7,
    category: 'conversation'
  })
}

/**
 * Get high-priority memories for context assembly
 */
export async function getContextMemories(reportId: string): Promise<AgentMemory[]> {
  const result = await recallMemory({
    reportId,
    minImportance: 7,
    limit: 20
  })
  return result.memories
}

/**
 * Parse memory content from JSON string
 */
export function parseMemoryContent<T>(memory: AgentMemory): T {
  try {
    return JSON.parse(memory.content) as T
  } catch {
    return memory.content as unknown as T
  }
}
