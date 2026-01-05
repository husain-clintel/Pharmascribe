import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
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
    const body = await request.json()

    const report = await prisma.report.update({
      where: { id },
      data: body,
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
