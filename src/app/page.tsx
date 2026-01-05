"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { REPORT_TYPES } from "@/types"
import { UserMenu } from "@/components/auth/UserMenu"
import {
  FileText,
  Dna,
  MessageSquare,
  CheckCircle,
  ArrowRight,
  Activity,
  AlertTriangle,
  Beaker,
  Users,
  TestTube,
  GitBranch,
  Upload,
  Wand2,
  FileCheck,
  Sparkles
} from "lucide-react"

const iconMap: Record<string, React.ReactNode> = {
  Activity: <Activity className="h-6 w-6" />,
  AlertTriangle: <AlertTriangle className="h-6 w-6" />,
  Flask: <Beaker className="h-6 w-6" />,
  Users: <Users className="h-6 w-6" />,
  TestTube: <TestTube className="h-6 w-6" />,
  GitBranch: <GitBranch className="h-6 w-6" />,
}

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff6b6b] to-[#ff8e53] shadow-lg shadow-red-200/50">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53]">Pharmascribe</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/reports">
              <Button variant="ghost">My Reports</Button>
            </Link>
            <UserMenu />
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-red-50/50 via-orange-50/30 to-white py-20 relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#ff6b6b]/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#ff8e53]/10 rounded-full blur-3xl"></div>

        <div className="container text-center relative z-10">
          <div className="flex justify-center mb-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff6b6b] to-[#ff8e53] shadow-xl shadow-red-200/50">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53]">Pharmascribe</span>
          </h1>
          <p className="text-xl text-gray-600 mt-2 font-medium">Your AI Regulatory Writing Assistant</p>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Transform your study data into regulatory-compliant reports in minutes.
            Upload your tables, figures, and documents, and let AI generate publication-quality
            IND reports following FDA guidelines.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link href="/reports/new">
              <Button size="lg" className="gap-2 bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] hover:from-[#ff5252] hover:to-[#ff7b3a] shadow-lg shadow-red-200/50 border-0">
                Create New Report <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/reports">
              <Button size="lg" variant="outline" className="border-[#ff6b6b]/30 hover:bg-red-50 hover:border-[#ff6b6b]/50">
                View My Reports
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container">
          <h2 className="text-center text-3xl font-bold">How It Works</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            Generate compliant reports in four simple steps
          </p>

          <div className="mt-12 grid gap-8 md:grid-cols-4">
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff6b6b]/10 to-[#ff8e53]/10">
                  <Upload className="h-6 w-6 text-[#ff6b6b]" />
                </div>
                <CardTitle className="mt-4">1. Upload Data</CardTitle>
                <CardDescription>
                  Upload your CSV tables, figures, and protocol PDFs
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff6b6b]/10 to-[#ff8e53]/10">
                  <Wand2 className="h-6 w-6 text-[#ff8e53]" />
                </div>
                <CardTitle className="mt-4">2. AI Generation</CardTitle>
                <CardDescription>
                  AI analyzes your data and generates a complete report draft
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff6b6b]/10 to-[#ff8e53]/10">
                  <MessageSquare className="h-6 w-6 text-[#ff6b6b]" />
                </div>
                <CardTitle className="mt-4">3. Refine with Chat</CardTitle>
                <CardDescription>
                  Use AI chat to refine and revise sections interactively
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff6b6b]/10 to-[#ff8e53]/10">
                  <FileCheck className="h-6 w-6 text-[#ff6b6b]" />
                </div>
                <CardTitle className="mt-4">4. QC & Export</CardTitle>
                <CardDescription>
                  Run automated QC checks and export to Word or PDF
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Report Types Section */}
      <section className="bg-gray-50 py-20">
        <div className="container">
          <h2 className="text-center text-3xl font-bold">Supported Report Types</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            Generate all common IND filing report types with consistent formatting
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {REPORT_TYPES.map((type) => (
              <Card key={type.type} className="hover:shadow-lg transition-shadow border-0 shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff6b6b]/10 to-[#ff8e53]/10 text-[#ff6b6b]">
                      {iconMap[type.icon]}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{type.name}</CardTitle>
                    </div>
                  </div>
                  <CardDescription className="mt-2">
                    {type.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={`/reports/new?type=${type.type}`}>
                    <Button variant="outline" className="w-full">
                      Create {type.name} Report
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-b from-white to-red-50/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#ff6b6b]/5 rounded-full blur-3xl"></div>
        <div className="container text-center relative z-10">
          <h2 className="text-3xl font-bold">Ready to Get Started?</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Start generating your first IND report in minutes. No complex setup required.
          </p>
          <Link href="/reports/new">
            <Button size="lg" className="mt-8 gap-2 bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] hover:from-[#ff5252] hover:to-[#ff7b3a] shadow-lg shadow-red-200/50 border-0">
              Create Your First Report <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-900 py-8 text-white">
        <div className="container text-center text-sm">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-[#ff6b6b] to-[#ff8e53]">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53]">Pharmascribe</span>
          </div>
          <p className="text-gray-400">AI-Powered Regulatory Report Generation</p>
          <p className="mt-1 text-gray-500">pharmascribeai.com</p>
        </div>
      </footer>
    </div>
  )
}
