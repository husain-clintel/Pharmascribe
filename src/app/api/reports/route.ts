import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/api-auth'

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const { user, error } = await requireAuth(request)
    if (error || !user) return error || NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    // Only return reports owned by the authenticated user (or all for admins)
    const where = user.role === 'ADMIN' ? {} : { userId: user.id }

    const reports = await prisma.report.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        uploadedFiles: true,
        _count: {
          select: {
            chatMessages: true,
            qcResults: true
          }
        }
      }
    })

    return NextResponse.json(reports)
  } catch (error) {
    console.error('Failed to fetch reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const { user, error } = await requireAuth(request)
    if (error || !user) return error || NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const body = await request.json()

    const {
      reportType,
      studyId,
      reportNumber,
      reportTitle,
      testFacility,
      species,
      routeOfAdmin,
      doseLevel,
      analytes,
      matrices,
      preparedBy,
      reviewedBy,
      approvedBy,
      files
    } = body

    // Create the report with user association
    const report = await prisma.report.create({
      data: {
        reportType,
        studyId,
        reportNumber,
        reportTitle,
        testFacility,
        species,
        routeOfAdmin,
        doseLevel,
        analytes,
        matrices,
        preparedBy,
        reviewedBy,
        approvedBy,
        status: 'DRAFT',
        userId: user.id
      }
    })

    // If files were uploaded, associate them with the report
    if (files && files.length > 0) {
      await prisma.uploadedFile.updateMany({
        where: { id: { in: files } },
        data: { reportId: report.id }
      })
    }

    // Fetch the complete report with files
    const completeReport = await prisma.report.findUnique({
      where: { id: report.id },
      include: { uploadedFiles: true }
    })

    return NextResponse.json(completeReport, { status: 201 })
  } catch (error) {
    console.error('Failed to create report:', error)
    return NextResponse.json(
      { error: 'Failed to create report' },
      { status: 500 }
    )
  }
}
