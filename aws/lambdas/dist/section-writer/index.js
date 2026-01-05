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

// section-writer/index.ts
var section_writer_exports = {};
__export(section_writer_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(section_writer_exports);

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
function parseMemoryContent(memory) {
  try {
    return JSON.parse(memory.content);
  } catch {
    return memory.content;
  }
}

// section-writer/index.ts
var SECTION_PROMPTS = {
  "executive-summary": `Write an executive summary for this pharmacokinetic/toxicokinetic study report.

The executive summary should:
- Be 2-3 paragraphs
- Summarize the study design (species, doses, route, duration)
- Highlight key PK parameters (Cmax, AUC, T1/2)
- Note any dose-proportionality findings
- Mention sex differences if observed
- Use professional regulatory writing style`,
  "study-design": `Write the Study Design section.

Include:
- Test article identification
- Species and strain
- Number of animals per group/sex
- Dose levels and route of administration
- Dosing frequency and duration
- Blood sampling time points
- Bioanalytical method summary`,
  "pk-parameters": `Write the Pharmacokinetic Parameters section.

Include:
- Complete list of PK parameters calculated (Cmax, Tmax, AUC0-t, AUC0-inf, T1/2, CL, Vd)
- Statistical methods used
- Software used for calculations
- Any non-compartmental analysis details`,
  "results": `Write the Results section.

Structure:
1. Plasma concentration-time profiles
2. Key PK parameters by dose group
3. Dose proportionality assessment
4. Sex comparison (if applicable)
5. Day 1 vs steady-state comparison (if repeat-dose)

Use proper scientific notation and units.`,
  "discussion": `Write the Discussion section.

Address:
- Interpretation of PK parameters
- Dose proportionality conclusions
- Comparison to previous studies (if mentioned)
- Relevance to safety assessment
- Any limitations`,
  "conclusions": `Write the Conclusions section.

Brief, bulleted conclusions covering:
- Key PK characteristics
- Dose proportionality
- Sex differences (if any)
- Implications for toxicity assessment`
};
var SYSTEM_PROMPT = `You are an expert pharmaceutical regulatory writer specializing in IND (Investigational New Drug) applications. You write pharmacokinetic and toxicokinetic report sections following FDA CTD format guidelines.

Writing style requirements:
- Professional, scientific tone
- Third person, passive voice preferred
- Precise terminology
- Proper units and statistical notation
- Clear, concise sentences

Terminology rules:
- For IV route: use "distributed" not "infused"
- Use Mean (%CV) or Mean \xB1 SD for statistics
- Use proper abbreviations: PK, TK, Cmax, Tmax, AUC, T1/2, etc.

Return ONLY the section content without any preamble or explanation.`;
var handler = async (event) => {
  console.log("Section Writer invoked:", JSON.stringify(event, null, 2));
  try {
    const { reportId, sectionId, sectionType, context, memories, instructions } = event;
    if (!reportId || !sectionType) {
      return { success: false, error: "Missing required parameters" };
    }
    const basePrompt = SECTION_PROMPTS[sectionType] || SECTION_PROMPTS["results"];
    const contextParts = [];
    if (context) {
      contextParts.push("## Study Information");
      if (context.title)
        contextParts.push(`Report Title: ${context.title}`);
      if (context.studyType)
        contextParts.push(`Study Type: ${context.studyType}`);
      if (context.species)
        contextParts.push(`Species: ${context.species}`);
      if (context.route)
        contextParts.push(`Route: ${context.route}`);
      if (context.duration)
        contextParts.push(`Duration: ${context.duration}`);
    }
    if (memories && memories.length > 0) {
      contextParts.push("\n## Previous Decisions & Preferences");
      for (const mem of memories) {
        const content2 = parseMemoryContent(mem);
        if (mem.memoryType === "DECISION") {
          contextParts.push(`- ${content2.decision || JSON.stringify(content2)}`);
        } else if (mem.memoryType === "PREFERENCE") {
          contextParts.push(`- Preference: ${content2.preference || JSON.stringify(content2)}`);
        }
      }
    }
    if (context?.uploadedFiles?.length > 0) {
      contextParts.push("\n## Source Data");
      for (const file of context.uploadedFiles) {
        if (file.extractedText) {
          contextParts.push(`
### From ${file.filename}:`);
          contextParts.push(file.extractedText.substring(0, 4e3));
        }
        if (file.metadata) {
          contextParts.push(`Metadata: ${JSON.stringify(file.metadata)}`);
        }
      }
    }
    const fullPrompt = `${contextParts.join("\n")}

## Task
${basePrompt}

${instructions ? `
## Additional Instructions:
${instructions}` : ""}

Write the section content now:`;
    const content = await invokeClaudeAsync(
      [{ role: "user", content: fullPrompt }],
      {
        modelId: CLAUDE_SONNET,
        system: SYSTEM_PROMPT,
        maxTokens: 4096,
        temperature: 0.5
        // Lower temperature for more consistent output
      }
    );
    return {
      success: true,
      content: content.trim()
    };
  } catch (error) {
    console.error("Section Writer error:", error);
    return {
      success: false,
      error: error.message || "Failed to write section"
    };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
