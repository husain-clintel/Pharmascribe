import type { Handler } from 'aws-lambda'
import { invokeClaudeAsync, CLAUDE_HAIKU } from '../shared/bedrock-client'
import {
  recallMemories,
  storeMemory,
  deleteMemories,
  parseMemoryContent
} from '../shared/dynamodb-client'
import type {
  MemoryManagerInput,
  MemoryManagerOutput,
  AgentMemory
} from '../shared/types'

/**
 * Memory Manager Lambda Handler
 * Handles recall, store, and summarize operations for agent memory
 */
export const handler: Handler<MemoryManagerInput, MemoryManagerOutput> = async (event) => {
  console.log('Memory Manager invoked:', JSON.stringify(event, null, 2))

  try {
    const { action, reportId, query, memory } = event

    if (!reportId) {
      return { success: false, error: 'Missing reportId' }
    }

    switch (action) {
      case 'recall':
        return await handleRecall(reportId, query)

      case 'store':
        if (!memory) {
          return { success: false, error: 'Missing memory data for store action' }
        }
        return await handleStore(reportId, memory)

      case 'summarize':
        return await handleSummarize(reportId)

      default:
        return { success: false, error: `Unknown action: ${action}` }
    }
  } catch (error: any) {
    console.error('Memory Manager error:', error)
    return {
      success: false,
      error: error.message || 'Internal memory manager error'
    }
  }
}

/**
 * Recall memories with optional semantic filtering
 */
async function handleRecall(
  reportId: string,
  query?: string
): Promise<MemoryManagerOutput> {
  // Get all high-importance memories
  const memories = await recallMemories(reportId, {
    minImportance: 5,
    limit: 30
  })

  if (!query || memories.length === 0) {
    return { success: true, memories }
  }

  // Use Claude Haiku for semantic relevance filtering if query provided
  const memoryDescriptions = memories.map((m, i) => {
    const content = parseMemoryContent<any>(m)
    return `[${i}] ${m.memoryType}: ${JSON.stringify(content)}`
  }).join('\n')

  const filterPrompt = `Given the following query and memories, return the indices of the most relevant memories (comma-separated numbers).

Query: "${query}"

Memories:
${memoryDescriptions}

Return only the relevant indices (e.g., "0,2,5" or "none" if none are relevant):`

  const response = await invokeClaudeAsync(
    [{ role: 'user', content: filterPrompt }],
    { modelId: CLAUDE_HAIKU, maxTokens: 100 }
  )

  // Parse the response to get indices
  const indexStr = response.trim().toLowerCase()
  if (indexStr === 'none' || !indexStr) {
    return { success: true, memories: [] }
  }

  const indices = indexStr
    .split(',')
    .map(s => parseInt(s.trim()))
    .filter(n => !isNaN(n) && n >= 0 && n < memories.length)

  const relevantMemories = indices.map(i => memories[i])

  return { success: true, memories: relevantMemories }
}

/**
 * Store a new memory
 */
async function handleStore(
  reportId: string,
  memory: {
    type: any
    content: any
    importance?: number
    category: any
  }
): Promise<MemoryManagerOutput> {
  const storedMemory = await storeMemory(
    reportId,
    memory.type,
    memory.content,
    memory.category,
    memory.importance || 5
  )

  return { success: true, storedMemory }
}

/**
 * Summarize and compress old memories
 * This helps manage memory size over time
 */
async function handleSummarize(reportId: string): Promise<MemoryManagerOutput> {
  // Get all memories sorted by date
  const memories = await recallMemories(reportId, { limit: 100 })

  if (memories.length < 20) {
    // Not enough memories to warrant summarization
    return { success: true, memories }
  }

  // Group memories by type
  const decisions = memories.filter(m => m.memoryType === 'DECISION')
  const facts = memories.filter(m => m.memoryType === 'FACT')
  const preferences = memories.filter(m => m.memoryType === 'PREFERENCE')

  // Summarize decisions if there are many
  if (decisions.length > 10) {
    const decisionsText = decisions
      .map(d => parseMemoryContent<any>(d))
      .map(c => c.decision || JSON.stringify(c))
      .join('\n- ')

    const summaryPrompt = `Summarize the following user decisions into 3-5 key themes:

Decisions:
- ${decisionsText}

Return a JSON array of summary strings:`

    const response = await invokeClaudeAsync(
      [{ role: 'user', content: summaryPrompt }],
      { modelId: CLAUDE_HAIKU, maxTokens: 500 }
    )

    try {
      const summaries = JSON.parse(response)
      if (Array.isArray(summaries)) {
        // Store summary
        await storeMemory(
          reportId,
          'SUMMARY',
          {
            type: 'decision_summary',
            summaries,
            originalCount: decisions.length,
            summarizedAt: new Date().toISOString()
          },
          'conversation',
          8,
          365 // Keep summaries for a year
        )

        // Delete old low-importance decisions (keep top 5)
        const toDelete = decisions
          .sort((a, b) => b.importance - a.importance)
          .slice(5)

        for (const mem of toDelete) {
          await deleteMemories(reportId, mem.memoryKey)
        }
      }
    } catch (e) {
      console.error('Failed to parse summary:', e)
    }
  }

  // Return updated memories
  const updatedMemories = await recallMemories(reportId, { limit: 30 })
  return { success: true, memories: updatedMemories }
}
