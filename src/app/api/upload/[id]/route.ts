import { NextRequest, NextResponse } from 'next/server'
import { del } from '@vercel/blob'
import prisma from '@/lib/db/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // Find the file
    const file = await prisma.uploadedFile.findUnique({
      where: { id }
    })

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Delete from Vercel Blob
    try {
      await del(file.blobUrl)
    } catch (blobError) {
      console.error('Failed to delete blob:', blobError)
      // Continue even if blob deletion fails
    }

    // Delete from database
    await prisma.uploadedFile.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete file:', error)
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    )
  }
}
