import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "sonner"
import { Providers } from "@/components/providers/Providers"

const inter = Inter({ subsets: ["latin"] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ff6b6b',
}

export const metadata: Metadata = {
  metadataBase: new URL('https://www.pharmascribeai.com'),
  title: {
    default: "Pharmascribe - AI Regulatory Writing Assistant for IND Reports",
    template: "%s | Pharmascribe",
  },
  description: "Transform your study data into regulatory-compliant IND reports in minutes. AI-powered generation of PK, toxicology, CMC, and clinical pharmacology reports following FDA guidelines. Built by a pharmaceutical industry expert with 25+ IND submissions.",
  keywords: [
    "regulatory writing",
    "IND reports",
    "pharmacokinetics",
    "PK report",
    "NCA analysis",
    "FDA submission",
    "drug development",
    "pharmaceutical",
    "biotech",
    "clinical pharmacology",
    "toxicology report",
    "CMC report",
    "ADME",
    "regulatory compliance",
    "AI writing assistant",
    "report generation",
    "preclinical studies",
    "investigational new drug",
    "regulatory documents",
    "pharma AI",
  ],
  authors: [{ name: "Husain Attarwala, PhD", url: "https://www.linkedin.com/in/husainattarwala/" }],
  creator: "Pharmascribe",
  publisher: "Pharmascribe",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.pharmascribeai.com",
    siteName: "Pharmascribe",
    title: "Pharmascribe - AI Regulatory Writing Assistant",
    description: "Transform your study data into regulatory-compliant IND reports in minutes. AI-powered generation of PK, toxicology, CMC, and clinical pharmacology reports. Built by an industry expert with 25+ IND submissions.",
    images: [
      {
        url: "/headshot.jpg",
        width: 400,
        height: 400,
        alt: "Pharmascribe - AI Regulatory Writing Assistant",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Pharmascribe - AI Regulatory Writing Assistant",
    description: "Transform your study data into regulatory-compliant IND reports in minutes with AI-powered document generation.",
    images: ["/headshot.jpg"],
  },
  alternates: {
    canonical: "https://www.pharmascribeai.com",
  },
  category: "Technology",
  classification: "Business Software",
  other: {
    'llms.txt': 'https://www.pharmascribeai.com/llms.txt',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <TooltipProvider>
            <div className="min-h-screen bg-background">
              {children}
            </div>
            <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              duration: 4000,
              style: {
                background: 'white',
                border: '1px solid #e2e8f0',
              },
            }}
          />
          </TooltipProvider>
        </Providers>
      </body>
    </html>
  )
}
