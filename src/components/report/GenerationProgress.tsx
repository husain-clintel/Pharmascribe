"use client"

import { useEffect, useState } from "react"
import { CheckCircle, Circle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface GenerationStep {
  id: string
  label: string
  description: string
}

const GENERATION_STEPS: GenerationStep[] = [
  { id: "init", label: "Initializing", description: "Setting up report generation..." },
  { id: "files", label: "Processing Files", description: "Reading uploaded data files..." },
  { id: "context", label: "Building Context", description: "Extracting NCA parameters and study data..." },
  { id: "intro", label: "Writing Introduction", description: "Generating background and objectives..." },
  { id: "methods", label: "Writing Methods", description: "Documenting study design and bioanalytical methods..." },
  { id: "results", label: "Analyzing Results", description: "Processing PK parameters and generating tables..." },
  { id: "figures", label: "Processing Figures", description: "Linking concentration-time profiles..." },
  { id: "discussion", label: "Writing Discussion", description: "Interpreting findings and implications..." },
  { id: "conclusions", label: "Finalizing", description: "Generating conclusions and references..." },
  { id: "complete", label: "Complete", description: "Report generated successfully!" },
]

interface GenerationProgressProps {
  isGenerating: boolean
  reportId?: string
}

export function GenerationProgress({ isGenerating, reportId }: GenerationProgressProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    if (!isGenerating) {
      setCurrentStep(0)
      setElapsedTime(0)
      return
    }

    // Simulate progress through steps
    // In a real implementation, this would be driven by SSE from the server
    const stepDurations = [2, 3, 5, 8, 10, 15, 5, 10, 5, 0] // seconds per step (approximate)
    let totalElapsed = 0
    let stepIndex = 0

    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1)
      totalElapsed += 1

      // Calculate which step we should be on based on elapsed time
      let accumulated = 0
      for (let i = 0; i < stepDurations.length; i++) {
        accumulated += stepDurations[i]
        if (totalElapsed < accumulated) {
          stepIndex = i
          break
        }
        stepIndex = i
      }

      setCurrentStep(Math.min(stepIndex, GENERATION_STEPS.length - 2)) // Don't auto-complete
    }, 1000)

    return () => clearInterval(timer)
  }, [isGenerating])

  // When generation completes, show final step
  useEffect(() => {
    if (!isGenerating && elapsedTime > 0) {
      setCurrentStep(GENERATION_STEPS.length - 1)
    }
  }, [isGenerating, elapsedTime])

  if (!isGenerating && currentStep === 0) {
    return null
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  return (
    <div className="bg-white rounded-lg border shadow-lg p-6 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Generating Report</h3>
        <span className="text-sm text-muted-foreground">{formatTime(elapsedTime)}</span>
      </div>

      <div className="space-y-3">
        {GENERATION_STEPS.map((step, index) => {
          const isComplete = index < currentStep
          const isCurrent = index === currentStep
          const isPending = index > currentStep

          return (
            <div
              key={step.id}
              className={cn(
                "flex items-start gap-3 transition-opacity duration-300",
                isPending && "opacity-40"
              )}
            >
              <div className="flex-shrink-0 mt-0.5">
                {isComplete ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : isCurrent ? (
                  <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "font-medium text-sm",
                  isComplete && "text-green-700",
                  isCurrent && "text-blue-700",
                  isPending && "text-gray-400"
                )}>
                  {step.label}
                </p>
                {isCurrent && (
                  <p className="text-xs text-muted-foreground mt-0.5 animate-pulse">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {isGenerating && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>AI is writing your report...</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            This typically takes 30-60 seconds depending on report complexity.
          </p>
        </div>
      )}

      {!isGenerating && currentStep === GENERATION_STEPS.length - 1 && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>Report generated in {formatTime(elapsedTime)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
