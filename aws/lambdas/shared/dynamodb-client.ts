import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  DeleteCommand,
  BatchWriteCommand
} from '@aws-sdk/lib-dynamodb'
import type { AgentMemory, MemoryType, MemoryCategory } from './types'

const TABLE_NAME = process.env.DYNAMODB_MEMORY_TABLE || 'pharmascribe-agent-memory'

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1'
})

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true
  }
})

/**
 * Store a memory
 */
export async function storeMemory(
  reportId: string,
  memoryType: MemoryType,
  content: any,
  category: MemoryCategory,
  importance: number = 5,
  ttlDays: number = 90
): Promise<AgentMemory> {
  const now = new Date()
  const timestamp = now.toISOString()
  const memoryKey = `${memoryType}#${timestamp}`
  const expiresAt = Math.floor(now.getTime() / 1000) + (ttlDays * 24 * 60 * 60)

  const memory: AgentMemory = {
    reportId,
    memoryKey,
    memoryType,
    content: JSON.stringify(content),
    importance,
    category,
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
 * Recall memories for a report
 */
export async function recallMemories(
  reportId: string,
  options: {
    memoryTypes?: MemoryType[]
    categories?: MemoryCategory[]
    minImportance?: number
    limit?: number
  } = {}
): Promise<AgentMemory[]> {
  const { memoryTypes, categories, minImportance, limit = 50 } = options

  const result = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'reportId = :reportId',
    ExpressionAttributeValues: {
      ':reportId': reportId
    },
    Limit: 200
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

  // Sort by importance then by date
  memories.sort((a, b) => {
    if (b.importance !== a.importance) {
      return b.importance - a.importance
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return memories.slice(0, limit)
}

/**
 * Delete memories
 */
export async function deleteMemories(
  reportId: string,
  memoryKey?: string
): Promise<void> {
  if (memoryKey) {
    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { reportId, memoryKey }
    }))
  } else {
    // Delete all memories for report
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'reportId = :reportId',
      ExpressionAttributeValues: { ':reportId': reportId },
      ProjectionExpression: 'reportId, memoryKey'
    }))

    const items = result.Items || []
    if (items.length === 0) return

    for (let i = 0; i < items.length; i += 25) {
      const batch = items.slice(i, i + 25)
      await docClient.send(new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: batch.map(item => ({
            DeleteRequest: {
              Key: { reportId: item.reportId, memoryKey: item.memoryKey }
            }
          }))
        }
      }))
    }
  }
}

/**
 * Parse memory content
 */
export function parseMemoryContent<T>(memory: AgentMemory): T {
  try {
    return JSON.parse(memory.content) as T
  } catch {
    return memory.content as unknown as T
  }
}
