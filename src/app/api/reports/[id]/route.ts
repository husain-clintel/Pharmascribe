import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { optionalReportOwnership, requireReportOwnership } from '@/lib/auth/api-auth'

// Whitelist of fields that can be updated
const ALLOWED_UPDATE_FIELDS = [
  'reportTitle',
  'studyId',
  'reportNumber',
  'testFacility',
  'species',
  'routeOfAdmin',
  'doseLevel',
  'analytes',
  'matrices',
  'preparedBy',
  'reviewedBy',
  'approvedBy',
  'status',
  'content',
  'extractedContext'
]

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // Check ownership (allows demo mode access)
    const { error } = await optionalReportOwnership(request, id)
    if (error) return error

    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        uploadedFiles: true,
        chatMessages: {
          orderBy: { createdAt: 'asc' }
        },
        qcResults: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error('Failed to fetch report:', error)
    return NextResponse.json(
      { error: 'Failed to fetch report' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // Check ownership (allows demo mode access)
    const { error } = await optionalReportOwnership(request, id)
    if (error) return error

    const body = await request.json()

    // Filter to only allowed fields (prevent mass assignment)
    const sanitizedData: Record<string, any> = {}
    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (body[field] !== undefined) {
        sanitizedData[field] = body[field]
      }
    }

    // Prevent empty updates
    if (Object.keys(sanitizedData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const report = await prisma.report.update({
      where: { id },
      data: sanitizedData,
      include: {
        uploadedFiles: true
      }
    })

    return NextResponse.json(report)
  } catch (error) {
    console.error('Failed to update report:', error)
    return NextResponse.json(
      { error: 'Failed to update report' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // Check ownership
    const { error } = await requireReportOwnership(request, id)
    if (error) return error

    await prisma.report.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete report:', error)
    return NextResponse.json(
      { error: 'Failed to delete report' },
      { status: 500 }
    )
  }
}
