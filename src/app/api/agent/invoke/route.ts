import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const STEPFUNCTIONS_API_URL = process.env.AWS_STEPFUNCTIONS_API_URL

interface InvokeRequest {
  workflow: 'chat' | 'generate'
  reportId: string
  message?: string
  context?: any
}

/**
 * POST /api/agent/invoke - Invoke a Step Functions workflow
 *
 * This starts an async workflow execution and returns the execution ARN.
 * Use /api/agent/status to check the execution status.
 */
export async function POST(request: NextRequest) {
  try {
    const body: InvokeRequest = await request.json()
    const { workflow, reportId, message, context } = body

    if (!workflow || !reportId) {
      return NextResponse.json(
        { error: 'Missing required fields: workflow, reportId' },
        { status: 400 }
      )
    }

    if (!STEPFUNCTIONS_API_URL) {
      return NextResponse.json(
        { error: 'Step Functions API URL not configured' },
        { status: 500 }
      )
    }

    // Determine endpoint based on workflow type
    const endpoint = workflow === 'chat'
      ? `${STEPFUNCTIONS_API_URL}/agent/chat`
      : `${STEPFUNCTIONS_API_URL}/agent/generate`

    // Prepare payload
    const payload = {
      reportId,
      ...(message && { message }),
      ...(context && { context })
    }

    // Invoke the Step Functions workflow via API Gateway
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Step Functions invocation failed:', errorText)
      return NextResponse.json(
        { error: 'Failed to invoke workflow', details: errorText },
        { status: response.status }
      )
    }

    const result = await response.json()

    // The response contains the execution ARN
    return NextResponse.json({
      success: true,
      executionArn: result.executionArn,
      startDate: result.startDate
    })
  } catch (error: any) {
    console.error('Error invoking workflow:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to invoke workflow' },
      { status: 500 }
    )
  }
}
