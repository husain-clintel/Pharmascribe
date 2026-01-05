import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'

// Increase timeout for PDF processing
export const maxDuration = 120

export async function POST(
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

    // Fetch the file from blob storage
    const response = await fetch(file.blobUrl)
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch file from storage' },
        { status: 500 }
      )
    }

    const arrayBuffer = await response.arrayBuffer()
    let extractedData: any = null

    // Re-extract based on file type
    if (file.filename.endsWith('.pdf') || file.mimeType === 'application/pdf') {
      extractedData = await extractPdfContent(arrayBuffer, file.filename)
    } else if (file.filename.endsWith('.csv') || file.mimeType === 'text/csv') {
      const text = new TextDecoder().decode(arrayBuffer)
      const Papa = (await import('papaparse')).default
      const parsed = Papa.parse(text, { header: true, dynamicTyping: true })
      extractedData = {
        type: 'csv',
        headers: parsed.meta.fields,
        rowCount: parsed.data.length,
        data: parsed.data,
        sample: parsed.data.slice(0, 10),
        errors: parsed.errors.slice(0, 5)
      }
    } else if (file.filename.endsWith('.xlsx') || file.filename.endsWith('.xls')) {
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const sheets: any = {}
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName]
        const data = XLSX.utils.sheet_to_json(sheet)
        sheets[sheetName] = {
          rowCount: data.length,
          data: data,
          sample: data.slice(0, 10)
        }
      }
      extractedData = {
        type: 'excel',
        sheetNames: workbook.SheetNames,
        sheets
      }
    } else if (file.filename.endsWith('.txt') || file.mimeType === 'text/plain') {
      const text = new TextDecoder().decode(arrayBuffer)
      extractedData = {
        type: 'text',
        content: text.slice(0, 50000),
        charCount: text.length
      }
    }

    if (!extractedData) {
      return NextResponse.json(
        { error: 'Unsupported file type for re-extraction' },
        { status: 400 }
      )
    }

    // Update the database record
    await prisma.uploadedFile.update({
      where: { id },
      data: {
        extractedData,
        processed: true
      }
    })

    return NextResponse.json({
      success: true,
      filename: file.filename,
      extractedData
    })
  } catch (error) {
    console.error('Failed to re-extract file:', error)
    return NextResponse.json(
      { error: 'Failed to re-extract file: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}

async function extractPdfContent(arrayBuffer: ArrayBuffer, filename: string): Promise<any> {
  const uint8Array = new Uint8Array(arrayBuffer)

  // Try unpdf first
  try {
    const { extractText } = await import('unpdf')
    const result = await extractText(uint8Array)

    // unpdf returns text as string[] (array of strings per page)
    const textContent = Array.isArray(result.text) ? result.text.join('\n') : result.text

    if (textContent && textContent.trim().length > 100) {
      return {
        type: 'pdf',
        content: textContent.slice(0, 150000), // Increase limit for protocols
        pageCount: result.totalPages,
        charCount: textContent.length,
        extractionMethod: 'unpdf'
      }
    }
  } catch (e: any) {
    console.error('unpdf extraction failed:', e.message)
  }

  // Try pdf-parse as fallback (if available)
  try {
    const pdfParseModule = await import('pdf-parse')
    const pdfParse = (pdfParseModule as any).default || pdfParseModule
    const buffer = Buffer.from(arrayBuffer)
    const data = await pdfParse(buffer)

    if (data.text && data.text.trim().length > 100) {
      return {
        type: 'pdf',
        content: data.text.slice(0, 150000),
        pageCount: data.numpages,
        charCount: data.text.length,
        extractionMethod: 'pdf-parse'
      }
    }
  } catch (e: any) {
    console.error('pdf-parse extraction failed:', e.message)
  }

  // If both fail, return error info
  return {
    type: 'pdf',
    content: `PDF text extraction failed for ${filename}. The file may be scanned/image-based or have complex formatting. Please provide key protocol details manually.`,
    error: 'Multiple extraction methods failed',
    extractionMethod: 'failed'
  }
}
