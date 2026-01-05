"use client"

import { Report, ReportSection, ReportTable, ReportFigure } from "@/types"

interface ReportPreviewProps {
  report: Report
}

// Helper to safely render content that might be string or object
function renderContent(content: any): string {
  if (content === null || content === undefined) {
    return ''
  }
  if (typeof content === 'string') {
    return content
  }
  if (typeof content === 'object') {
    // If it's an object, try to extract text or stringify nicely
    if (content.text) return content.text
    if (content.content) return renderContent(content.content)
    if (Array.isArray(content)) {
      return content.map(item =>
        typeof item === 'string' ? item : (item.text || item.content || '')
      ).join('\n')
    }
    // Last resort: don't show raw JSON, show placeholder
    return '[Content format error - please regenerate this section]'
  }
  return String(content)
}

// Helper to safely get table data as 2D array
function getTableData(data: any): string[][] {
  if (!data) return []

  // Already a proper 2D array
  if (Array.isArray(data)) {
    return data.map(row => {
      if (Array.isArray(row)) {
        return row.map(cell => String(cell ?? ''))
      }
      // Single value row
      return [String(row ?? '')]
    })
  }

  // String - might be JSON or placeholder
  if (typeof data === 'string') {
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(data)
      if (Array.isArray(parsed)) {
        return getTableData(parsed)
      }
    } catch {
      // Not JSON, show as single row message
      if (data.includes('<<<') || data.includes('EXTRACT')) {
        return [['Data extraction pending - please regenerate report']]
      }
      return [[data]]
    }
  }

  // Object with rows property
  if (typeof data === 'object' && data.rows) {
    return getTableData(data.rows)
  }

  return []
}

// Helper to safely render a cell value
function renderCell(cell: any): string {
  if (cell === null || cell === undefined) return ''
  if (typeof cell === 'string') return cell
  if (typeof cell === 'number') return String(cell)
  if (typeof cell === 'object') {
    if (cell.value !== undefined) return String(cell.value)
    if (cell.text !== undefined) return String(cell.text)
    return JSON.stringify(cell)
  }
  return String(cell)
}

export function ReportPreview({ report }: ReportPreviewProps) {
  const content = report.content as any

  if (!content) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        No content to preview
      </div>
    )
  }

  const { sections = [], tables = [], figures = [] } = content

  return (
    <div className="max-w-4xl mx-auto bg-white shadow-lg">
      <div className="p-12 report-preview">
        {/* Title Page */}
        <div className="text-center mb-12 pb-12 border-b-2">
          <h1 className="text-2xl font-bold mb-4">
            Bioanalytical/Pharmacokinetics Memorandum
          </h1>
          <p className="text-lg mb-2">{report.reportTitle}</p>
          <p className="mb-4">Study Number: {report.studyId}</p>
          {report.reportNumber && (
            <p className="mb-4">Report Number: {report.reportNumber}</p>
          )}
          <p className="text-sm text-gray-600 mt-8">
            Report Version: {report.reportVersion || "1.0"}
          </p>
        </div>

        {/* Metadata */}
        <div className="mb-8 text-sm">
          <table className="w-full">
            <tbody>
              {report.testFacility && (
                <tr>
                  <td className="py-1 font-semibold w-40">Test Facility:</td>
                  <td>{report.testFacility}</td>
                </tr>
              )}
              {report.species && (
                <tr>
                  <td className="py-1 font-semibold">Species:</td>
                  <td>{report.species}</td>
                </tr>
              )}
              {report.routeOfAdmin && (
                <tr>
                  <td className="py-1 font-semibold">Route:</td>
                  <td>{report.routeOfAdmin}</td>
                </tr>
              )}
              {report.doseLevel && (
                <tr>
                  <td className="py-1 font-semibold">Dose Level(s):</td>
                  <td>{report.doseLevel}</td>
                </tr>
              )}
              {report.analytes && (
                <tr>
                  <td className="py-1 font-semibold">Analyte(s):</td>
                  <td>{report.analytes}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Sections */}
        {sections.map((section: ReportSection, index: number) => (
          <div key={section.id} className="mb-6">
            {section.level === 1 && (
              <h1 className="text-xl font-bold mt-8 mb-4">
                {section.numbered && `${index + 1}. `}
                {section.title}
              </h1>
            )}
            {section.level === 2 && (
              <h2 className="text-lg font-bold mt-6 mb-3">
                {section.numbered && `${index + 1}.1 `}
                {section.title}
              </h2>
            )}
            {section.level === 3 && (
              <h3 className="text-base font-bold mt-4 mb-2">
                {section.numbered && `${index + 1}.1.1 `}
                {section.title}
              </h3>
            )}
            <div className="whitespace-pre-wrap">{renderContent(section.content)}</div>

            {/* Tables in this section */}
            {tables
              .filter((t: ReportTable) => t.sectionId === section.id)
              .map((table: any) => (
                <div key={table.id} className="my-6 overflow-x-auto">
                  <p className="font-bold mb-2">
                    Table {table.number || table.order}: {table.caption}
                  </p>
                  <table className="w-full text-sm border-collapse border border-gray-300">
                    <thead className="bg-gray-100">
                      <tr>
                        {table.headers?.map((header: string, i: number) => (
                          <th key={i} className="text-left px-3 py-2 border border-gray-300 font-semibold">
                            {renderCell(header)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {getTableData(table.data).map((row: string[], rowIndex: number) => (
                        <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          {row.map((cell: string, cellIndex: number) => (
                            <td key={cellIndex} className="px-3 py-2 border border-gray-300">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {table.footnotes && table.footnotes.length > 0 && (
                    <div className="text-xs mt-2 italic text-gray-600">
                      {table.footnotes.map((note: string, i: number) => (
                        <p key={i}>{note}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}

            {/* Figures in this section */}
            {figures
              .filter((f: ReportFigure) => f.sectionId === section.id)
              .map((figure: any) => (
                <div key={figure.id} className="my-6 text-center">
                  {(figure.blobUrl || figure.imageUrl) ? (
                    <img
                      src={figure.blobUrl || figure.imageUrl}
                      alt={figure.caption || figure.filename}
                      className="max-w-full mx-auto border rounded shadow-sm"
                    />
                  ) : (
                    <div className="bg-gray-100 p-8 text-gray-500 rounded border">
                      Figure: {figure.filename || 'No image available'}
                    </div>
                  )}
                  <p className="font-bold mt-2">
                    Figure {figure.number || figure.order}: {figure.caption || figure.filename}
                  </p>
                </div>
              ))}
          </div>
        ))}

        {/* Tables not associated with a section */}
        {tables.filter((t: any) => !t.sectionId || !sections.find((s: any) => s.id === t.sectionId)).length > 0 && (
          <div className="mt-8 pt-8 border-t">
            <h2 className="text-lg font-bold mb-4">Tables</h2>
            {tables
              .filter((t: any) => !t.sectionId || !sections.find((s: any) => s.id === t.sectionId))
              .map((table: any) => (
                <div key={table.id} className="my-6 overflow-x-auto">
                  <p className="font-bold mb-2">
                    Table {table.number || table.order}: {table.caption}
                  </p>
                  <table className="w-full text-sm border-collapse border border-gray-300">
                    <thead className="bg-gray-100">
                      <tr>
                        {table.headers?.map((header: string, i: number) => (
                          <th key={i} className="text-left px-3 py-2 border border-gray-300 font-semibold">
                            {renderCell(header)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {getTableData(table.data).map((row: string[], rowIndex: number) => (
                        <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          {row.map((cell: string, cellIndex: number) => (
                            <td key={cellIndex} className="px-3 py-2 border border-gray-300">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {table.footnotes && table.footnotes.length > 0 && (
                    <div className="text-xs mt-2 italic text-gray-600">
                      {table.footnotes.map((note: string, i: number) => (
                        <p key={i}>{note}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* Figures not associated with a section */}
        {figures.filter((f: any) => !f.sectionId || !sections.find((s: any) => s.id === f.sectionId)).length > 0 && (
          <div className="mt-8 pt-8 border-t">
            <h2 className="text-lg font-bold mb-4">Figures</h2>
            {figures
              .filter((f: any) => !f.sectionId || !sections.find((s: any) => s.id === f.sectionId))
              .map((figure: any) => (
                <div key={figure.id} className="my-6 text-center">
                  {(figure.blobUrl || figure.imageUrl) ? (
                    <img
                      src={figure.blobUrl || figure.imageUrl}
                      alt={figure.caption || figure.filename}
                      className="max-w-full mx-auto border rounded shadow-sm"
                    />
                  ) : (
                    <div className="bg-gray-100 p-8 text-gray-500 rounded border">
                      Figure: {figure.filename || 'No image available'}
                    </div>
                  )}
                  <p className="font-bold mt-2">
                    Figure {figure.number || figure.order}: {figure.caption || figure.filename}
                  </p>
                </div>
              ))}
          </div>
        )}

        {/* Appendix Tables */}
        {content.appendixTables && content.appendixTables.length > 0 && (
          <div className="mt-8 pt-8 border-t">
            <h2 className="text-xl font-bold mb-4">Appendix Tables</h2>
            {content.appendixTables.map((table: any) => (
              <div key={table.id} className="my-6 overflow-x-auto">
                <p className="font-bold mb-2">
                  Table {table.number}: {table.caption}
                </p>
                <table className="w-full text-sm border-collapse border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      {table.headers?.map((header: string, i: number) => (
                        <th key={i} className="text-left px-3 py-2 border border-gray-300 font-semibold">
                          {renderCell(header)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {getTableData(table.data).map((row: string[], rowIndex: number) => (
                      <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {row.map((cell: string, cellIndex: number) => (
                          <td key={cellIndex} className="px-3 py-2 border border-gray-300">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {table.footnotes && table.footnotes.length > 0 && (
                  <div className="text-xs mt-2 italic text-gray-600">
                    {table.footnotes.map((note: string, i: number) => (
                      <p key={i}>{note}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
