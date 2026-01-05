"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Key, Save, CheckCircle, AlertCircle } from "lucide-react"

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("")
  const [hasKey, setHasKey] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        setHasKey(data.hasApiKey)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setMessage({ type: 'error', text: 'Please enter an API key' })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geminiApiKey: apiKey })
      })

      if (res.ok) {
        setMessage({ type: 'success', text: 'API key saved successfully!' })
        setHasKey(true)
        setApiKey('') // Clear input for security
      } else {
        throw new Error('Failed to save')
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save API key' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container flex h-16 items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <span className="text-xl font-bold">Settings</span>
        </div>
      </header>

      <main className="container py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              <CardTitle>Claude API Key</CardTitle>
            </div>
            <CardDescription>
              Enter your Anthropic Claude API key to enable AI-powered report generation.
              You can get an API key from the{' '}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Anthropic Console
              </a>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm">Status:</span>
              {loading ? (
                <span className="text-sm text-muted-foreground">Checking...</span>
              ) : hasKey ? (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  API key configured
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm text-orange-600">
                  <AlertCircle className="h-4 w-4" />
                  No API key configured
                </span>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">
                {hasKey ? 'Update API Key' : 'Enter API Key'}
              </Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Enter your Claude API key (sk-ant-...)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Your API key is stored securely and never shared.
              </p>
            </div>

            {message && (
              <div
                className={`p-3 rounded-md text-sm ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {message.text}
              </div>
            )}

            <Button
              onClick={handleSave}
              disabled={saving || !apiKey.trim()}
              className="gap-2"
            >
              {saving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save API Key
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">About</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>IND Report Writer</strong> is an AI-powered application for generating
              regulatory-compliant IND (Investigational New Drug) reports.
            </p>
            <p>
              Supported report types: Pharmacokinetics (PK), Toxicology, CMC,
              Clinical Pharmacology, Bioanalytical, and ADME.
            </p>
            <p>
              Powered by Anthropic Claude AI for intelligent report generation,
              refinement, and quality control.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
