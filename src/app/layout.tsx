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
    default: "Pharmascribe - AI Regulatory Writing Assistant",
    template: "%s | Pharmascribe",
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
  ],
  authors: [{ name: "Pharmascribe" }],
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
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.pharmascribeai.com",
    siteName: "Pharmascribe",
    title: "Pharmascribe - AI Regulatory Writing Assistant",
    description: "Transform your study data into regulatory-compliant IND reports in minutes. AI-powered generation of PK, toxicology, CMC, and clinical pharmacology reports.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Pharmascribe - AI Regulatory Writing Assistant",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pharmascribe - AI Regulatory Writing Assistant",
    description: "Transform your study data into regulatory-compliant IND reports in minutes with AI-powered document generation.",
    images: ["/og-image.png"],
    creator: "@pharmascribe",
  },
  alternates: {
    canonical: "https://www.pharmascribeai.com",
  },
  category: "Technology",
  classification: "Business Software",
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
