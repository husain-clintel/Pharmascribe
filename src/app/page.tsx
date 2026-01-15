import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { REPORT_TYPES } from "@/types"
import { UserMenu } from "@/components/auth/UserMenu"
import { HomePageStructuredData } from "@/components/seo/StructuredData"
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
  Play,
  Menu
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
    <>
      <HomePageStructuredData />
      <div className="min-h-screen overflow-x-hidden">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity flex-shrink-0">
            <img src="/logo.png" alt="ARIA" className="h-8 w-8 object-contain" />
            <span className="hidden xs:inline text-base sm:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53]">ARIA</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-3">
            <Link href="/reports">
              <Button variant="ghost" size="sm" className="text-xs sm:text-sm px-2 sm:px-3">My Reports</Button>
            </Link>
            <UserMenu />
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-red-50/50 via-orange-50/30 to-white py-10 md:py-16 lg:py-20 relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#ff6b6b]/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#ff8e53]/10 rounded-full blur-3xl"></div>

        <div className="container text-center relative z-10">
          <div className="flex justify-center mb-4 sm:mb-6">
            <img src="/logo.png" alt="ARIA" className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 object-contain" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53]">ARIA</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 mt-2 font-medium">AI Regulatory IND Assistant</p>
          <p className="mx-auto mt-4 sm:mt-6 max-w-2xl text-base sm:text-lg text-muted-foreground px-4">
            Transform your study data into regulatory-compliant reports in minutes.
            Upload your tables, figures, and documents, and let AI generate publication-quality
            IND reports following FDA guidelines.
          </p>
          <div className="mt-8 md:mt-10 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4">
            <Link href="/reports/new" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto gap-2 bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] hover:from-[#ff5252] hover:to-[#ff7b3a] shadow-lg shadow-red-200/50 border-0">
                Create New Report <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/reports" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-[#ff6b6b]/30 hover:bg-red-50 hover:border-[#ff6b6b]/50">
                View My Reports
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-10 md:py-16 lg:py-20">
        <div className="container">
          <h2 className="text-center text-2xl sm:text-3xl font-bold">How It Works</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            Generate compliant reports in four simple steps
          </p>

          <div className="mt-8 md:mt-12 grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
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

      {/* Try It Out Section */}
      <section className="bg-gradient-to-b from-white to-gray-50 py-10 md:py-16 lg:py-20">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center px-4">
            <div className="flex justify-center mb-6">
              <Link href="/reports/new?demo=true" className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-200/50 hover:from-blue-600 hover:to-cyan-600 transition-all cursor-pointer">
                <Play className="h-8 w-8 text-white" />
              </Link>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold">Try It Out</h2>
            <p className="mt-4 text-muted-foreground">
              Experience the full workflow with our sample theophylline PK study data.
              No signup required - just click and explore!
            </p>
            <Link href="/reports/new?demo=true">
              <Button size="lg" className="mt-8 gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-lg shadow-blue-200/50 border-0">
                Try Demo <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Report Types Section */}
      <section className="bg-gray-50 py-10 md:py-16 lg:py-20">
        <div className="container">
          <h2 className="text-center text-2xl sm:text-3xl font-bold">Supported Report Types</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground px-4">
            Generate all common IND filing report types with consistent formatting
          </p>

          <div className="mt-8 md:mt-12 grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
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
      <section className="py-10 md:py-16 lg:py-20 bg-gradient-to-b from-white to-red-50/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#ff6b6b]/5 rounded-full blur-3xl"></div>
        <div className="container text-center relative z-10 px-4">
          <h2 className="text-2xl sm:text-3xl font-bold">Ready to Get Started?</h2>
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
        <div className="container text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src="/logo-dark.png" alt="ARIA" className="h-6 w-6 object-contain" />
            <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53]">ARIA</span>
          </div>
          <p className="text-gray-400 text-sm">AI Regulatory IND Assistant</p>
          <p className="mt-2 text-gray-500 text-xs">&copy; {new Date().getFullYear()} ARIA. All rights reserved.</p>
        </div>
      </footer>
    </div>
    </>
  )
}
