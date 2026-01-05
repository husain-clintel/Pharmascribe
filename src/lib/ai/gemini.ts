import { GoogleGenerativeAI } from '@google/generative-ai'

let genAI: GoogleGenerativeAI | null = null

export function initGemini(apiKey: string) {
  genAI = new GoogleGenerativeAI(apiKey)
}

export async function getGeminiClient(): Promise<GoogleGenerativeAI> {
  if (genAI) return genAI

  // Try to get API key from database
  const res = await fetch('/api/settings')
  if (res.ok) {
    const data = await res.json()
    if (data.geminiApiKey) {
      genAI = new GoogleGenerativeAI(data.geminiApiKey)
      return genAI
    }
  }

  // Fall back to environment variable
  const envKey = process.env.GEMINI_API_KEY
  if (envKey) {
    genAI = new GoogleGenerativeAI(envKey)
    return genAI
  }

  throw new Error('Gemini API key not configured')
}

export async function generateContent(prompt: string, systemPrompt?: string): Promise<string> {
  const client = await getGeminiClient()
  const model = client.getGenerativeModel({ model: 'gemini-1.5-pro' })

  const fullPrompt = systemPrompt
    ? `${systemPrompt}\n\n${prompt}`
    : prompt

  const result = await model.generateContent(fullPrompt)
  const response = await result.response
  return response.text()
}

export async function* streamContent(prompt: string, systemPrompt?: string): AsyncGenerator<string> {
  const client = await getGeminiClient()
  const model = client.getGenerativeModel({ model: 'gemini-1.5-pro' })

  const fullPrompt = systemPrompt
    ? `${systemPrompt}\n\n${prompt}`
    : prompt

  const result = await model.generateContentStream(fullPrompt)

  for await (const chunk of result.stream) {
    yield chunk.text()
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
