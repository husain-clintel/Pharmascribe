"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Save, ChevronDown, ChevronRight, Sparkles, Loader2, Undo2 } from "lucide-react"
import { toast } from "sonner"
import type { ReportSection } from "@/types"

type AssistAction = 'polish' | 'elaborate' | 'shorten' | 'simplify' | 'formal' | 'technical'

interface WritingAssistButton {
  action: AssistAction
  label: string
  description: string
}

const writingAssistButtons: WritingAssistButton[] = [
  { action: 'polish', label: 'Polish', description: 'Improve clarity and grammar' },
  { action: 'elaborate', label: 'Elaborate', description: 'Add more detail' },
  { action: 'shorten', label: 'Shorten', description: 'Make more concise' },
  { action: 'simplify', label: 'Simplify', description: 'Easier to understand' },
  { action: 'formal', label: 'Formalize', description: 'More professional tone' },
  { action: 'technical', label: 'Technical', description: 'Add technical precision' },
]

// Helper to safely convert content to string for editing
function contentToString(content: any): string {
  if (content === null || content === undefined) {
    return ''
  }
  if (typeof content === 'string') {
    // Clean up any JSON artifacts that might have slipped through
    let cleaned = content
      // Remove markdown code block syntax
      .replace(/```(?:json)?\s*/g, '')
      .replace(/```\s*/g, '')
      // Clean escaped newlines
      .replace(/\\n/g, '\n')
      // Remove JSON-like patterns that shouldn't be in text
      .replace(/^\s*\{[\s\S]*\}\s*$/g, (match) => {
        // If the entire content looks like JSON, try to extract meaningful text
        try {
          const parsed = JSON.parse(match)
          if (parsed.content) return contentToString(parsed.content)
          if (parsed.text) return parsed.text
          return match // Keep original if no known text field
        } catch {
          return match // Not valid JSON, keep as is
        }
      })
      .trim()
    return cleaned
  }
  if (typeof content === 'object') {
    // Try to extract text from common patterns
    if (content.text) return contentToString(content.text)
    if (content.content) return contentToString(content.content)
    if (Array.isArray(content)) {
      return content.map(item =>
        typeof item === 'string' ? item : (item.text || item.content || JSON.stringify(item))
      ).join('\n')
    }
    // Last resort: pretty-print JSON for editing
    return JSON.stringify(content, null, 2)
  }
  return String(content)
}

interface SectionEditorProps {
  sections: ReportSection[]
  selectedSection: string | null
  onSelectSection: (id: string) => void
  onUpdateSection: (sectionId: string, content: string) => void
}

export function SectionEditor({
  sections,
  selectedSection,
  onSelectSection,
  onUpdateSection
}: SectionEditorProps) {
  const [editingContent, setEditingContent] = useState<Record<string, string>>({})
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.map(s => s.id))
  )
  const [processingSection, setProcessingSection] = useState<string | null>(null)
  const [contentHistory, setContentHistory] = useState<Record<string, string[]>>({})

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleContentChange = (sectionId: string, content: string) => {
    setEditingContent(prev => ({ ...prev, [sectionId]: content }))
  }

  const handleSave = (sectionId: string) => {
    const content = editingContent[sectionId]
    if (content !== undefined) {
      onUpdateSection(sectionId, content)
      setEditingContent(prev => {
        const next = { ...prev }
        delete next[sectionId]
        return next
      })
    }
  }

  const getContent = (section: ReportSection) => {
    return editingContent[section.id] ?? contentToString(section.content)
  }

  const hasChanges = (sectionId: string) => {
    return editingContent[sectionId] !== undefined
  }

  const handleWritingAssist = async (sectionId: string, action: AssistAction, sectionTitle: string) => {
    const currentContent = getContent(sections.find(s => s.id === sectionId)!)
    if (!currentContent || currentContent.trim() === '') {
      toast.error('No content to process')
      return
    }

    setProcessingSection(sectionId)

    // Save current content to history for undo
    setContentHistory(prev => ({
      ...prev,
      [sectionId]: [...(prev[sectionId] || []), currentContent]
    }))

    try {
      const response = await fetch('/api/writing-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: currentContent,
          action,
          sectionTitle
        })
      })

      if (!response.ok) {
        throw new Error('Failed to process text')
      }

      const data = await response.json()

      if (data.result) {
        setEditingContent(prev => ({ ...prev, [sectionId]: data.result }))
        toast.success(`Text ${data.label.toLowerCase()}`)
      }
    } catch (error) {
      console.error('Writing assist error:', error)
      toast.error('Failed to process text')
      // Remove from history on error
      setContentHistory(prev => ({
        ...prev,
        [sectionId]: (prev[sectionId] || []).slice(0, -1)
      }))
    } finally {
      setProcessingSection(null)
    }
  }

  const handleUndo = (sectionId: string) => {
    const history = contentHistory[sectionId]
    if (history && history.length > 0) {
      const previousContent = history[history.length - 1]
      setEditingContent(prev => ({ ...prev, [sectionId]: previousContent }))
      setContentHistory(prev => ({
        ...prev,
        [sectionId]: history.slice(0, -1)
      }))
      toast.success('Reverted to previous version')
    }
  }

  const canUndo = (sectionId: string) => {
    return (contentHistory[sectionId]?.length || 0) > 0
  }

  // Filter out sections that are heading-only (empty content parent sections)
  // but keep them if they have actual content
  const displaySections = sections.filter(section => {
    const content = contentToString(section.content)
    // Keep section if it has content, or if it's not a parent heading section
    if (content && content.trim() !== '') return true
    // Hide empty parent sections (level 1 sections like Introduction, Methods, Results)
    // These are heading-only sections with subsections containing the actual content
    return false
  })

  return (
    <div className="space-y-4">
      {displaySections.map((section, index) => (
        <Card
          key={section.id}
          className={`transition-all ${
            selectedSection === section.id ? "ring-2 ring-primary" : ""
          }`}
        >
          <CardHeader
            className="cursor-pointer py-3"
            onClick={() => {
              onSelectSection(section.id)
              toggleSection(section.id)
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {expandedSections.has(section.id) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <CardTitle className="text-base">
                  {section.numbered && (
                    <span className="text-muted-foreground mr-2">
                      {section.level === 1 ? `${index + 1}.` :
                       section.level === 2 ? `${Math.floor(index / 2) + 1}.${(index % 2) + 1}` :
                       `${Math.floor(index / 3) + 1}.${Math.floor((index % 3) / 2) + 1}.${(index % 2) + 1}`}
                    </span>
                  )}
                  {section.title}
                </CardTitle>
              </div>
              {hasChanges(section.id) && (
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSave(section.id)
                  }}
                  className="gap-1"
                >
                  <Save className="h-3 w-3" />
                  Save
                </Button>
              )}
            </div>
          </CardHeader>

          {expandedSections.has(section.id) && (
            <CardContent className="pt-0">
              <Textarea
                value={getContent(section)}
                onChange={(e) => handleContentChange(section.id, e.target.value)}
                className="min-h-[200px] font-mono text-sm"
                placeholder="Enter section content..."
                disabled={processingSection === section.id}
              />

              {/* Writing Assist Buttons */}
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mr-2">
                  <Sparkles className="h-3 w-3" />
                  <span>AI Assist:</span>
                </div>
                {writingAssistButtons.map((btn) => (
                  <Button
                    key={btn.action}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={processingSection === section.id}
                    onClick={() => handleWritingAssist(section.id, btn.action, section.title)}
                    title={btn.description}
                  >
                    {processingSection === section.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      btn.label
                    )}
                  </Button>
                ))}
                {canUndo(section.id) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs ml-auto"
                    onClick={() => handleUndo(section.id)}
                    disabled={processingSection === section.id}
                  >
                    <Undo2 className="h-3 w-3 mr-1" />
                    Undo
                  </Button>
                )}
              </div>

              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-muted-foreground">
                  {getContent(section)?.length || 0} characters
                </p>
                {hasChanges(section.id) && (
                  <p className="text-xs text-orange-600">Unsaved changes</p>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      ))}

      {displaySections.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No sections available. Generate the report first.</p>
        </div>
      )}
    </div>
  )
}
