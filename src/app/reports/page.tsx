"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
  Dna,
  LogOut
} from "lucide-react"
import { getReportTypeLabel, getStatusColor, formatDateTime } from "@/lib/utils"
import { useInactivityLogout } from "@/hooks/useInactivityLogout"
import type { Report } from "@/types"

export default function ReportsPage() {
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  // Auto-logout after 1 hour of inactivity
  useInactivityLogout()

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

  const handleLogout = async () => {
    try {
      // Clear localStorage tokens
      localStorage.removeItem('cognito_access_token')
      localStorage.removeItem('cognito_id_token')
      localStorage.removeItem('cognito_refresh_token')

      // Call logout API to clear httpOnly cookies
      await fetch('/api/auth/logout', { method: 'POST' })

      // Redirect to login
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      // Still redirect even if there's an error
      router.push('/login')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-14 sm:h-16 items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2 sm:gap-3">
              <img src="/logo.png" alt="Pharmascribe" className="h-6 w-6 sm:h-8 sm:w-8 object-contain" />
              <span className="text-base sm:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53]">My Reports</span>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link href="/reports/new">
              <Button size="sm" className="gap-1 sm:gap-2 text-xs sm:text-sm bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] hover:from-[#ff5252] hover:to-[#ff7b3a] border-0">
                <Plus className="h-3 w-3 sm:h-4 sm:w-4" /> <span className="hidden xs:inline">New</span> Report
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-1 sm:gap-2 text-xs sm:text-sm"
            >
              <LogOut className="h-3 w-3 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-4 sm:py-6 md:py-8 px-4 sm:px-6">
        {loading ? (
          <div className="flex items-center justify-center py-12 sm:py-20">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading reports...</p>
            </div>
          </div>
        ) : reports.length === 0 ? (
          <Card className="py-12 sm:py-20">
            <CardContent className="text-center">
              <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto" />
              <h3 className="mt-4 text-base sm:text-lg font-semibold">No reports yet</h3>
              <p className="mt-2 text-sm sm:text-base text-muted-foreground">
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
          <div className="grid gap-3 sm:gap-4">
            {reports.map((report) => (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 p-4 sm:p-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <CardTitle className="text-base sm:text-lg truncate">{report.reportTitle}</CardTitle>
                      <Badge className={`${getStatusColor(report.status)} text-xs`}>
                        {report.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <CardDescription className="mt-1 text-xs sm:text-sm">
                      {report.studyId} | {getReportTypeLabel(report.reportType)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href={`/reports/${report.id}`}>
                      <Button variant="outline" size="sm" className="gap-1 sm:gap-2 text-xs sm:text-sm">
                        <Edit className="h-3 w-3 sm:h-4 sm:w-4" /> Edit
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteReport(report.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>Updated {formatDateTime(report.updatedAt)}</span>
                    </div>
                    {report.species && (
                      <span className="hidden sm:inline">Species: {report.species}</span>
                    )}
                    {report.doseLevel && (
                      <span className="hidden sm:inline">Dose: {report.doseLevel}</span>
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
