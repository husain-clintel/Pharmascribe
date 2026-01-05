"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  RefreshCw,
  Loader2,
  Check,
  X
} from "lucide-react"
import { getSeverityColor } from "@/lib/utils"
import type { QCResult } from "@/types"

export default function QCPage() {
  const params = useParams()
  const router = useRouter()
  const [qcResults, setQcResults] = useState<QCResult[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [summary, setSummary] = useState<any>(null)

  useEffect(() => {
    fetchQCResults()
  }, [params.id])

  const fetchQCResults = async () => {
    try {
      const res = await fetch(`/api/reports/${params.id}/qc`)
      if (res.ok) {
        const data = await res.json()
        setQcResults(data)
        updateSummary(data)
      }
    } catch (error) {
      console.error('Failed to fetch QC results:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateSummary = (results: QCResult[]) => {
    setSummary({
      total: results.length,
      critical: results.filter(r => r.severity === 'CRITICAL').length,
      major: results.filter(r => r.severity === 'MAJOR').length,
      minor: results.filter(r => r.severity === 'MINOR').length,
      info: results.filter(r => r.severity === 'INFO').length,
      pending: results.filter(r => r.status === 'PENDING').length,
      fixed: results.filter(r => r.status === 'FIXED').length
    })
  }

  const runQC = async () => {
    setRunning(true)
    try {
      const res = await fetch(`/api/reports/${params.id}/qc`, {
        method: 'POST'
      })

      if (res.ok) {
        const data = await res.json()
        setQcResults(data.results)
        setSummary(data.summary)
      } else {
        alert('Failed to run QC')
      }
    } catch (error) {
      console.error('Failed to run QC:', error)
    } finally {
      setRunning(false)
    }
  }

  const updateIssueStatus = async (issueId: string, status: string) => {
    try {
      const res = await fetch(`/api/reports/${params.id}/qc`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueId, status })
      })

      if (res.ok) {
        setQcResults(prev =>
          prev.map(r => r.id === issueId ? { ...r, status: status as any } : r)
        )
        updateSummary(qcResults.map(r =>
          r.id === issueId ? { ...r, status: status as any } : r
        ))
      }
    } catch (error) {
      console.error('Failed to update issue:', error)
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'MAJOR':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />
      case 'MINOR':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      default:
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/reports/${params.id}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              <span className="font-semibold">Quality Control</span>
            </div>
          </div>
          <Button
            onClick={runQC}
            disabled={running}
            className="gap-2"
          >
            {running ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running QC...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Run QC Check
              </>
            )}
          </Button>
        </div>
      </header>

      <main className="container py-8">
        {/* Summary Cards */}
        {summary && (
          <div className="grid gap-4 md:grid-cols-5 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{summary.total}</div>
                <p className="text-sm text-muted-foreground">Total Issues</p>
              </CardContent>
            </Card>
            <Card className="border-red-200">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">{summary.critical}</div>
                <p className="text-sm text-muted-foreground">Critical</p>
              </CardContent>
            </Card>
            <Card className="border-orange-200">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-orange-600">{summary.major}</div>
                <p className="text-sm text-muted-foreground">Major</p>
              </CardContent>
            </Card>
            <Card className="border-yellow-200">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-yellow-600">{summary.minor}</div>
                <p className="text-sm text-muted-foreground">Minor</p>
              </CardContent>
            </Card>
            <Card className="border-green-200">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{summary.fixed}</div>
                <p className="text-sm text-muted-foreground">Fixed</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Issues List */}
        {loading ? (
          <div className="text-center py-20">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">Loading QC results...</p>
          </div>
        ) : qcResults.length === 0 ? (
          <Card className="py-20">
            <CardContent className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <h3 className="mt-4 text-lg font-semibold">No Issues Found</h3>
              <p className="mt-2 text-muted-foreground">
                Run QC check to analyze the report for potential issues
              </p>
              <Button onClick={runQC} className="mt-6 gap-2">
                <RefreshCw className="h-4 w-4" />
                Run QC Check
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {qcResults.map((result) => (
              <Card
                key={result.id}
                className={`transition-opacity ${
                  result.status === 'FIXED' || result.status === 'DISMISSED'
                    ? 'opacity-60'
                    : ''
                }`}
              >
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {getSeverityIcon(result.severity)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getSeverityColor(result.severity)}>
                          {result.severity}
                        </Badge>
                        <Badge variant="outline">{result.category}</Badge>
                        <span className="text-sm text-muted-foreground">
                          Section: {result.section}
                        </span>
                      </div>
                      <p className="font-medium">{result.issue}</p>
                      {result.suggestion && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Suggestion: {result.suggestion}
                        </p>
                      )}
                      {result.status !== 'PENDING' && (
                        <Badge
                          variant="outline"
                          className={`mt-2 ${
                            result.status === 'FIXED'
                              ? 'border-green-500 text-green-600'
                              : 'border-gray-400'
                          }`}
                        >
                          {result.status}
                        </Badge>
                      )}
                    </div>
                    {result.status === 'PENDING' && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateIssueStatus(result.id, 'FIXED')}
                          className="gap-1"
                        >
                          <Check className="h-3 w-3" />
                          Fixed
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateIssueStatus(result.id, 'DISMISSED')}
                          className="gap-1"
                        >
                          <X className="h-3 w-3" />
                          Dismiss
                        </Button>
                      </div>
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
