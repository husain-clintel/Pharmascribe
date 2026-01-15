"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import {
  Send, User, Loader2, Bot, Paperclip, X, FileText,
  FileSpreadsheet, File, Mic, MicOff, Maximize2, Minimize2,
  Wand2, Check, RotateCcw, Copy, Clock, CheckCheck, GripHorizontal
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { ChatMessage, QCResult } from "@/types"
import { ChatProgress } from "./ChatProgress"
import dynamic from "next/dynamic"

// Dynamically import PlotGenerator to avoid SSR issues with Plotly
const PlotGenerator = dynamic(() => import("@/components/plots/PlotGenerator").then(mod => ({ default: mod.PlotGenerator })), {
  ssr: false,
  loading: () => <div className="h-[400px] flex items-center justify-center bg-gray-50 rounded-lg"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
})

interface ChatPanelProps {
  reportId: string
  messages: ChatMessage[]
  onRefreshReport: () => void
  initialPrompt?: string | null
  onInitialPromptUsed?: () => void
  qcFindings?: QCResult[] | null
  onQcFindingsUsed?: () => void
  isDemo?: boolean
}

interface UploadedFile {
  id: string
  filename: string
  fileType: string
  uploading?: boolean
}

const SUGGESTIONS = [
  "Summarize the key PK findings",
  "Improve the Executive Summary",
  "What does the protocol say about dosing?",
  "Add statistical analysis to the Results",
  "Format tables for regulatory submission"
]

function getFileIcon(filename: string) {
  if (filename.endsWith('.pdf')) return <FileText className="h-4 w-4" />
  if (filename.endsWith('.csv') || filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
    return <FileSpreadsheet className="h-4 w-4" />
  }
  return <File className="h-4 w-4" />
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(new Date(date))
}

// Cool chatbot name
const CHATBOT_NAME = "ARIA"
const CHATBOT_TAGLINE = "AI Regulatory IND Assistant"


export function ChatPanel({ reportId, messages: initialMessages, onRefreshReport, initialPrompt, onInitialPromptUsed, qcFindings, onQcFindingsUsed, isDemo = false }: ChatPanelProps) {
  // Helper to get headers with demo mode
  const getHeaders = (contentType = true): Record<string, string> => {
    const headers: Record<string, string> = {}
    if (contentType) headers['Content-Type'] = 'application/json'
    if (isDemo) headers['x-demo-mode'] = 'true'
    return headers
  }

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [pendingQcFindings, setPendingQcFindings] = useState<QCResult[] | null>(qcFindings || null)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Voice input state
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const recognitionRef = useRef<any>(null)

  // Meta-prompting state
  const [enhancedPrompt, setEnhancedPrompt] = useState<string | null>(null)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [showEnhanced, setShowEnhanced] = useState(false)

  // Resizable textarea state
  const [textareaHeight, setTextareaHeight] = useState(44)
  const [isResizing, setIsResizing] = useState(false)
  const resizeStartY = useRef<number>(0)
  const resizeStartHeight = useRef<number>(44)

  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Check for speech recognition support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        setSpeechSupported(true)
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = 'en-US'

        recognitionRef.current.onresult = (event: any) => {
          let finalTranscript = ''
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscript += transcript
            }
          }
          if (finalTranscript) {
            setInput(prev => prev + finalTranscript + ' ')
          }
        }

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error)
          setIsListening(false)
          toast.error('Voice input error. Please try again.')
        }

        recognitionRef.current.onend = () => {
          setIsListening(false)
        }
      }
    }
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Sync qcFindings prop with state
  useEffect(() => {
    if (qcFindings && qcFindings.length > 0) {
      setPendingQcFindings(qcFindings)
    }
  }, [qcFindings])

  // Auto-send initial prompt (e.g., from QC fix flow)
  const initialPromptSentRef = useRef(false)
  useEffect(() => {
    if (initialPrompt && !initialPromptSentRef.current && !loading) {
      initialPromptSentRef.current = true
      // Small delay to ensure component is fully mounted
      setTimeout(() => {
        handleSend(initialPrompt)
        onInitialPromptUsed?.()
      }, 500)
    }
  }, [initialPrompt])

  // Resize handlers for draggable textarea
  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setIsResizing(true)
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    resizeStartY.current = clientY
    resizeStartHeight.current = textareaHeight
  }, [textareaHeight])

  useEffect(() => {
    const handleResizeMove = (e: MouseEvent | TouchEvent) => {
      if (!isResizing) return
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
      const delta = resizeStartY.current - clientY
      const newHeight = Math.min(Math.max(resizeStartHeight.current + delta, 44), 300)
      setTextareaHeight(newHeight)
    }

    const handleResizeEnd = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove)
      document.addEventListener('mouseup', handleResizeEnd)
      document.addEventListener('touchmove', handleResizeMove)
      document.addEventListener('touchend', handleResizeEnd)
    }

    return () => {
      document.removeEventListener('mousemove', handleResizeMove)
      document.removeEventListener('mouseup', handleResizeEnd)
      document.removeEventListener('touchmove', handleResizeMove)
      document.removeEventListener('touchend', handleResizeEnd)
    }
  }, [isResizing])

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      toast.error('Failed to copy')
    }
  }

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
      toast.info('Voice input stopped')
    } else {
      recognitionRef.current.start()
      setIsListening(true)
      toast.info('Listening... Speak now')
    }
  }, [isListening])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    toast.loading('Uploading file...', { id: 'file-upload' })

    for (const file of Array.from(files)) {
      const tempId = `temp-${Date.now()}`
      setUploadedFiles(prev => [...prev, {
        id: tempId,
        filename: file.name,
        fileType: 'PROTOCOL',
        uploading: true
      }])

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('fileType', 'PROTOCOL')
        formData.append('reportId', reportId)

        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: getHeaders(false),
          body: formData
        })

        if (res.ok) {
          const data = await res.json()
          setUploadedFiles(prev => prev.map(f =>
            f.id === tempId
              ? { id: data.id, filename: data.filename, fileType: 'PROTOCOL' }
              : f
          ))

          const systemMessage: ChatMessage = {
            id: Date.now().toString(),
            createdAt: new Date(),
            role: 'ASSISTANT',
            content: `File "${file.name}" uploaded successfully. I can now reference its contents in our conversation.`,
            reportId
          }
          setMessages(prev => [...prev, systemMessage])
          onRefreshReport()
          toast.success(`${file.name} uploaded`, { id: 'file-upload' })
        } else {
          setUploadedFiles(prev => prev.filter(f => f.id !== tempId))
          toast.error('Upload failed', { id: 'file-upload' })
        }
      } catch (error) {
        setUploadedFiles(prev => prev.filter(f => f.id !== tempId))
        toast.error('Upload failed', { id: 'file-upload' })
      }
    }

    setUploading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  // Enhance prompt with meta-prompting
  const enhancePrompt = async () => {
    if (!input.trim() || isEnhancing) return

    setIsEnhancing(true)
    toast.loading('Enhancing your prompt...', { id: 'enhance' })

    try {
      const res = await fetch('/api/enhance-prompt', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ prompt: input.trim() })
      })

      if (res.ok) {
        const data = await res.json()
        setEnhancedPrompt(data.enhanced)
        setShowEnhanced(true)
        toast.success('Prompt enhanced!', { id: 'enhance' })
      } else {
        toast.error('Enhancement failed', { id: 'enhance' })
      }
    } catch (error) {
      toast.error('Enhancement failed', { id: 'enhance' })
    } finally {
      setIsEnhancing(false)
    }
  }

  const useEnhancedPrompt = () => {
    if (enhancedPrompt) {
      setInput(enhancedPrompt)
      setShowEnhanced(false)
      setEnhancedPrompt(null)
      inputRef.current?.focus()
    }
  }

  const discardEnhancedPrompt = () => {
    setShowEnhanced(false)
    setEnhancedPrompt(null)
  }

  const handleSend = async (message?: string) => {
    const text = message || input.trim()
    if (!text || loading) return

    setShowEnhanced(false)
    setEnhancedPrompt(null)
    setInput("")
    setLoading(true)

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      createdAt: new Date(),
      role: 'USER',
      content: text,
      reportId
    }
    setMessages(prev => [...prev, userMessage])

    try {
      // Include QC findings if present (from QC fix flow)
      const requestBody: { message: string; qcFindings?: QCResult[] } = { message: text }
      if (pendingQcFindings && pendingQcFindings.length > 0) {
        requestBody.qcFindings = pendingQcFindings
        // Clear pending QC findings after including in request
        setPendingQcFindings(null)
        onQcFindingsUsed?.()
      }

      const res = await fetch(`/api/reports/${reportId}/chat`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(requestBody)
      })

      if (res.ok) {
        const data = await res.json()

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          createdAt: new Date(),
          role: 'ASSISTANT',
          content: data.response,
          reportId,
          metadata: data.metadata
        }
        setMessages(prev => [...prev, assistantMessage])

        if (data.madeChanges) {
          onRefreshReport()
          toast.success('Report updated successfully')
        }
      } else {
        throw new Error('Failed to get response')
      }
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        createdAt: new Date(),
        role: 'ASSISTANT',
        content: "I encountered an error processing your request. Please try again.",
        reportId
      }
      setMessages(prev => [...prev, errorMessage])
      toast.error('Failed to get AI response')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className={`flex flex-col bg-gradient-to-b from-slate-50 to-white transition-all duration-300 ${
      isExpanded
        ? 'fixed inset-4 z-50 rounded-xl shadow-2xl border bg-white'
        : 'h-full'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white/80 backdrop-blur-sm rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff6b6b] to-[#ff8e53] shadow-lg shadow-red-200/50">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53]">{CHATBOT_NAME}</span>
            <p className="text-xs text-gray-500">{CHATBOT_TAGLINE}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsExpanded(!isExpanded)}
          className="rounded-full hover:bg-gray-100"
          title={isExpanded ? "Minimize" : "Expand"}
        >
          {isExpanded ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Chat Messages */}
      <ScrollArea className={`flex-1 p-4 ${isExpanded ? 'max-h-[calc(100vh-220px)]' : 'min-h-[600px]'}`} ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[500px]">
            <div className="text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff6b6b] to-[#ff8e53] mx-auto mb-4 shadow-lg shadow-red-200/50">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-bold text-xl text-transparent bg-clip-text bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] mb-2">{CHATBOT_NAME}</h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto text-sm">
                I'm your AI regulatory writing assistant. Ask me to analyze your data, refine sections, or answer questions about your protocol.
              </p>

              <div className="space-y-2 max-w-md mx-auto mb-8">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Quick prompts</p>
                {SUGGESTIONS.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(suggestion)}
                    className="w-full text-left px-4 py-2.5 rounded-lg border border-gray-200 hover:border-[#ff6b6b]/50 hover:bg-red-50 transition-all text-sm text-gray-700 hover:text-[#ff6b6b] flex items-center gap-2 group"
                  >
                    <Wand2 className="h-3.5 w-3.5 text-gray-400 group-hover:text-[#ff6b6b]" />
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'USER' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'ASSISTANT' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff6b6b] to-[#ff8e53] flex items-center justify-center shadow-sm">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                <div className={`group relative max-w-[85%] ${message.role === 'USER' ? '' : ''}`}>
                  <div
                    className={`rounded-2xl px-4 py-2.5 ${
                      message.role === 'USER'
                        ? 'bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] text-white rounded-br-md'
                        : 'bg-white border border-gray-100 shadow-sm rounded-bl-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                    {message.metadata && (message.metadata as any).changes && (
                      <div className={`mt-2 pt-2 border-t text-xs ${
                        message.role === 'USER' ? 'border-white/20 text-white/80' : 'border-gray-100 text-gray-500'
                      }`}>
                        <Check className="h-3 w-3 inline mr-1" />
                        Changes applied to: {(message.metadata as any).changes.join(', ')}
                      </div>
                    )}
                    {message.metadata && (message.metadata as any).plotConfig && (
                      <div className="mt-3">
                        <PlotGenerator
                          config={(message.metadata as any).plotConfig}
                          reportId={reportId}
                          isDemo={isDemo}
                          onAddToReport={() => {
                            onRefreshReport()
                            toast.success('Plot added to report data')
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Message footer with time and copy */}
                  <div className={`flex items-center gap-2 mt-1 ${
                    message.role === 'USER' ? 'justify-end' : 'justify-start'
                  }`}>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(message.createdAt)}
                    </span>
                    {message.role === 'ASSISTANT' && (
                      <button
                        onClick={() => copyToClipboard(message.content, message.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 p-1 rounded"
                        title="Copy response"
                      >
                        {copiedId === message.id ? (
                          <CheckCheck className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
                {message.role === 'USER' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center shadow-sm">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            ))}

            {loading && <ChatProgress isLoading={loading} />}
          </div>
        )}
      </ScrollArea>

      {/* Enhanced Prompt Preview */}
      {showEnhanced && enhancedPrompt && (
        <div className="mx-4 mb-2 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100">
              <Wand2 className="h-3.5 w-3.5 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-purple-800">Enhanced Prompt</span>
          </div>
          <p className="text-sm text-gray-700 mb-3 leading-relaxed">{enhancedPrompt}</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={useEnhancedPrompt} className="gap-1.5 bg-purple-600 hover:bg-purple-700">
              <Check className="h-3.5 w-3.5" />
              Use Enhanced
            </Button>
            <Button size="sm" variant="outline" onClick={discardEnhancedPrompt} className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              Keep Original
            </Button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t bg-white p-4 rounded-b-xl">
        {/* Drag handle for resizing textarea */}
        <div
          className={`flex justify-center items-center py-1 -mt-2 mb-1 cursor-ns-resize group select-none ${isResizing ? 'bg-red-50' : 'hover:bg-gray-50'} rounded-t-lg transition-colors`}
          onMouseDown={handleResizeStart}
          onTouchStart={handleResizeStart}
          title="Drag up to expand input area"
        >
          <GripHorizontal className={`h-4 w-4 transition-colors ${isResizing ? 'text-[#ff6b6b]' : 'text-gray-300 group-hover:text-[#ff6b6b]'}`} />
        </div>
        {/* Uploaded Files Preview */}
        {uploadedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5 text-sm"
              >
                {file.uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                ) : (
                  getFileIcon(file.filename)
                )}
                <span className="max-w-[120px] truncate text-gray-700">{file.filename}</span>
                {!file.uploading && (
                  <button
                    onClick={() => removeFile(file.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 items-end">
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            multiple
            accept=".pdf,.csv,.xlsx,.xls,.txt,.png,.jpg,.jpeg"
          />

          {/* Action buttons */}
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="rounded-full h-9 w-9 hover:bg-gray-100"
              title="Attach file"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4 text-gray-500" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (!speechSupported) {
                  toast.error('Voice input not supported. Use Chrome, Edge, or Safari.')
                  return
                }
                toggleListening()
              }}
              className={`rounded-full h-9 w-9 ${isListening ? 'bg-red-100 hover:bg-red-200' : 'hover:bg-gray-100'}`}
              title={isListening ? "Stop listening" : "Voice input"}
            >
              {isListening ? (
                <MicOff className="h-4 w-4 text-red-500" />
              ) : (
                <Mic className="h-4 w-4 text-gray-500" />
              )}
            </Button>
          </div>

          {/* Input field */}
          <div className="flex-1 relative">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "Listening..." : `Ask ${CHATBOT_NAME} anything about your report...`}
              className={`resize-none rounded-xl border-gray-200 focus:border-[#ff6b6b]/50 focus:ring-[#ff6b6b]/20 pr-4 transition-all ${
                isListening ? 'border-red-300 bg-red-50' : ''
              } ${isResizing ? 'select-none' : ''}`}
              style={{ height: `${textareaHeight}px`, minHeight: '44px', maxHeight: '300px' }}
            />
            {isListening && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <span className="flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              </div>
            )}
          </div>

          {/* Enhance & Send buttons */}
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={enhancePrompt}
              disabled={!input.trim() || isEnhancing || loading}
              className="rounded-full h-9 w-9 hover:bg-purple-100"
              title="Enhance prompt with AI"
            >
              {isEnhancing ? (
                <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
              ) : (
                <Wand2 className="h-4 w-4 text-purple-500" />
              )}
            </Button>

            <Button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              size="icon"
              className="rounded-full h-9 w-9 bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] hover:from-[#ff5252] hover:to-[#ff7b3a] border-0"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2 px-1">
          <p className="text-xs text-gray-400">
            Enter to send • Shift+Enter for new line • Drag ⋮⋮ to resize
          </p>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Mic className="h-3 w-3" /> Voice
            </span>
            <span className="flex items-center gap-1">
              <Wand2 className="h-3 w-3" /> Enhance
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
