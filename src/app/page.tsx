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
  Sparkles,
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
      <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-90 transition-opacity">
            <img src="/logo.png" alt="Pharmascribe" className="h-8 w-8 sm:h-10 sm:w-10 object-contain" />
            <span className="text-lg sm:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53]">Pharmascribe</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link href="/reports">
              <Button variant="ghost" size="sm" className="text-xs sm:text-sm">My Reports</Button>
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
            <img src="/logo.png" alt="Pharmascribe" className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 object-contain" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53]">Pharmascribe</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 mt-2 font-medium">Your AI Regulatory Writing Assistant</p>
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

      {/* About the Developer Section */}
      <section className="py-10 md:py-16 lg:py-20 bg-white">
        <div className="container">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold">Built by an Industry Expert</h2>
              <p className="mt-4 text-muted-foreground">
                Pharmascribe is developed by someone who understands the challenges of regulatory writing firsthand.
              </p>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 sm:p-8 md:p-12">
              <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
                {/* Developer Photo */}
                <div className="flex-shrink-0">
                  <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden shadow-xl shadow-gray-300/50 ring-4 ring-white">
                    <img
                      src="/headshot.jpg"
                      alt="Husain Attarwala, PhD"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Developer Info */}
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-2xl font-bold text-gray-900">Husain Attarwala, PhD</h3>
                  <p className="text-[#ff6b6b] font-medium mt-1">Founder & Developer</p>

                  <p className="mt-4 text-gray-600 leading-relaxed">
                    With 15 years of experience in pharmaceutical development, I've personally contributed to
                    <span className="font-semibold text-gray-900"> 25+ IND submissions</span> and worked on
                    <span className="font-semibold text-gray-900"> 7 FDA-approved drugs</span>. I built Pharmascribe
                    to solve the pain points I experienced firsthand - transforming weeks of manual report writing
                    into minutes of AI-assisted generation.
                  </p>

                  <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-4">
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
                      <span className="text-2xl font-bold text-[#ff6b6b]">25+</span>
                      <span className="text-sm text-gray-600">IND Submissions</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
                      <span className="text-2xl font-bold text-[#ff6b6b]">7</span>
                      <span className="text-sm text-gray-600">Approved Drugs</span>
                    </div>
                  </div>

                  <div className="mt-6">
                    <a
                      href="https://www.linkedin.com/in/husainattarwala/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[#0077b5] hover:text-[#005582] font-medium transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                      Connect on LinkedIn
                    </a>
                  </div>
                </div>
              </div>
            </div>
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
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-[#ff6b6b] to-[#ff8e53]">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53]">Pharmascribe</span>
          </div>
          <p className="text-gray-400 text-sm">AI-Powered Regulatory Report Generation</p>
          <p className="mt-2 text-gray-500 text-xs">&copy; {new Date().getFullYear()} Pharmascribe. All rights reserved.</p>
        </div>
      </footer>
    </div>
    </>
  )
}
