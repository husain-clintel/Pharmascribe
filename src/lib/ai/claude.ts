import Anthropic from '@anthropic-ai/sdk'

let anthropic: Anthropic | null = null

export function initClaude(apiKey: string) {
  anthropic = new Anthropic({ apiKey })
}

export async function getClaudeClient(): Promise<Anthropic> {
  if (anthropic) return anthropic

  // Fall back to environment variable
  const envKey = process.env.ANTHROPIC_API_KEY
  if (envKey) {
    anthropic = new Anthropic({ apiKey: envKey })
    return anthropic
  }

  throw new Error('Claude API key not configured')
}

export async function generateContent(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  const client = await getClaudeClient()

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    system: systemPrompt || 'You are an expert regulatory writer.',
    messages: [
      { role: 'user', content: prompt }
    ]
  })

  const textBlock = response.content.find(block => block.type === 'text')
  return textBlock ? textBlock.text : ''
}

export async function* streamContent(
  prompt: string,
  systemPrompt?: string
): AsyncGenerator<string> {
  const client = await getClaudeClient()

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    system: systemPrompt || 'You are an expert regulatory writer.',
    messages: [
      { role: 'user', content: prompt }
    ]
  })

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text
    }
  }
}

export async function analyzeData(data: any, dataType: string): Promise<any> {
  const prompt = `Analyze the following ${dataType} data and extract key information:

${JSON.stringify(data, null, 2)}

Return a JSON object with:
- summary: Brief summary of the data
- keyFindings: Array of key findings
- statistics: Relevant statistics if applicable
- warnings: Any data quality issues or warnings`

  const response = await generateContent(prompt)

  // Try to parse JSON from response
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch {
    // If JSON parsing fails, return raw response
  }

  return { summary: response, keyFindings: [], statistics: {}, warnings: [] }
}
