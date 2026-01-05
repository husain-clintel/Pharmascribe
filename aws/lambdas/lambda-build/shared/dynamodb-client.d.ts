import type { AgentMemory, MemoryType, MemoryCategory } from './types';
/**
 * Store a memory
 */
export declare function storeMemory(reportId: string, memoryType: MemoryType, content: any, category: MemoryCategory, importance?: number, ttlDays?: number): Promise<AgentMemory>;
/**
 * Recall memories for a report
 */
export declare function recallMemories(reportId: string, options?: {
    memoryTypes?: MemoryType[];
    categories?: MemoryCategory[];
    minImportance?: number;
    limit?: number;
}): Promise<AgentMemory[]>;
/**
 * Delete memories
 */
export declare function deleteMemories(reportId: string, memoryKey?: string): Promise<void>;
/**
 * Parse memory content
 */
export declare function parseMemoryContent<T>(memory: AgentMemory): T;
//# sourceMappingURL=dynamodb-client.d.ts.map