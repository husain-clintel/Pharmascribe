import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "sonner"
import { Providers } from "@/components/providers/Providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Pharmascribe - AI Regulatory Writing Assistant",
  description: "Transform your study data into regulatory-compliant IND reports in minutes with AI-powered document generation",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Pharmascribe - AI Regulatory Writing Assistant",
    description: "Transform your study data into regulatory-compliant IND reports in minutes with AI-powered document generation",
    url: "https://pharmascribeai.com",
    siteName: "Pharmascribe",
    images: ["/icon-512.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pharmascribe - AI Regulatory Writing Assistant",
    description: "Transform your study data into regulatory-compliant IND reports in minutes with AI-powered document generation",
    images: ["/icon-512.png"],
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
