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
  metadataBase: new URL('https://aria.clintel.ai'),
  title: {
    default: "ARIA - AI Regulatory IND Assistant",
    template: "%s | ARIA",
  },
  description: "Transform your study data into regulatory-compliant IND reports in minutes. AI-powered generation of PK, toxicology, CMC, and clinical pharmacology reports following FDA guidelines.",
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
  authors: [{ name: "ARIA Team" }],
  creator: "ARIA",
  publisher: "ARIA",
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
    url: "https://aria.clintel.ai",
    siteName: "ARIA",
    title: "ARIA - AI Regulatory IND Assistant",
    description: "Transform your study data into regulatory-compliant IND reports in minutes. AI-powered generation of PK, toxicology, CMC, and clinical pharmacology reports following FDA guidelines.",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "ARIA - AI Regulatory IND Assistant",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "ARIA - AI Regulatory IND Assistant",
    description: "Transform your study data into regulatory-compliant IND reports in minutes with AI-powered document generation.",
    images: ["/logo.png"],
  },
  alternates: {
    canonical: "https://aria.clintel.ai",
  },
  category: "Technology",
  classification: "Business Software",
  other: {
    'llms.txt': 'https://aria.clintel.ai/llms.txt',
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
