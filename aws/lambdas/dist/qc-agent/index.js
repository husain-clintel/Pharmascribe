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

// qc-agent/index.ts
var qc_agent_exports = {};
__export(qc_agent_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(qc_agent_exports);

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
function extractJSON(text) {
  const jsonPatterns = [
    /```json\n([\s\S]*?)\n```/,
    /```\n?([\s\S]*?)\n?```/,
    /\{[\s\S]*\}/
  ];
  for (const pattern of jsonPatterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const jsonStr = match[1] || match[0];
        return JSON.parse(jsonStr);
      } catch {
        continue;
      }
    }
  }
  return null;
}

// qc-agent/index.ts
var TERMINOLOGY_RULES = [
  { pattern: /\binfused\b/gi, issue: 'Use "distributed" instead of "infused" for IV administration', replacement: "distributed" },
  { pattern: /\badministrated\b/gi, issue: 'Use "administered" instead of "administrated"', replacement: "administered" },
  { pattern: /\bper oral\b/gi, issue: 'Use "oral" or "PO" instead of "per oral"', replacement: "oral" },
  { pattern: /\bi\.v\.\b/gi, issue: 'Use "IV" instead of "i.v."', replacement: "IV" },
  { pattern: /\bi\.m\.\b/gi, issue: 'Use "IM" instead of "i.m."', replacement: "IM" },
  { pattern: /\bs\.c\.\b/gi, issue: 'Use "SC" instead of "s.c."', replacement: "SC" }
];
var FORMATTING_RULES = [
  { pattern: /\d+\s*\+\/-\s*\d+/g, issue: 'Use "\xB1" symbol instead of "+/-" for statistical notation' },
  { pattern: /\bng\/ml\b/gi, issue: 'Use "ng/mL" with capital L for liter' },
  { pattern: /\bug\/ml\b/gi, issue: 'Use "\u03BCg/mL" with \u03BC symbol and capital L' },
  { pattern: /\bhr\b/g, issue: 'Use "h" instead of "hr" for hours in scientific notation' },
  { pattern: /\bhrs\b/gi, issue: 'Use "h" instead of "hrs" for hours' },
  { pattern: /\bmin\b(?!imum|imal)/gi, issue: 'Consider using "min" consistently for minutes' }
];
var CONSISTENCY_CHECKS = [
  "Verify dose units are consistent throughout (mg/kg or mg/m\xB2)",
  "Check that species name is spelled consistently",
  "Ensure PK parameter abbreviations are defined on first use",
  "Verify statistical method is stated (Mean \xB1 SD or Mean (%CV))"
];
var SYSTEM_PROMPT = `You are a quality control specialist for pharmaceutical regulatory documents. Your job is to identify issues in IND report content.

For each issue found, provide:
1. Type: error, warning, or suggestion
2. Category: terminology, formatting, consistency, or regulatory
3. Location: section or table where found
4. Message: description of the issue
5. Suggestion: how to fix it

Return issues as a JSON array.`;
var handler = async (event) => {
  console.log("QC Agent invoked:", JSON.stringify(event, null, 2));
  try {
    const { reportId, content, checkTypes = ["terminology", "formatting", "consistency", "regulatory"] } = event;
    if (!reportId || !content) {
      return { success: false, error: "Missing required parameters" };
    }
    const issues = [];
    if (content.sections) {
      for (const section of content.sections) {
        if (checkTypes.includes("terminology")) {
          for (const rule of TERMINOLOGY_RULES) {
            const matches = section.content.match(rule.pattern);
            if (matches) {
              issues.push({
                type: "warning",
                category: "terminology",
                location: `Section: ${section.title}`,
                message: rule.issue,
                suggestion: `Replace with "${rule.replacement}"`
              });
            }
          }
        }
        if (checkTypes.includes("formatting")) {
          for (const rule of FORMATTING_RULES) {
            const matches = section.content.match(rule.pattern);
            if (matches) {
              issues.push({
                type: "warning",
                category: "formatting",
                location: `Section: ${section.title}`,
                message: rule.issue
              });
            }
          }
        }
      }
    }
    if (checkTypes.includes("consistency") || checkTypes.includes("regulatory")) {
      const aiIssues = await runAIChecks(content, checkTypes);
      issues.push(...aiIssues);
    }
    const score = calculateScore(issues);
    return {
      success: true,
      issues,
      score
    };
  } catch (error) {
    console.error("QC Agent error:", error);
    return {
      success: false,
      error: error.message || "QC check failed"
    };
  }
};
async function runAIChecks(content, checkTypes) {
  const contentSummary = content.sections?.map((s) => `## ${s.title}
${s.content.substring(0, 1e3)}`).join("\n\n").substring(0, 8e3);
  const tableSummary = content.tables?.map((t) => `Table ${t.number}: ${t.caption}`).join("\n");
  const checksToRun = [];
  if (checkTypes.includes("consistency")) {
    checksToRun.push(...CONSISTENCY_CHECKS);
  }
  if (checkTypes.includes("regulatory")) {
    checksToRun.push(
      "Check for required regulatory statements",
      "Verify GLP compliance language if applicable",
      "Check for proper study identification",
      "Verify conclusions are supported by data"
    );
  }
  const prompt = `Review this pharmaceutical report content for quality issues:

${contentSummary}

${tableSummary ? `
Tables:
${tableSummary}` : ""}

Check for these specific issues:
${checksToRun.map((c) => `- ${c}`).join("\n")}

Return a JSON array of issues found. Each issue should have:
- type: "error" | "warning" | "suggestion"
- category: "consistency" | "regulatory"
- location: where in the document
- message: what the issue is
- suggestion: how to fix it (optional)

If no issues found, return an empty array: []`;
  try {
    const response = await invokeClaudeAsync(
      [{ role: "user", content: prompt }],
      {
        modelId: CLAUDE_HAIKU,
        system: SYSTEM_PROMPT,
        maxTokens: 1500
      }
    );
    const aiIssues = extractJSON(response);
    return Array.isArray(aiIssues) ? aiIssues : [];
  } catch (e) {
    console.error("AI check failed:", e);
    return [];
  }
}
function calculateScore(issues) {
  let score = 100;
  for (const issue of issues) {
    switch (issue.type) {
      case "error":
        score -= 10;
        break;
      case "warning":
        score -= 3;
        break;
      case "suggestion":
        score -= 1;
        break;
    }
  }
  return Math.max(0, Math.min(100, score));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
