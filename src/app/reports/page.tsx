"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  Plus,
  Clock,
  MoreVertical,
  Trash2,
  Edit,
  Download,
  ArrowLeft,
  Dna
} from "lucide-react"
import { getReportTypeLabel, getStatusColor, formatDateTime } from "@/lib/utils"
import type { Report } from "@/types"

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/reports')
      if (res.ok) {
        const data = await res.json()
        setReports(data)
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteReport = async (id: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return

    try {
      const res = await fetch(`/api/reports/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setReports(reports.filter(r => r.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete report:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#ff6b6b] to-[#ff8e53] shadow-md shadow-red-200/50">
                <Dna className="h-4 w-4 text-white" />
              </div>
              <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53]">My Reports</span>
            </div>
          </div>
          <Link href="/reports/new">
            <Button className="gap-2 bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] hover:from-[#ff5252] hover:to-[#ff7b3a] border-0">
              <Plus className="h-4 w-4" /> New Report
            </Button>
          </Link>
        </div>
      </header>

      <main className="container py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading reports...</p>
            </div>
          </div>
        ) : reports.length === 0 ? (
          <Card className="py-20">
            <CardContent className="text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
              <h3 className="mt-4 text-lg font-semibold">No reports yet</h3>
              <p className="mt-2 text-muted-foreground">
                Create your first IND report to get started
              </p>
              <Link href="/reports/new">
                <Button className="mt-6 gap-2">
                  <Plus className="h-4 w-4" /> Create Report
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {reports.map((report) => (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">{report.reportTitle}</CardTitle>
                      <Badge className={getStatusColor(report.status)}>
                        {report.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <CardDescription className="mt-1">
                      {report.studyId} | {getReportTypeLabel(report.reportType)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/reports/${report.id}`}>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Edit className="h-4 w-4" /> Edit
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteReport(report.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>Updated {formatDateTime(report.updatedAt)}</span>
                    </div>
                    {report.species && (
                      <span>Species: {report.species}</span>
                    )}
                    {report.doseLevel && (
                      <span>Dose: {report.doseLevel}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
