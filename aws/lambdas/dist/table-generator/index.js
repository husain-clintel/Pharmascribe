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

// table-generator/index.ts
var table_generator_exports = {};
__export(table_generator_exports, {
  calculateMeanCV: () => calculateMeanCV,
  calculateMeanSD: () => calculateMeanSD,
  handler: () => handler
});
module.exports = __toCommonJS(table_generator_exports);

// shared/bedrock-client.ts
var import_client_bedrock_runtime = require("@aws-sdk/client-bedrock-runtime");
var client = new import_client_bedrock_runtime.BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1"
});
var CLAUDE_OPUS = "anthropic.claude-opus-4-5-20251101-v1:0";
var CLAUDE_SONNET = "anthropic.claude-sonnet-4-20250514-v1:0";
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

// table-generator/index.ts
var SYSTEM_PROMPT = `You are an expert at creating pharmacokinetic data tables for regulatory submissions.

Table formatting requirements:
- Use proper statistical notation: Mean (%CV) or Mean \xB1 SD
- Include units in column headers
- Use consistent decimal places
- Follow FDA CTD format guidelines

For PK parameter tables:
- Standard parameters: Cmax (ng/mL), Tmax (h), AUC0-t (ng\xB7h/mL), AUC0-inf (ng\xB7h/mL), T1/2 (h)
- Include CL/F and Vd/F for appropriate routes
- Show both male and female data when available

When returning tables, use this exact JSON structure:
{
  "table": {
    "id": "unique-id",
    "number": 1,
    "caption": "Table caption here",
    "headers": ["Header1", "Header2", ...],
    "data": [["row1col1", "row1col2"], ["row2col1", "row2col2"]]
  }
}`;
var TABLE_TEMPLATES = {
  "pk-summary": {
    headers: ["Parameter", "Unit", "Low Dose", "Mid Dose", "High Dose"],
    caption: "Summary of Pharmacokinetic Parameters Following [ROUTE] Administration of [DRUG] in [SPECIES]"
  },
  "pk-individual": {
    headers: ["Animal ID", "Sex", "Dose (mg/kg)", "Cmax (ng/mL)", "Tmax (h)", "AUC0-t (ng\xB7h/mL)", "T1/2 (h)"],
    caption: "Individual Pharmacokinetic Parameters"
  },
  "concentration-time": {
    headers: ["Time (h)", "Low Dose", "Mid Dose", "High Dose"],
    caption: "Mean (\xB1SD) Plasma Concentrations of [DRUG] Following [ROUTE] Administration in [SPECIES]"
  },
  "dose-proportionality": {
    headers: ["Parameter", "Dose Ratio", "Parameter Ratio", "Proportionality Assessment"],
    caption: "Dose Proportionality Assessment"
  },
  "sex-comparison": {
    headers: ["Parameter", "Unit", "Male Mean (%CV)", "Female Mean (%CV)", "M/F Ratio"],
    caption: "Comparison of Pharmacokinetic Parameters Between Male and Female [SPECIES]"
  },
  "tk-exposure": {
    headers: ["Dose (mg/kg)", "Day", "Cmax (ng/mL)", "AUC0-24 (ng\xB7h/mL)", "Accumulation Ratio"],
    caption: "Toxicokinetic Exposure Summary"
  }
};
var handler = async (event) => {
  console.log("Table Generator invoked:", JSON.stringify(event, null, 2));
  try {
    const { reportId, tableType, sourceData, context, format = "mean_cv" } = event;
    if (!reportId || !tableType) {
      return { success: false, error: "Missing required parameters" };
    }
    const template = TABLE_TEMPLATES[tableType] || TABLE_TEMPLATES["pk-summary"];
    const contextInfo = context ? `
Study: ${context.title || "PK Study"}
Species: ${context.species || "Not specified"}
Route: ${context.route || "Not specified"}
` : "";
    const dataInfo = sourceData ? `
Source Data:
${JSON.stringify(sourceData, null, 2)}
` : "";
    const formatInstructions = format === "mean_cv" ? "Use Mean (%CV) format for all statistical values" : format === "individual" ? "Show individual animal data" : "Use summary statistics";
    const prompt = `Create a ${tableType} table with the following context:

${contextInfo}
${dataInfo}

Table Template:
- Caption: ${template.caption}
- Default Headers: ${template.headers.join(", ")}

Instructions:
- ${formatInstructions}
- Use appropriate units
- Replace placeholders like [DRUG], [SPECIES], [ROUTE] with actual values from context
- If source data is provided, use those values; otherwise generate realistic placeholder values
- Ensure proper decimal places (typically 2-3 for concentrations, 2 for ratios)

Return the table as a JSON object with id, number, caption, headers, and data arrays.`;
    const response = await invokeClaudeAsync(
      [{ role: "user", content: prompt }],
      {
        modelId: CLAUDE_SONNET,
        system: SYSTEM_PROMPT,
        maxTokens: 2048
      }
    );
    const result = extractJSON(response);
    if (!result?.table) {
      const tableOnly = extractJSON(response);
      if (tableOnly) {
        return { success: true, table: tableOnly };
      }
      return { success: false, error: "Failed to generate table structure" };
    }
    return { success: true, table: result.table };
  } catch (error) {
    console.error("Table Generator error:", error);
    return {
      success: false,
      error: error.message || "Failed to generate table"
    };
  }
};
function calculateMeanCV(values) {
  if (values.length === 0)
    return "NC";
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sd = Math.sqrt(
    values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length
  );
  const cv = sd / mean * 100;
  return `${mean.toFixed(2)} (${cv.toFixed(1)})`;
}
function calculateMeanSD(values) {
  if (values.length === 0)
    return "NC";
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sd = Math.sqrt(
    values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / (values.length - 1)
  );
  return `${mean.toFixed(2)} \xB1 ${sd.toFixed(2)}`;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  calculateMeanCV,
  calculateMeanSD,
  handler
});
