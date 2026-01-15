"use client"

import { useEffect, useState } from "react"
import { CheckCircle, Circle, Loader2, Bot } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatStep {
  id: string
  label: string
}

const CHAT_STEPS: ChatStep[] = [
  { id: "reading", label: "Reading your message" },
  { id: "context", label: "Loading report context" },
  { id: "analyzing", label: "Analyzing request" },
  { id: "generating", label: "Generating response" },
  { id: "applying", label: "Applying changes" },
]

interface ChatProgressProps {
  isLoading: boolean
}

export function ChatProgress({ isLoading }: ChatProgressProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    if (!isLoading) {
      setCurrentStep(0)
      setElapsedTime(0)
      return
    }

    // Progress through steps based on time
    const stepDurations = [1, 2, 3, 5, 2] // seconds per step
    let totalElapsed = 0
    let stepIndex = 0

    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1)
      totalElapsed += 1

      let accumulated = 0
      for (let i = 0; i < stepDurations.length; i++) {
        accumulated += stepDurations[i]
        if (totalElapsed < accumulated) {
          stepIndex = i
          break
        }
        stepIndex = i
      }

      setCurrentStep(Math.min(stepIndex, CHAT_STEPS.length - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [isLoading])

  if (!isLoading) return null

  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff6b6b] to-[#ff8e53] flex items-center justify-center shadow-sm">
        <Bot className="h-4 w-4 text-white" />
      </div>
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-md px-4 py-3 min-w-[280px]">
        <div className="space-y-2">
          {CHAT_STEPS.map((step, index) => {
            const isComplete = index < currentStep
            const isCurrent = index === currentStep
            const isPending = index > currentStep

            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-2 transition-all duration-300",
                  isPending && "opacity-30",
                  isCurrent && "text-blue-600"
                )}
              >
                {isComplete ? (
                  <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                ) : isCurrent ? (
                  <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin flex-shrink-0" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                )}
                <span className={cn(
                  "text-xs",
                  isComplete && "text-green-600",
                  isCurrent && "text-blue-600 font-medium",
                  isPending && "text-gray-400"
                )}>
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>
        <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400">{elapsedTime}s elapsed</span>
          <span className="text-xs text-gray-400">ARIA is working...</span>
        </div>
      </div>
    </div>
  )
}
