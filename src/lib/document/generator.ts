import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  WidthType,
  convertInchesToTwip,
  PageBreak,
  Header,
  Footer,
  PageNumber,
  VerticalAlign,
  SimpleField,
  TableOfContents,
  StyleLevel,
  ImageRun
} from 'docx'
import type { Report, UploadedFile } from '@/types'

// Cache for fetched images
const imageCache: Map<string, Buffer> = new Map()

// Fetch image from URL and return buffer
async function fetchImage(url: string): Promise<Buffer | null> {
  if (imageCache.has(url)) {
    return imageCache.get(url)!
  }

  try {
    const response = await fetch(url)
    if (!response.ok) return null

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    imageCache.set(url, buffer)
    return buffer
  } catch (error) {
    console.error('Failed to fetch image:', url, error)
    return null
  }
}

const FONT_NAME = 'Times New Roman'
const FONT_SIZE = 22 // Half-points (11pt = 22)
const FONT_SIZE_SMALL = 18 // 9pt
const FONT_SIZE_HEADING1 = 28 // 14pt
const FONT_SIZE_HEADING2 = 24 // 12pt
const FONT_SIZE_TITLE = 32 // 16pt
const FONT_SIZE_FOOTNOTE = 16 // 8pt
const TABLE_HEADER_COLOR = 'E6E6E6'
const TABLE_ALT_ROW_COLOR = 'F2F2F2'

// Parse markdown text and convert to TextRun array
function parseMarkdownToTextRuns(text: string, fontSize: number = FONT_SIZE, baseItalics: boolean = false): TextRun[] {
  const runs: TextRun[] = []

  // Pattern to match **bold**, *italic*, ***bold italic***, and ~~strikethrough~~
  const pattern = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|~~(.+?)~~)/g

  let lastIndex = 0
  let match

  while ((match = pattern.exec(text)) !== null) {
    // Add text before the match as regular text
    if (match.index > lastIndex) {
      const beforeText = text.slice(lastIndex, match.index)
      if (beforeText) {
        runs.push(new TextRun({
          text: beforeText,
          font: FONT_NAME,
          size: fontSize,
          italics: baseItalics,
          color: '000000'
        }))
      }
    }

    // Determine formatting based on match
    if (match[2]) {
      // ***bold italic***
      runs.push(new TextRun({
        text: match[2],
        font: FONT_NAME,
        size: fontSize,
        bold: true,
        italics: true,
        color: '000000'
      }))
    } else if (match[3]) {
      // **bold**
      runs.push(new TextRun({
        text: match[3],
        font: FONT_NAME,
        size: fontSize,
        bold: true,
        italics: baseItalics,
        color: '000000'
      }))
    } else if (match[4]) {
      // *italic*
      runs.push(new TextRun({
        text: match[4],
        font: FONT_NAME,
        size: fontSize,
        italics: true,
        color: '000000'
      }))
    } else if (match[5]) {
      // ~~strikethrough~~
      runs.push(new TextRun({
        text: match[5],
        font: FONT_NAME,
        size: fontSize,
        strike: true,
        italics: baseItalics,
        color: '000000'
      }))
    }

    lastIndex = pattern.lastIndex
  }

  // Add remaining text after last match
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex)
    if (remainingText) {
      runs.push(new TextRun({
        text: remainingText,
        font: FONT_NAME,
        size: fontSize,
        italics: baseItalics,
        color: '000000'
      }))
    }
  }

  // If no matches were found, return the original text
  if (runs.length === 0) {
    runs.push(new TextRun({
      text: text,
      font: FONT_NAME,
      size: fontSize,
      italics: baseItalics,
      color: '000000'
    }))
  }

  return runs
}

// Counters for table and figure numbering
let tableCounter = 0
let figureCounter = 0

export async function generateDocx(report: Report & { uploadedFiles?: UploadedFile[] }): Promise<Buffer> {
  // Reset counters and cache
  tableCounter = 0
  figureCounter = 0
  imageCache.clear()

  const content = report.content as any
  const sections = content?.sections || []
  const tables = content?.tables || []
  const figures = content?.figures || []
  const frontMatter = content?.frontMatter
  const metadata = content?.metadata || {}

  // Get figure files from uploaded files
  const figureFiles = (report.uploadedFiles || []).filter(f => f.fileType === 'FIGURE')

  const children: any[] = []

  // ==========================================
  // FRONT MATTER
  // ==========================================

  // 1. Title Page
  children.push(...createTitlePage(report, frontMatter, metadata))

  // 2. Signatures Page
  children.push(...createSignaturesPage(frontMatter?.signatures || {
    preparedBy: report.preparedBy,
    reviewedBy: report.reviewedBy,
    approvedBy: report.approvedBy
  }))

  // 3. Table of Contents (with Word field)
  children.push(...createTableOfContents())

  // 4. List of Tables (with Word field)
  children.push(...createListOfTables())

  // 5. List of Figures (with Word field)
  children.push(...createListOfFigures())

  // ==========================================
  // BODY SECTIONS
  // ==========================================

  let sectionNumber = 0
  let subsectionNumber = 0
  let subsubsectionNumber = 0

  for (const section of sections) {
    // Calculate section numbers
    if (section.level === 1 && section.numbered) {
      sectionNumber++
      subsectionNumber = 0
      subsubsectionNumber = 0
    } else if (section.level === 2 && section.numbered) {
      subsectionNumber++
      subsubsectionNumber = 0
    } else if (section.level === 3 && section.numbered) {
      subsubsectionNumber++
    }

    // Build heading number
    let headingNumber = ''
    if (section.numbered) {
      if (section.number) {
        headingNumber = section.number + ' '
      } else if (section.level === 1) {
        headingNumber = `${sectionNumber} `
      } else if (section.level === 2) {
        headingNumber = `${sectionNumber}.${subsectionNumber} `
      } else if (section.level === 3) {
        headingNumber = `${sectionNumber}.${subsectionNumber}.${subsubsectionNumber} `
      }
    }

    const headingLevel =
      section.level === 1
        ? HeadingLevel.HEADING_1
        : section.level === 2
        ? HeadingLevel.HEADING_2
        : HeadingLevel.HEADING_3

    const headingSize =
      section.level === 1 ? FONT_SIZE_HEADING1 :
      section.level === 2 ? FONT_SIZE_HEADING2 : FONT_SIZE

    // Add heading
    children.push(
      new Paragraph({
        heading: headingLevel,
        children: [
          new TextRun({
            text: `${headingNumber}${section.title}`,
            font: FONT_NAME,
            size: headingSize,
            bold: true,
            color: '000000'
          })
        ],
        spacing: { before: 240, after: 120 }
      })
    )

    // Add content paragraphs
    if (section.content) {
      // Handle content that might be an object instead of string
      let contentText = section.content
      if (typeof contentText === 'object') {
        if (contentText.text) {
          contentText = contentText.text
        } else if (contentText.content) {
          contentText = typeof contentText.content === 'string' ? contentText.content : JSON.stringify(contentText.content)
        } else if (Array.isArray(contentText)) {
          contentText = contentText.map((item: any) => typeof item === 'string' ? item : (item.text || item.content || '')).join('\n')
        } else {
          contentText = JSON.stringify(contentText)
        }
      }

      const paragraphs = String(contentText).split('\n').filter((p: string) => p.trim())
      for (const para of paragraphs) {
        children.push(
          new Paragraph({
            children: parseMarkdownToTextRuns(para.trim()),
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 120 }
          })
        )
      }
    }

    // Add tables for this section
    const sectionTables = tables.filter((t: any) => t.sectionId === section.id)
    for (const table of sectionTables) {
      children.push(...buildTable(table))
    }

    // Add figures for this section
    const sectionFigures = figures.filter((f: any) => f.sectionId === section.id)
    for (const figure of sectionFigures) {
      const figureParagraphs = await buildFigure(figure, figureFiles)
      children.push(...figureParagraphs)
    }
  }

  // ==========================================
  // APPENDICES
  // ==========================================

  // Find orphaned tables (not associated with any section)
  const orphanedTables = tables.filter((t: any) =>
    !t.sectionId || !sections.find((s: any) => s.id === t.sectionId)
  )

  // Find orphaned figures (not associated with any section)
  const orphanedFigures = figures.filter((f: any) =>
    !f.sectionId || !sections.find((s: any) => s.id === f.sectionId)
  )

  // Get appendix tables from content
  const appendixTables = content?.appendixTables || []

  // Only add Appendix section if there's content
  const hasAppendixContent = orphanedTables.length > 0 || orphanedFigures.length > 0 || appendixTables.length > 0

  if (hasAppendixContent) {
    // Page break before appendix
    children.push(new Paragraph({ children: [new PageBreak()] }))

    // Appendix heading
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({
            text: 'APPENDICES',
            font: FONT_NAME,
            size: FONT_SIZE_HEADING1,
            bold: true,
            color: '000000'
          })
        ],
        spacing: { before: 240, after: 240 }
      })
    )

    // Appendix Tables (from appendixTables array)
    if (appendixTables.length > 0) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [
            new TextRun({
              text: 'Appendix A: Individual Subject Data Tables',
              font: FONT_NAME,
              size: FONT_SIZE_HEADING2,
              bold: true,
              color: '000000'
            })
          ],
          spacing: { before: 200, after: 120 }
        })
      )

      for (const table of appendixTables) {
        children.push(...buildTable(table))
      }
    }

    // Orphaned Tables
    if (orphanedTables.length > 0) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [
            new TextRun({
              text: appendixTables.length > 0 ? 'Appendix B: Additional Tables' : 'Appendix A: Tables',
              font: FONT_NAME,
              size: FONT_SIZE_HEADING2,
              bold: true,
              color: '000000'
            })
          ],
          spacing: { before: 200, after: 120 }
        })
      )

      for (const table of orphanedTables) {
        children.push(...buildTable(table))
      }
    }

    // Orphaned Figures
    if (orphanedFigures.length > 0) {
      const figAppendixLetter = appendixTables.length > 0 && orphanedTables.length > 0 ? 'C' :
                                 appendixTables.length > 0 || orphanedTables.length > 0 ? 'B' : 'A'
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [
            new TextRun({
              text: `Appendix ${figAppendixLetter}: Figures`,
              font: FONT_NAME,
              size: FONT_SIZE_HEADING2,
              bold: true,
              color: '000000'
            })
          ],
          spacing: { before: 200, after: 120 }
        })
      )

      for (const figure of orphanedFigures) {
        const figureParagraphs = await buildFigure(figure, figureFiles)
        children.push(...figureParagraphs)
      }
    }
  }

  // Create document with headers, footers, and styles
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT_NAME,
            size: FONT_SIZE,
            color: '000000'
          }
        },
        heading1: {
          run: {
            font: FONT_NAME,
            size: FONT_SIZE_HEADING1,
            bold: true,
            color: '000000'
          },
          paragraph: {
            spacing: { before: 240, after: 120 }
          }
        },
        heading2: {
          run: {
            font: FONT_NAME,
            size: FONT_SIZE_HEADING2,
            bold: true,
            color: '000000'
          },
          paragraph: {
            spacing: { before: 200, after: 100 }
          }
        },
        heading3: {
          run: {
            font: FONT_NAME,
            size: FONT_SIZE,
            bold: true,
            color: '000000'
          },
          paragraph: {
            spacing: { before: 160, after: 80 }
          }
        }
      },
      paragraphStyles: [
        {
          id: 'Caption',
          name: 'Caption',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            font: FONT_NAME,
            size: FONT_SIZE,
            bold: true,
            color: '000000'
          }
        }
      ]
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
              right: convertInchesToTwip(1)
            }
          }
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `BA/PK Memorandum - Study ${report.studyId}`,
                    font: FONT_NAME,
                    size: FONT_SIZE_SMALL,
                    color: '000000'
                  })
                ],
                alignment: AlignmentType.RIGHT
              })
            ]
          })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Confidential',
                    font: FONT_NAME,
                    size: FONT_SIZE_SMALL,
                    color: '000000'
                  }),
                  new TextRun({
                    text: '\t\tPage ',
                    font: FONT_NAME,
                    size: FONT_SIZE_SMALL,
                    color: '000000'
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: FONT_NAME,
                    size: FONT_SIZE_SMALL,
                    color: '000000'
                  }),
                  new TextRun({
                    text: ' of ',
                    font: FONT_NAME,
                    size: FONT_SIZE_SMALL,
                    color: '000000'
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    font: FONT_NAME,
                    size: FONT_SIZE_SMALL,
                    color: '000000'
                  })
                ],
                alignment: AlignmentType.LEFT
              })
            ]
          })
        },
        children
      }
    ]
  })

  return await Packer.toBuffer(doc)
}

// ==========================================
// FRONT MATTER BUILDERS
// ==========================================

function createTitlePage(report: Report, frontMatter: any, metadata: any): Paragraph[] {
  const paragraphs: Paragraph[] = []

  // Spacing at top
  paragraphs.push(new Paragraph({ spacing: { before: 2000 } }))

  // Main title
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'BA/PK Memorandum',
          font: FONT_NAME,
          size: FONT_SIZE_TITLE,
          bold: true,
          color: '000000'
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 480 }
    })
  )

  // Report title
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: report.reportTitle,
          font: FONT_NAME,
          size: FONT_SIZE_HEADING1,
          bold: true,
          color: '000000'
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 }
    })
  )

  // Study ID
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Study ID: ${report.studyId}`,
          font: FONT_NAME,
          size: FONT_SIZE,
          color: '000000'
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 }
    })
  )

  // Report Number
  if (report.reportNumber) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Report Number: ${report.reportNumber}`,
            font: FONT_NAME,
            size: FONT_SIZE,
            color: '000000'
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 }
      })
    )
  }

  // Date
  const reportDate = metadata?.reportDate || new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Effective Date: ${reportDate}`,
          font: FONT_NAME,
          size: FONT_SIZE,
          color: '000000'
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 }
    })
  )

  // Version
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Version: ${metadata?.reportVersion || '1.0'}`,
          font: FONT_NAME,
          size: FONT_SIZE,
          color: '000000'
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 }
    })
  )

  // Page break
  paragraphs.push(new Paragraph({ children: [new PageBreak()] }))

  return paragraphs
}

function createSignaturesPage(signatures: any): Paragraph[] {
  const paragraphs: Paragraph[] = []

  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'SIGNATURES',
          font: FONT_NAME,
          size: FONT_SIZE_HEADING1,
          bold: true,
          color: '000000'
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 480 }
    })
  )

  const roles = [
    { label: 'Prepared by:', value: signatures?.preparedBy || 'TBD' },
    { label: 'Reviewed by:', value: signatures?.reviewedBy || 'TBD' },
    { label: 'Approved by:', value: signatures?.approvedBy || 'TBD' }
  ]

  for (const role of roles) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: role.label,
            font: FONT_NAME,
            size: FONT_SIZE,
            bold: true,
            color: '000000'
          })
        ],
        spacing: { before: 360, after: 120 }
      })
    )

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: role.value,
            font: FONT_NAME,
            size: FONT_SIZE,
            color: '000000'
          })
        ],
        spacing: { after: 120 }
      })
    )

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Signature: _________________________     Date: ____________',
            font: FONT_NAME,
            size: FONT_SIZE,
            color: '000000'
          })
        ],
        spacing: { after: 240 }
      })
    )
  }

  paragraphs.push(new Paragraph({ children: [new PageBreak()] }))

  return paragraphs
}

function createTableOfContents(): any[] {
  const elements: any[] = []

  // TOC Title
  elements.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'TABLE OF CONTENTS',
          font: FONT_NAME,
          size: FONT_SIZE_HEADING1,
          bold: true,
          color: '000000'
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 }
    })
  )

  // Use docx TableOfContents which creates proper Word TOC field
  elements.push(
    new TableOfContents("Table of Contents", {
      hyperlink: true,
      headingStyleRange: "1-3",
      stylesWithLevels: [
        new StyleLevel("Heading1", 1),
        new StyleLevel("Heading2", 2),
        new StyleLevel("Heading3", 3),
      ]
    })
  )

  // Instruction text
  elements.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Right-click and select "Update Field" or press Ctrl+A then F9 to update',
          font: FONT_NAME,
          size: FONT_SIZE_FOOTNOTE,
          italics: true,
          color: '666666'
        })
      ],
      spacing: { before: 240, after: 240 }
    })
  )

  elements.push(new Paragraph({ children: [new PageBreak()] }))

  return elements
}

function createListOfTables(): any[] {
  const elements: any[] = []

  // LOT Title
  elements.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'LIST OF TABLES',
          font: FONT_NAME,
          size: FONT_SIZE_HEADING1,
          bold: true,
          color: '000000'
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 }
    })
  )

  // Use SimpleField for LOT: TOC \h \z \c "Table"
  elements.push(
    new Paragraph({
      children: [
        new SimpleField(' TOC \\h \\z \\c "Table" ', '[Update to see List of Tables - Press Ctrl+A then F9]')
      ],
      spacing: { after: 240 }
    })
  )

  elements.push(new Paragraph({ children: [new PageBreak()] }))

  return elements
}

function createListOfFigures(): any[] {
  const elements: any[] = []

  // LOF Title
  elements.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'LIST OF FIGURES',
          font: FONT_NAME,
          size: FONT_SIZE_HEADING1,
          bold: true,
          color: '000000'
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 }
    })
  )

  // Use SimpleField for LOF: TOC \h \z \c "Figure"
  elements.push(
    new Paragraph({
      children: [
        new SimpleField(' TOC \\h \\z \\c "Figure" ', '[Update to see List of Figures - Press Ctrl+A then F9]')
      ],
      spacing: { after: 240 }
    })
  )

  elements.push(new Paragraph({ children: [new PageBreak()] }))

  return elements
}

// ==========================================
// TABLE BUILDER with SEQ Field
// ==========================================

function buildTable(table: any): any[] {
  const result: any[] = []
  tableCounter++
  const tableNum = tableCounter

  // Caption with SEQ field (above table) - styled as Caption for LOT
  result.push(
    new Paragraph({
      style: 'Caption',
      children: [
        new TextRun({
          text: 'Table ',
          font: FONT_NAME,
          size: FONT_SIZE,
          bold: true,
          color: '000000'
        }),
        // SEQ field for auto-numbering
        new SimpleField(' SEQ Table \\* ARABIC ', String(tableNum)),
        new TextRun({
          text: `: ${table.caption}`,
          font: FONT_NAME,
          size: FONT_SIZE,
          bold: true,
          color: '000000'
        })
      ],
      spacing: { before: 240, after: 120 }
    })
  )

  // Build table rows
  const tableRows: TableRow[] = []

  // Header row
  if (table.headers && table.headers.length > 0) {
    tableRows.push(
      new TableRow({
        children: table.headers.map(
          (header: string) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: header,
                      font: FONT_NAME,
                      size: FONT_SIZE_SMALL,
                      bold: true,
                      color: '000000'
                    })
                  ],
                  alignment: AlignmentType.CENTER
                })
              ],
              shading: { fill: TABLE_HEADER_COLOR },
              verticalAlign: VerticalAlign.CENTER
            })
        ),
        tableHeader: true
      })
    )
  }

  // Data rows
  if (table.data && table.data.length > 0) {
    table.data.forEach((row: string[], rowIndex: number) => {
      tableRows.push(
        new TableRow({
          children: row.map(
            (cell: string, cellIndex: number) =>
              new TableCell({
                children: [
                  new Paragraph({
                    children: parseMarkdownToTextRuns(cell || '', FONT_SIZE_SMALL),
                    alignment: cellIndex === 0 ? AlignmentType.LEFT : AlignmentType.CENTER
                  })
                ],
                shading: rowIndex % 2 === 1 ? { fill: TABLE_ALT_ROW_COLOR } : undefined,
                verticalAlign: VerticalAlign.CENTER
              })
          )
        })
      )
    })
  }

  // Create the table
  if (tableRows.length > 0) {
    result.push(
      new Table({
        rows: tableRows,
        width: { size: 100, type: WidthType.PERCENTAGE }
      })
    )
  }

  // Footnotes
  if (table.footnotes && table.footnotes.length > 0) {
    for (const footnote of table.footnotes) {
      result.push(
        new Paragraph({
          children: parseMarkdownToTextRuns(footnote, FONT_SIZE_FOOTNOTE, true),
          spacing: { before: 60, after: 60 }
        })
      )
    }
  }

  // Spacing after table
  result.push(new Paragraph({ spacing: { after: 240 } }))

  return result
}

// ==========================================
// FIGURE BUILDER with SEQ Field and Image Embedding
// ==========================================

async function buildFigure(figure: any, figureFiles: UploadedFile[]): Promise<Paragraph[]> {
  const paragraphs: Paragraph[] = []
  figureCounter++
  const figNum = figureCounter

  // Try to find matching figure file or use figure URL
  let imageUrl = figure.url || figure.imageUrl || figure.blobUrl || null

  // If no URL in figure data, try to match with uploaded figure files by index or name
  if (!imageUrl && figureFiles.length > 0) {
    // Try to find by figure number (index)
    const figIndex = figNum - 1
    if (figureFiles[figIndex]) {
      imageUrl = figureFiles[figIndex].blobUrl
    }
  }

  // Try to fetch and embed the image
  let imageBuffer: Buffer | null = null
  if (imageUrl) {
    imageBuffer = await fetchImage(imageUrl)
  }

  if (imageBuffer) {
    // Embed the actual image
    paragraphs.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: imageBuffer,
            transformation: {
              width: 500, // ~6.9 inches at 72 DPI
              height: 350 // Proportional height, will be adjusted
            }
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 120 }
      })
    )
  } else {
    // Show placeholder if image couldn't be loaded
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `[Figure ${figNum} - Image not available${imageUrl ? ` (URL: ${imageUrl.substring(0, 50)}...)` : ''}]`,
            font: FONT_NAME,
            size: FONT_SIZE,
            italics: true,
            color: '666666'
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 120 }
      })
    )
  }

  // Caption with SEQ field (below figure) - styled as Caption for LOF
  paragraphs.push(
    new Paragraph({
      style: 'Caption',
      children: [
        new TextRun({
          text: 'Figure ',
          font: FONT_NAME,
          size: FONT_SIZE,
          bold: true,
          color: '000000'
        }),
        // SEQ field for auto-numbering
        new SimpleField(' SEQ Figure \\* ARABIC ', String(figNum)),
        new TextRun({
          text: `: ${figure.caption}`,
          font: FONT_NAME,
          size: FONT_SIZE,
          bold: true,
          color: '000000'
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 }
    })
  )

  return paragraphs
}

