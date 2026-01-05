"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeMemory = storeMemory;
exports.recallMemories = recallMemories;
exports.deleteMemories = deleteMemories;
exports.parseMemoryContent = parseMemoryContent;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const TABLE_NAME = process.env.DYNAMODB_MEMORY_TABLE || 'pharmascribe-agent-memory';
const client = new client_dynamodb_1.DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1'
});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client, {
    marshallOptions: {
        removeUndefinedValues: true
    }
});
/**
 * Store a memory
 */
async function storeMemory(reportId, memoryType, content, category, importance = 5, ttlDays = 90) {
    const now = new Date();
    const timestamp = now.toISOString();
    const memoryKey = `${memoryType}#${timestamp}`;
    const expiresAt = Math.floor(now.getTime() / 1000) + (ttlDays * 24 * 60 * 60);
    const memory = {
        reportId,
        memoryKey,
        memoryType,
        content: JSON.stringify(content),
        importance,
        category,
        createdAt: timestamp,
        expiresAt
    };
    await docClient.send(new lib_dynamodb_1.PutCommand({
        TableName: TABLE_NAME,
        Item: memory
    }));
    return memory;
}
/**
 * Recall memories for a report
 */
async function recallMemories(reportId, options = {}) {
    const { memoryTypes, categories, minImportance, limit = 50 } = options;
    const result = await docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'reportId = :reportId',
        ExpressionAttributeValues: {
            ':reportId': reportId
        },
        Limit: 200
    }));
    let memories = (result.Items || []);
    // Apply filters
    if (memoryTypes && memoryTypes.length > 0) {
        memories = memories.filter(m => memoryTypes.includes(m.memoryType));
    }
    if (categories && categories.length > 0) {
        memories = memories.filter(m => categories.includes(m.category));
    }
    if (minImportance !== undefined) {
        memories = memories.filter(m => m.importance >= minImportance);
    }
    // Sort by importance then by date
    memories.sort((a, b) => {
        if (b.importance !== a.importance) {
            return b.importance - a.importance;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return memories.slice(0, limit);
}
/**
 * Delete memories
 */
async function deleteMemories(reportId, memoryKey) {
    if (memoryKey) {
        await docClient.send(new lib_dynamodb_1.DeleteCommand({
            TableName: TABLE_NAME,
            Key: { reportId, memoryKey }
        }));
    }
    else {
        // Delete all memories for report
        const result = await docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: 'reportId = :reportId',
            ExpressionAttributeValues: { ':reportId': reportId },
            ProjectionExpression: 'reportId, memoryKey'
        }));
        const items = result.Items || [];
        if (items.length === 0)
            return;
        for (let i = 0; i < items.length; i += 25) {
            const batch = items.slice(i, i + 25);
            await docClient.send(new lib_dynamodb_1.BatchWriteCommand({
                RequestItems: {
                    [TABLE_NAME]: batch.map(item => ({
                        DeleteRequest: {
                            Key: { reportId: item.reportId, memoryKey: item.memoryKey }
                        }
                    }))
                }
            }));
        }
    }
}
/**
 * Parse memory content
 */
function parseMemoryContent(memory) {
    try {
        return JSON.parse(memory.content);
    }
    catch {
        return memory.content;
    }
}
//# sourceMappingURL=dynamodb-client.js.map