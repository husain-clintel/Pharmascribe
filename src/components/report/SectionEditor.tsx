"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Save, ChevronDown, ChevronRight } from "lucide-react"
import type { ReportSection } from "@/types"

// Helper to safely convert content to string for editing
function contentToString(content: any): string {
  if (content === null || content === undefined) {
    return ''
  }
  if (typeof content === 'string') {
    return content
  }
  if (typeof content === 'object') {
    // Try to extract text from common patterns
    if (content.text) return content.text
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

  return (
    <div className="space-y-4">
      {sections.map((section, index) => (
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
              />
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

      {sections.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No sections available. Generate the report first.</p>
        </div>
      )}
    </div>
  )
}
