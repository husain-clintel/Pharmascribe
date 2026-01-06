import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import prisma from '@/lib/db/prisma'
import Papa from 'papaparse'
import { requireAuth } from '@/lib/auth/api-auth'

// Increase timeout for file processing
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    // Require authentication for file uploads
    const { user, error: authError } = await requireAuth(request)
    if (authError) return authError

    const formData = await request.formData()
    const file = formData.get('file') as File
    const fileType = formData.get('fileType') as string || 'OTHER'
    const reportId = formData.get('reportId') as string | null
    const folderPath = formData.get('folderPath') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file size (max 50MB)
    const MAX_FILE_SIZE = 50 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 }
      )
    }

    // Validate file type (whitelist approach)
    const ALLOWED_EXTENSIONS = [
      '.csv', '.xlsx', '.xls', '.txt', '.pdf',
      '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'
    ]
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
      return NextResponse.json(
        { error: 'File type not allowed' },
        { status: 400 }
      )
    }

    // If reportId provided, verify ownership
    if (reportId) {
      const report = await prisma.report.findFirst({
        where: {
          id: reportId,
          OR: [
            { userId: user?.id },
            { userId: null } // Allow legacy reports without user
          ]
        }
      })
      if (!report && user?.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Report not found or access denied' },
          { status: 404 }
        )
      }
    }

    // Upload to Vercel Blob with private access
    const blob = await put(file.name, file, {
      access: 'public', // Note: Vercel Blob requires 'public' for now, use signed URLs for sensitive data
    })

    // Parse file content based on type
    let extractedData = null

    // Handle image files - no extraction needed, just store metadata
    if (file.type.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(file.name)) {
      extractedData = {
        type: 'image',
        mimeType: file.type,
        size: file.size,
        url: blob.url,
        note: 'Image file stored successfully. No text extraction needed.'
      }
    }

    // Handle CSV files
    else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      const text = await file.text()
      const parsed = Papa.parse(text, { header: true, dynamicTyping: true })
      extractedData = {
        type: 'csv',
        headers: parsed.meta.fields,
        rowCount: parsed.data.length,
        data: parsed.data, // Include full data for AI context
        sample: parsed.data.slice(0, 10),
        errors: parsed.errors.slice(0, 5)
      }
    }

    // Handle Excel files
    else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      try {
        const XLSX = await import('xlsx')
        const arrayBuffer = await file.arrayBuffer()
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
      } catch (e) {
        console.error('Excel parsing error:', e)
      }
    }

    // Handle text/protocol files
    else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      const text = await file.text()
      extractedData = {
        type: 'text',
        content: text.slice(0, 50000), // Limit to 50k chars
        charCount: text.length
      }
    }

    // Handle PDF files - extract text content
    else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      try {
        // Use unpdf for serverless-compatible PDF text extraction
        const { extractText } = await import('unpdf')
        const arrayBuffer = await file.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)

        const result = await extractText(uint8Array)
        // unpdf returns text as string[] (array of strings per page)
        const textContent = Array.isArray(result.text) ? result.text.join('\n') : result.text

        extractedData = {
          type: 'pdf',
          content: textContent.slice(0, 150000), // Limit to 150k chars for protocols
          pageCount: result.totalPages,
          charCount: textContent.length
        }
      } catch (e: any) {
        console.error('PDF parsing error:', e)
        // Try pdf-parse as fallback
        try {
          const pdfParseModule = await import('pdf-parse')
          const pdfParse = (pdfParseModule as any).default || pdfParseModule
          const arrayBuffer = await file.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          const data = await pdfParse(buffer)

          extractedData = {
            type: 'pdf',
            content: data.text.slice(0, 150000),
            pageCount: data.numpages,
            charCount: data.text.length,
            extractionMethod: 'pdf-parse-fallback'
          }
        } catch (e2: any) {
          // Store basic info if all parsing fails
          extractedData = {
            type: 'pdf',
            content: 'PDF text extraction failed - file stored for reference. Error: ' + (e?.message || String(e)),
            error: String(e)
          }
        }
      }
    }

    // Create database record
    const createData: any = {
      filename: file.name,
      fileType: fileType,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      blobUrl: blob.url,
      processed: extractedData !== null
    }

    if (extractedData) {
      createData.extractedData = extractedData
    }

    if (reportId) {
      createData.reportId = reportId
    }

    if (folderPath) {
      createData.folderPath = folderPath
    }

    const uploadedFile = await prisma.uploadedFile.create({
      data: createData
    })

    return NextResponse.json({
      id: uploadedFile.id,
      filename: uploadedFile.filename,
      blobUrl: blob.url,
      folderPath: uploadedFile.folderPath,
      extractedData
    })
  } catch (error) {
    console.error('Failed to upload file:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
