import { NextRequest, NextResponse } from 'next/server'
import {
  storeMemory,
  recallMemory,
  deleteMemory
} from '@/lib/agent/memory-client'
import type { StoreMemoryRequest, RecallMemoryRequest } from '@/lib/agent/types'

/**
 * POST /api/agent/memory - Store a new memory
 */
export async function POST(request: NextRequest) {
  try {
    const body: StoreMemoryRequest = await request.json()

    if (!body.reportId || !body.memoryType || !body.content || !body.category) {
      return NextResponse.json(
        { error: 'Missing required fields: reportId, memoryType, content, category' },
        { status: 400 }
      )
    }

    const memory = await storeMemory(body)

    return NextResponse.json({
      success: true,
      memory
    })
  } catch (error: any) {
    console.error('Error storing memory:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to store memory' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/agent/memory?reportId=xxx - Recall memories
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reportId = searchParams.get('reportId')

    if (!reportId) {
      return NextResponse.json(
        { error: 'Missing required parameter: reportId' },
        { status: 400 }
      )
    }

    const recallRequest: RecallMemoryRequest = {
      reportId,
      memoryTypes: searchParams.get('types')?.split(',') as any,
      categories: searchParams.get('categories')?.split(',') as any,
      minImportance: searchParams.get('minImportance')
        ? parseInt(searchParams.get('minImportance')!)
        : undefined,
      limit: searchParams.get('limit')
        ? parseInt(searchParams.get('limit')!)
        : 50
    }

    const result = await recallMemory(recallRequest)

    return NextResponse.json({
      success: true,
      ...result
    })
  } catch (error: any) {
    console.error('Error recalling memories:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to recall memories' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/agent/memory - Delete memory/memories
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reportId = searchParams.get('reportId')
    const memoryKey = searchParams.get('memoryKey')

    if (!reportId) {
      return NextResponse.json(
        { error: 'Missing required parameter: reportId' },
        { status: 400 }
      )
    }

    await deleteMemory(reportId, memoryKey || undefined)

    return NextResponse.json({
      success: true,
      message: memoryKey
        ? 'Memory deleted'
        : 'All memories for report deleted'
    })
  } catch (error: any) {
    console.error('Error deleting memory:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete memory' },
      { status: 500 }
    )
  }
}
