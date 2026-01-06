"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Zap, AlertCircle, Sparkles } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface DynamicQuestion {
  id: string
  question: string
  context: string
  type: 'select' | 'multiselect' | 'text'
  options?: string[]
}

interface StudyContext {
  hasProtocol: boolean
  hasNCAData: boolean
  hasConcentrationData: boolean
  hasFigures: boolean
  fileCount: number
}

export interface GenerationAnswers {
  [questionId: string]: string | string[]
}

interface GenerateQuestionnaireProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (answers: GenerationAnswers) => void
  isGenerating: boolean
  reportId: string
  reportType: string
  isDemo?: boolean
}

export function GenerateQuestionnaire({
  open,
  onOpenChange,
  onSubmit,
  isGenerating,
  reportId,
  reportType,
  isDemo = false
}: GenerateQuestionnaireProps) {
  // Helper to get headers with demo mode
  const getHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {}
    if (isDemo) headers['x-demo-mode'] = 'true'
    return headers
  }

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [questions, setQuestions] = useState<DynamicQuestion[]>([])
  const [studyContext, setStudyContext] = useState<StudyContext | null>(null)
  const [answers, setAnswers] = useState<GenerationAnswers>({})
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({})
  const [showCustomInput, setShowCustomInput] = useState<Record<string, boolean>>({})

  // Fetch questions when dialog opens
  useEffect(() => {
    if (open && questions.length === 0) {
      fetchQuestions()
    }
  }, [open])

  const fetchQuestions = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/reports/${reportId}/generate-questions`, {
        method: 'POST',
        headers: getHeaders()
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to generate questions')
      }

      const data = await res.json()
      setQuestions(data.questions)
      setStudyContext(data.studyContext)

      // Initialize answers
      const initialAnswers: GenerationAnswers = {}
      data.questions.forEach((q: DynamicQuestion) => {
        if (q.type === 'multiselect') {
          initialAnswers[q.id] = []
        } else {
          initialAnswers[q.id] = ''
        }
      })
      setAnswers(initialAnswers)
    } catch (err) {
      console.error('Failed to fetch questions:', err)
      setError(err instanceof Error ? err.message : 'Failed to load questions')
    } finally {
      setLoading(false)
    }
  }

  const updateAnswer = (questionId: string, value: string | string[]) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  const toggleMultiSelect = (questionId: string, option: string) => {
    setAnswers(prev => {
      const current = prev[questionId] as string[] || []
      if (current.includes(option)) {
        return { ...prev, [questionId]: current.filter(o => o !== option) }
      } else {
        return { ...prev, [questionId]: [...current, option] }
      }
    })
  }

  const handleSubmit = () => {
    onSubmit(answers)
  }

  const handleClose = () => {
    setQuestions([])
    setAnswers({})
    setCustomAnswers({})
    setShowCustomInput({})
    setError(null)
    onOpenChange(false)
  }

  const handleSkip = () => {
    // Submit with empty answers to generate without context
    onSubmit({})
  }

  // Check if at least some questions are answered
  const hasAnswers = Object.values(answers).some(a =>
    (Array.isArray(a) && a.length > 0) || (typeof a === 'string' && a.trim() !== '')
  )

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Customize Your Report
          </DialogTitle>
          <DialogDescription>
            Answer these questions to generate a more tailored report based on your uploaded data.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Analyzing your study data...</p>
            <p className="text-sm text-muted-foreground mt-1">Generating relevant questions</p>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button variant="link" className="p-0 h-auto ml-2" onClick={fetchQuestions}>
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {!loading && !error && questions.length > 0 && (
          <div className="space-y-6 py-4">
            {studyContext && (
              <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                <span className="font-medium">Data analyzed:</span>{' '}
                {studyContext.fileCount} file(s)
                {studyContext.hasProtocol && ' • Protocol'}
                {studyContext.hasNCAData && ' • NCA Parameters'}
                {studyContext.hasConcentrationData && ' • Concentration Data'}
                {studyContext.hasFigures && ' • Figures'}
              </div>
            )}

            {questions.map((q, index) => (
              <div key={q.id} className="space-y-2">
                <Label className="text-sm font-medium">
                  {index + 1}. {q.question}
                </Label>
                {q.context && (
                  <p className="text-xs text-muted-foreground mb-2">{q.context}</p>
                )}

                {q.type === 'text' && (
                  <Textarea
                    value={answers[q.id] as string || ''}
                    onChange={(e) => updateAnswer(q.id, e.target.value)}
                    placeholder="Enter your response..."
                    rows={3}
                  />
                )}

                {q.type === 'select' && q.options && (
                  <div className="space-y-2">
                    <Select
                      value={showCustomInput[q.id] ? '__custom__' : (answers[q.id] as string || '')}
                      onValueChange={(value) => {
                        if (value === '__custom__') {
                          setShowCustomInput(prev => ({ ...prev, [q.id]: true }))
                          updateAnswer(q.id, customAnswers[q.id] || '')
                        } else {
                          setShowCustomInput(prev => ({ ...prev, [q.id]: false }))
                          updateAnswer(q.id, value)
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent>
                        {q.options.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                        <SelectItem value="__custom__">Other (specify below)</SelectItem>
                      </SelectContent>
                    </Select>
                    {showCustomInput[q.id] && (
                      <Textarea
                        value={customAnswers[q.id] || ''}
                        onChange={(e) => {
                          setCustomAnswers(prev => ({ ...prev, [q.id]: e.target.value }))
                          updateAnswer(q.id, e.target.value)
                        }}
                        placeholder="Enter your custom answer..."
                        rows={2}
                        className="mt-2"
                      />
                    )}
                  </div>
                )}

                {q.type === 'multiselect' && q.options && (
                  <div className="space-y-2">
                    {q.options.map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${q.id}-${option}`}
                          checked={(answers[q.id] as string[] || []).includes(option)}
                          onCheckedChange={() => toggleMultiSelect(q.id, option)}
                        />
                        <label
                          htmlFor={`${q.id}-${option}`}
                          className="text-sm leading-none cursor-pointer"
                        >
                          {option}
                        </label>
                      </div>
                    ))}
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${q.id}-other`}
                        checked={showCustomInput[q.id] || false}
                        onCheckedChange={(checked) => {
                          setShowCustomInput(prev => ({ ...prev, [q.id]: !!checked }))
                          if (!checked) {
                            // Remove custom answer from the list
                            const current = answers[q.id] as string[] || []
                            const customVal = customAnswers[q.id]
                            if (customVal && current.includes(customVal)) {
                              updateAnswer(q.id, current.filter(v => v !== customVal))
                            }
                          }
                        }}
                      />
                      <label
                        htmlFor={`${q.id}-other`}
                        className="text-sm leading-none cursor-pointer"
                      >
                        Other (specify below)
                      </label>
                    </div>
                    {showCustomInput[q.id] && (
                      <Textarea
                        value={customAnswers[q.id] || ''}
                        onChange={(e) => {
                          const newValue = e.target.value
                          const oldValue = customAnswers[q.id]
                          setCustomAnswers(prev => ({ ...prev, [q.id]: newValue }))
                          // Update the answers array
                          const current = answers[q.id] as string[] || []
                          let updated = current.filter(v => v !== oldValue)
                          if (newValue.trim()) {
                            updated = [...updated, newValue]
                          }
                          updateAnswer(q.id, updated)
                        }}
                        placeholder="Enter your custom answer..."
                        rows={2}
                        className="ml-6"
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && !error && questions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No questions generated. Click below to proceed with default generation.</p>
          </div>
        )}

        <DialogFooter className="flex justify-between sm:justify-between gap-2">
          <Button variant="ghost" onClick={handleSkip} disabled={isGenerating || loading}>
            Skip & Generate
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isGenerating}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isGenerating || loading}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
