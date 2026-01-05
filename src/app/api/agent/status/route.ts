import { NextRequest, NextResponse } from 'next/server'
import { SFNClient, DescribeExecutionCommand } from '@aws-sdk/client-sfn'

export const dynamic = 'force-dynamic'

const sfnClient = new SFNClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
})

/**
 * GET /api/agent/status?executionArn=xxx - Check workflow execution status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const executionArn = searchParams.get('executionArn')

    if (!executionArn) {
      return NextResponse.json(
        { error: 'Missing required parameter: executionArn' },
        { status: 400 }
      )
    }

    const command = new DescribeExecutionCommand({
      executionArn
    })

    const result = await sfnClient.send(command)

    // Parse output if execution is complete
    let output = null
    if (result.status === 'SUCCEEDED' && result.output) {
      try {
        output = JSON.parse(result.output)
      } catch {
        output = result.output
      }
    }

    // Parse error if execution failed
    let error = null
    if (result.status === 'FAILED' || result.status === 'TIMED_OUT' || result.status === 'ABORTED') {
      error = {
        cause: result.cause,
        error: result.error
      }
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      startDate: result.startDate,
      stopDate: result.stopDate,
      output,
      error
    })
  } catch (error: any) {
    console.error('Error checking execution status:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check status' },
      { status: 500 }
    )
  }
}
