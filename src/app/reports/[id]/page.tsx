"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
  FileText,
  ArrowLeft,
  Dna,
  MessageSquare,
  CheckCircle,
  Download,
  Settings,
  ChevronRight,
  Loader2,
  RefreshCw,
  Trash2,
  X,
  Image as ImageIcon,
  Zap
} from "lucide-react"
import { getReportTypeLabel, getStatusColor } from "@/lib/utils"
import type { Report, ReportSection, REPORT_TYPES } from "@/types"
import { ReportPreview } from "@/components/report/ReportPreview"
import { SectionEditor } from "@/components/report/SectionEditor"
import { ChatPanel } from "@/components/chat/ChatPanel"
import { GenerationProgress } from "@/components/report/GenerationProgress"

// Helper function to get file icon based on file type
function getFileIcon(file: any) {
  const filename = file.filename?.toLowerCase() || ''
  const fileType = file.fileType

  if (fileType === 'FIGURE' || /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(filename)) {
    return <ImageIcon className="h-3 w-3" />
  }
  return <FileText className="h-3 w-3" />
}

export default function ReportEditorPage() {
  const params = useParams()
  const router = useRouter()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("editor")

  useEffect(() => {
    if (params.id) {
      fetchReport()
    }
  }, [params.id])

  const fetchReport = async () => {
    try {
      const res = await fetch(`/api/reports/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setReport(data)
      } else {
        router.push('/reports')
      }
    } catch (error) {
      console.error('Failed to fetch report:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    toast.loading('Generating report...', { id: 'generate' })
    try {
      const res = await fetch(`/api/reports/${params.id}/generate`, {
        method: 'POST'
      })

      if (res.ok) {
        await fetchReport()
        toast.success('Report generated successfully!', { id: 'generate' })
      } else {
        const data = await res.json()
        toast.error(`Failed to generate: ${data.error || 'Unknown error'}`, { id: 'generate' })
      }
    } catch (error) {
      console.error('Failed to generate:', error)
      toast.error('Failed to generate report. Please try again.', { id: 'generate' })
    } finally {
      setGenerating(false)
    }
  }

  const handleExport = async (format: 'docx' | 'pdf') => {
    toast.loading('Exporting report...', { id: 'export' })
    try {
      const res = await fetch(`/api/reports/${params.id}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format })
      })

      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${report?.studyId}_Report.${format}`
        a.click()
        window.URL.revokeObjectURL(url)
        toast.success('Report exported successfully!', { id: 'export' })
      } else {
        toast.error('Export failed. Please try again.', { id: 'export' })
      }
    } catch (error) {
      console.error('Failed to export:', error)
      toast.error('Export failed. Please try again.', { id: 'export' })
    }
  }

  const handleResetReport = async () => {
    if (!confirm('Are you sure you want to reset the report? This will clear the generated content but keep your uploaded files.')) {
      return
    }

    toast.loading('Resetting report...', { id: 'reset' })
    try {
      const res = await fetch(`/api/reports/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: null, status: 'DRAFT' })
      })

      if (res.ok) {
        await fetchReport()
        toast.success('Report reset. Ready to regenerate.', { id: 'reset' })
      } else {
        toast.error('Failed to reset report', { id: 'reset' })
      }
    } catch (error) {
      console.error('Failed to reset report:', error)
      toast.error('Failed to reset report', { id: 'reset' })
    }
  }

  const handleDeleteFile = async (fileId: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) {
      return
    }

    try {
      const res = await fetch(`/api/upload/${fileId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        await fetchReport()
        toast.success(`${filename} deleted`)
      } else {
        toast.error('Failed to delete file')
      }
    } catch (error) {
      console.error('Failed to delete file:', error)
      toast.error('Failed to delete file')
    }
  }

  const [reextractingFile, setReextractingFile] = useState<string | null>(null)

  const handleReextractFile = async (fileId: string) => {
    setReextractingFile(fileId)
    toast.loading('Re-extracting file content...', { id: 'reextract' })
    try {
      const res = await fetch(`/api/upload/${fileId}/reextract`, {
        method: 'POST'
      })

      if (res.ok) {
        const data = await res.json()
        await fetchReport()
        toast.success(`Content extracted from ${data.filename}`, { id: 'reextract' })
      } else {
        const data = await res.json()
        toast.error(`Failed to extract: ${data.error}`, { id: 'reextract' })
      }
    } catch (error) {
      console.error('Failed to re-extract file:', error)
      toast.error('Failed to re-extract file', { id: 'reextract' })
    } finally {
      setReextractingFile(null)
    }
  }

  // Check if a file has valid extracted data
  const hasExtractedData = (file: any) => {
    if (!file.extractedData) return false
    const data = file.extractedData as any
    // Images don't need text extraction - they're valid as-is
    if (data.type === 'image') return true
    if (data.error) return false
    if (data.content && data.content.includes('extraction failed')) return false
    if (data.content && data.content.includes('No extracted data')) return false
    return true
  }

  const updateReportContent = async (content: any) => {
    try {
      const res = await fetch(`/api/reports/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })

      if (res.ok) {
        setReport(prev => prev ? { ...prev, content } : null)
      }
    } catch (error) {
      console.error('Failed to update content:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading report...</p>
        </div>
      </div>
    )
  }

  if (!report) {
    return null
  }

  const sections = (report.content as any)?.sections || []

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/reports">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#ff6b6b] to-[#ff8e53] shadow-md shadow-red-200/50">
                <Dna className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="font-semibold">{report.reportTitle}</h1>
                <p className="text-xs text-muted-foreground">
                  {report.studyId} | {getReportTypeLabel(report.reportType)}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(report.status)}>
              {report.status.replace('_', ' ')}
            </Badge>
            {!report.content && (
              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Generate Report
                  </>
                )}
              </Button>
            )}
            {report.content && (
              <>
                <Button
                  variant="outline"
                  onClick={handleResetReport}
                  className="gap-2"
                  title="Reset and regenerate report"
                >
                  <RefreshCw className="h-4 w-4" />
                  Regenerate
                </Button>
                <Button variant="outline" onClick={() => handleExport('docx')} className="gap-2">
                  <Download className="h-4 w-4" />
                  Export DOCX
                </Button>
                <Link href={`/reports/${params.id}/qc`}>
                  <Button variant="outline" className="gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Run QC
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Sidebar - Section Navigation */}
        <aside className="w-64 border-r bg-white p-4 hidden lg:block">
          <h2 className="font-semibold mb-4">Sections</h2>
          <ScrollArea className="h-[calc(100vh-180px)]">
            {sections.length > 0 ? (
              <nav className="space-y-1">
                {sections.map((section: ReportSection) => (
                  <button
                    key={section.id}
                    onClick={() => setSelectedSection(section.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedSection === section.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {section.numbered && (
                        <span className="text-muted-foreground">
                          {section.level === 1 ? "1." : section.level === 2 ? "1.1" : "1.1.1"}
                        </span>
                      )}
                      <span className="truncate">{section.title}</span>
                    </div>
                  </button>
                ))}
              </nav>
            ) : (
              <p className="text-sm text-muted-foreground">
                No sections yet. Generate the report to create sections.
              </p>
            )}
          </ScrollArea>

          <Separator className="my-4" />

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Uploaded Files</h3>
            {report.uploadedFiles?.length ? (
              <ul className="space-y-1">
                {report.uploadedFiles.map((file) => (
                  <li key={file.id} className="text-xs flex items-center gap-1.5 group py-1">
                    <span className={`flex-shrink-0 ${!hasExtractedData(file) ? 'text-amber-500' : 'text-green-600'}`}>
                      {getFileIcon(file)}
                    </span>
                    <span className="truncate flex-1" title={file.filename}>{file.filename}</span>
                    {!hasExtractedData(file) && (
                      <button
                        onClick={() => handleReextractFile(file.id)}
                        disabled={reextractingFile === file.id}
                        className="text-blue-500 hover:text-blue-700 p-0.5 rounded"
                        title="Re-extract content from file"
                      >
                        {reextractingFile === file.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteFile(file.id, file.filename)}
                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-0.5 rounded transition-opacity"
                      title="Delete file"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">No files uploaded</p>
            )}
            {report.uploadedFiles?.some(f => !hasExtractedData(f)) && (
              <p className="text-xs text-amber-600">
                Files marked in amber need re-extraction. Click the refresh icon.
              </p>
            )}
          </div>
        </aside>

        {/* Main Editor Area */}
        <main className="flex-1 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="border-b bg-white px-4">
              <TabsList className="h-12">
                <TabsTrigger value="editor" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Editor
                </TabsTrigger>
                <TabsTrigger value="preview" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="chat" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  AI Chat
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="editor" className="flex-1 p-4 mt-0">
              {report.content ? (
                <SectionEditor
                  sections={sections}
                  selectedSection={selectedSection}
                  onSelectSection={setSelectedSection}
                  onUpdateSection={(sectionId, content) => {
                    const updatedSections = sections.map((s: ReportSection) =>
                      s.id === sectionId ? { ...s, content } : s
                    )
                    updateReportContent({ ...report.content, sections: updatedSections })
                  }}
                />
              ) : generating ? (
                <div className="flex items-center justify-center mt-12">
                  <GenerationProgress isGenerating={generating} reportId={report.id} />
                </div>
              ) : (
                <Card className="max-w-xl mx-auto mt-20">
                  <CardHeader className="text-center">
                    <Dna className="h-12 w-12 text-primary mx-auto mb-4" />
                    <CardTitle>Generate Your Report</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-muted-foreground mb-6">
                      Click the Generate button to create your report using AI.
                      The system will analyze your uploaded data and generate
                      a complete draft following regulatory guidelines.
                    </p>
                    <Button
                      onClick={handleGenerate}
                      disabled={generating}
                      size="lg"
                      className="gap-2"
                    >
                      <Zap className="h-4 w-4" />
                      Generate Report
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="preview" className="flex-1 p-4 mt-0 overflow-auto">
              {report.content ? (
                <ReportPreview report={report} />
              ) : (
                <div className="text-center py-20 text-muted-foreground">
                  Generate the report to see a preview
                </div>
              )}
            </TabsContent>

            <TabsContent value="chat" className="flex-1 mt-0">
              <ChatPanel
                reportId={report.id}
                messages={report.chatMessages || []}
                onRefreshReport={fetchReport}
              />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
