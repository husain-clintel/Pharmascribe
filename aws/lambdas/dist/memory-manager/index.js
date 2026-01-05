"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// memory-manager/index.ts
var memory_manager_exports = {};
__export(memory_manager_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(memory_manager_exports);

// shared/bedrock-client.ts
var import_client_bedrock_runtime = require("@aws-sdk/client-bedrock-runtime");
var client = new import_client_bedrock_runtime.BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1"
});
var CLAUDE_OPUS = "anthropic.claude-opus-4-5-20251101-v1:0";
var CLAUDE_HAIKU = "anthropic.claude-haiku-4-5-20251001-v1:0";
var DEFAULT_MODEL = CLAUDE_OPUS;
async function invokeClaudeAsync(messages, options = {}) {
  const {
    modelId = DEFAULT_MODEL,
    system,
    maxTokens = 4096,
    temperature = 0.7
  } = options;
  const requestBody = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: maxTokens,
    temperature,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content
    })),
    ...system && { system }
  };
  const command = new import_client_bedrock_runtime.InvokeModelCommand({
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(requestBody)
  });
  const response = await client.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  if (responseBody.content && responseBody.content.length > 0) {
    const textBlock = responseBody.content.find((block) => block.type === "text");
    return textBlock?.text || "";
  }
  return "";
}

// shared/dynamodb-client.ts
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var import_lib_dynamodb = require("@aws-sdk/lib-dynamodb");
var TABLE_NAME = process.env.DYNAMODB_MEMORY_TABLE || "pharmascribe-agent-memory";
var client2 = new import_client_dynamodb.DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1"
});
var docClient = import_lib_dynamodb.DynamoDBDocumentClient.from(client2, {
  marshallOptions: {
    removeUndefinedValues: true
  }
});
async function storeMemory(reportId, memoryType, content, category, importance = 5, ttlDays = 90) {
  const now = /* @__PURE__ */ new Date();
  const timestamp = now.toISOString();
  const memoryKey = `${memoryType}#${timestamp}`;
  const expiresAt = Math.floor(now.getTime() / 1e3) + ttlDays * 24 * 60 * 60;
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
  await docClient.send(new import_lib_dynamodb.PutCommand({
    TableName: TABLE_NAME,
    Item: memory
  }));
  return memory;
}
async function recallMemories(reportId, options = {}) {
  const { memoryTypes, categories, minImportance, limit = 50 } = options;
  const result = await docClient.send(new import_lib_dynamodb.QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: "reportId = :reportId",
    ExpressionAttributeValues: {
      ":reportId": reportId
    },
    Limit: 200
  }));
  let memories = result.Items || [];
  if (memoryTypes && memoryTypes.length > 0) {
    memories = memories.filter((m) => memoryTypes.includes(m.memoryType));
  }
  if (categories && categories.length > 0) {
    memories = memories.filter((m) => categories.includes(m.category));
  }
  if (minImportance !== void 0) {
    memories = memories.filter((m) => m.importance >= minImportance);
  }
  memories.sort((a, b) => {
    if (b.importance !== a.importance) {
      return b.importance - a.importance;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  return memories.slice(0, limit);
}
async function deleteMemories(reportId, memoryKey) {
  if (memoryKey) {
    await docClient.send(new import_lib_dynamodb.DeleteCommand({
      TableName: TABLE_NAME,
      Key: { reportId, memoryKey }
    }));
  } else {
    const result = await docClient.send(new import_lib_dynamodb.QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "reportId = :reportId",
      ExpressionAttributeValues: { ":reportId": reportId },
      ProjectionExpression: "reportId, memoryKey"
    }));
    const items = result.Items || [];
    if (items.length === 0)
      return;
    for (let i = 0; i < items.length; i += 25) {
      const batch = items.slice(i, i + 25);
      await docClient.send(new import_lib_dynamodb.BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: batch.map((item) => ({
            DeleteRequest: {
              Key: { reportId: item.reportId, memoryKey: item.memoryKey }
            }
          }))
        }
      }));
    }
  }
}
function parseMemoryContent(memory) {
  try {
    return JSON.parse(memory.content);
  } catch {
    return memory.content;
  }
}

// memory-manager/index.ts
var handler = async (event) => {
  console.log("Memory Manager invoked:", JSON.stringify(event, null, 2));
  try {
    const { action, reportId, query, memory } = event;
    if (!reportId) {
      return { success: false, error: "Missing reportId" };
    }
    switch (action) {
      case "recall":
        return await handleRecall(reportId, query);
      case "store":
        if (!memory) {
          return { success: false, error: "Missing memory data for store action" };
        }
        return await handleStore(reportId, memory);
      case "summarize":
        return await handleSummarize(reportId);
      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  } catch (error) {
    console.error("Memory Manager error:", error);
    return {
      success: false,
      error: error.message || "Internal memory manager error"
    };
  }
};
async function handleRecall(reportId, query) {
  const memories = await recallMemories(reportId, {
    minImportance: 5,
    limit: 30
  });
  if (!query || memories.length === 0) {
    return { success: true, memories };
  }
  const memoryDescriptions = memories.map((m, i) => {
    const content = parseMemoryContent(m);
    return `[${i}] ${m.memoryType}: ${JSON.stringify(content)}`;
  }).join("\n");
  const filterPrompt = `Given the following query and memories, return the indices of the most relevant memories (comma-separated numbers).

Query: "${query}"

Memories:
${memoryDescriptions}

Return only the relevant indices (e.g., "0,2,5" or "none" if none are relevant):`;
  const response = await invokeClaudeAsync(
    [{ role: "user", content: filterPrompt }],
    { modelId: CLAUDE_HAIKU, maxTokens: 100 }
  );
  const indexStr = response.trim().toLowerCase();
  if (indexStr === "none" || !indexStr) {
    return { success: true, memories: [] };
  }
  const indices = indexStr.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n) && n >= 0 && n < memories.length);
  const relevantMemories = indices.map((i) => memories[i]);
  return { success: true, memories: relevantMemories };
}
async function handleStore(reportId, memory) {
  const storedMemory = await storeMemory(
    reportId,
    memory.type,
    memory.content,
    memory.category,
    memory.importance || 5
  );
  return { success: true, storedMemory };
}
async function handleSummarize(reportId) {
  const memories = await recallMemories(reportId, { limit: 100 });
  if (memories.length < 20) {
    return { success: true, memories };
  }
  const decisions = memories.filter((m) => m.memoryType === "DECISION");
  const facts = memories.filter((m) => m.memoryType === "FACT");
  const preferences = memories.filter((m) => m.memoryType === "PREFERENCE");
  if (decisions.length > 10) {
    const decisionsText = decisions.map((d) => parseMemoryContent(d)).map((c) => c.decision || JSON.stringify(c)).join("\n- ");
    const summaryPrompt = `Summarize the following user decisions into 3-5 key themes:

Decisions:
- ${decisionsText}

Return a JSON array of summary strings:`;
    const response = await invokeClaudeAsync(
      [{ role: "user", content: summaryPrompt }],
      { modelId: CLAUDE_HAIKU, maxTokens: 500 }
    );
    try {
      const summaries = JSON.parse(response);
      if (Array.isArray(summaries)) {
        await storeMemory(
          reportId,
          "SUMMARY",
          {
            type: "decision_summary",
            summaries,
            originalCount: decisions.length,
            summarizedAt: (/* @__PURE__ */ new Date()).toISOString()
          },
          "conversation",
          8,
          365
          // Keep summaries for a year
        );
        const toDelete = decisions.sort((a, b) => b.importance - a.importance).slice(5);
        for (const mem of toDelete) {
          await deleteMemories(reportId, mem.memoryKey);
        }
      }
    } catch (e) {
      console.error("Failed to parse summary:", e);
    }
  }
  const updatedMemories = await recallMemories(reportId, { limit: 30 });
  return { success: true, memories: updatedMemories };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
