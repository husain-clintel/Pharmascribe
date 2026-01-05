import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { generateDocx } from '@/lib/document/generator'

// Increase timeout for export with image fetching
export const maxDuration = 120

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const { format } = await request.json()

    // Include uploaded files to get figure images
    const report = await prisma.report.findUnique({
      where: { id },
      include: { uploadedFiles: true }
    })

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    if (!report.content) {
      return NextResponse.json(
        { error: 'Report has no content to export' },
        { status: 400 }
      )
    }

    if (format === 'docx') {
      const buffer = await generateDocx(report as any)

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${report.studyId}_Report.docx"`
        }
      })
    }

    // PDF export could be added here
    return NextResponse.json(
      { error: 'Unsupported format' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Failed to export report:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to export report'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
