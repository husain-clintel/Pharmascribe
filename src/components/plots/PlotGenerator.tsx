"use client"

import { useRef, useCallback, useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Loader2, Download, Plus, Check } from "lucide-react"
import { toast } from "sonner"

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => <div className="h-[400px] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
})

export interface PlotConfig {
  type: "line" | "scatter" | "bar" | "histogram" | "semilog" | "mean_error"
  title: string
  xLabel: string
  yLabel: string
  data: PlotData[]
  showLegend?: boolean
  semiLogY?: boolean
  fileName?: string
}

export interface PlotData {
  x: number[]
  y: number[]
  name?: string
  mode?: "lines" | "markers" | "lines+markers"
  color?: string
  error_y?: {
    type: "data"
    array: number[]
    visible: boolean
  }
}

interface PlotGeneratorProps {
  config: PlotConfig
  onPlotGenerated?: (imageData: { blob: Blob; filename: string }) => void
  onAddToReport?: (plotData: { blob: Blob; filename: string; title: string }) => void
  reportId?: string
  isDemo?: boolean
}

const COLORS = [
  "#2563eb", "#dc2626", "#16a34a", "#9333ea", "#ea580c",
  "#0891b2", "#4f46e5", "#be123c", "#15803d", "#7c3aed"
]

export function PlotGenerator({ config, onPlotGenerated, onAddToReport, reportId, isDemo = false }: PlotGeneratorProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [added, setAdded] = useState(false)

  // Build Plotly data traces
  const plotlyData = config.data.map((trace, index) => ({
    x: trace.x,
    y: trace.y,
    type: config.type === "bar" ? "bar" : "scatter",
    mode: trace.mode || (config.type === "scatter" ? "markers" : "lines+markers"),
    name: trace.name || `Series ${index + 1}`,
    marker: { color: trace.color || COLORS[index % COLORS.length] },
    line: { color: trace.color || COLORS[index % COLORS.length], width: 2 },
    error_y: trace.error_y
  } as any))

  // Build Plotly layout
  const layout = {
    title: {
      text: config.title,
      font: { family: "Times New Roman, serif", size: 14 }
    },
    xaxis: {
      title: { text: config.xLabel, font: { family: "Times New Roman, serif", size: 12 } },
      gridcolor: "#e5e7eb",
      showgrid: true,
      zeroline: true,
      zerolinecolor: "#9ca3af"
    },
    yaxis: {
      title: { text: config.yLabel, font: { family: "Times New Roman, serif", size: 12 } },
      gridcolor: "#e5e7eb",
      showgrid: true,
      zeroline: true,
      zerolinecolor: "#9ca3af",
      type: config.semiLogY || config.type === "semilog" ? "log" as const : "linear" as const
    },
    showlegend: config.showLegend !== false && config.data.length > 1,
    legend: {
      x: 1,
      xanchor: "right" as const,
      y: 1,
      bgcolor: "rgba(255,255,255,0.8)",
      bordercolor: "#e5e7eb",
      borderwidth: 1,
      font: { family: "Times New Roman, serif", size: 10 }
    },
    margin: { l: 60, r: 40, t: 50, b: 50 },
    paper_bgcolor: "white",
    plot_bgcolor: "white",
    font: { family: "Times New Roman, serif" },
    autosize: true
  }

  const plotlyConfig = {
    displayModeBar: true,
    modeBarButtonsToRemove: ["lasso2d", "select2d"] as any,
    displaylogo: false,
    responsive: true
  }

  // Export plot as PNG
  const exportAsPng = useCallback(async () => {
    setIsExporting(true)
    try {
      const Plotly = await import("plotly.js-dist-min")
      const plotElement = document.querySelector(".js-plotly-plot") as HTMLElement

      if (plotElement) {
        const imgData = await Plotly.toImage(plotElement, {
          format: "png",
          width: 800,
          height: 500,
          scale: 2
        })

        // Convert base64 to blob
        const response = await fetch(imgData)
        const blob = await response.blob()
        const filename = config.fileName || `${config.title.replace(/[^a-zA-Z0-9]/g, "_")}.png`

        if (onPlotGenerated) {
          onPlotGenerated({ blob, filename })
        }

        // Download the image
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        toast.success("Plot exported successfully")
      }
    } catch (error) {
      console.error("Export error:", error)
      toast.error("Failed to export plot")
    } finally {
      setIsExporting(false)
    }
  }, [config, onPlotGenerated])

  // Add plot to report
  const addToReport = useCallback(async () => {
    if (!reportId) {
      toast.error("No report ID provided")
      return
    }

    setIsAdding(true)
    try {
      const Plotly = await import("plotly.js-dist-min")
      const plotElement = document.querySelector(".js-plotly-plot") as HTMLElement

      if (plotElement) {
        const imgData = await Plotly.toImage(plotElement, {
          format: "png",
          width: 800,
          height: 500,
          scale: 2
        })

        // Convert base64 to blob
        const response = await fetch(imgData)
        const blob = await response.blob()
        const filename = config.fileName || `Figure_${config.title.replace(/[^a-zA-Z0-9]/g, "_")}.png`

        // Upload to server
        const formData = new FormData()
        formData.append("file", blob, filename)
        formData.append("fileType", "FIGURE")
        formData.append("reportId", reportId)

        const headers: Record<string, string> = {}
        if (isDemo) headers["x-demo-mode"] = "true"

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers,
          body: formData
        })

        if (!uploadRes.ok) {
          throw new Error("Failed to upload plot")
        }

        const uploadedFile = await uploadRes.json()

        if (onAddToReport) {
          onAddToReport({ blob, filename, title: config.title })
        }

        setAdded(true)
        toast.success("Plot added to report data")
      }
    } catch (error) {
      console.error("Add to report error:", error)
      toast.error("Failed to add plot to report")
    } finally {
      setIsAdding(false)
    }
  }, [config, reportId, isDemo, onAddToReport])

  return (
    <div className="border rounded-lg bg-white p-4 space-y-4">
      <div className="h-[400px]">
        <Plot
          data={plotlyData}
          layout={layout}
          config={plotlyConfig}
          style={{ width: "100%", height: "100%" }}
          useResizeHandler
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={exportAsPng}
          disabled={isExporting}
          className="gap-2"
        >
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download PNG
        </Button>
        {reportId && (
          <Button
            size="sm"
            onClick={addToReport}
            disabled={isAdding || added}
            className="gap-2 bg-gradient-to-r from-[#ff6b6b] to-[#ff8e53] hover:from-[#ff5252] hover:to-[#ff7b3a]"
          >
            {isAdding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : added ? (
              <Check className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {added ? "Added to Report" : "Add to Report"}
          </Button>
        )}
      </div>
    </div>
  )
}

// Parse plot request from AI response
export function parsePlotRequest(text: string): PlotConfig | null {
  // Look for JSON plot configuration in the response
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/)
  if (jsonMatch) {
    try {
      const config = JSON.parse(jsonMatch[1])
      if (config.plotType || config.type) {
        return {
          type: config.plotType || config.type,
          title: config.title || "Generated Plot",
          xLabel: config.xLabel || config.xAxis || "X",
          yLabel: config.yLabel || config.yAxis || "Y",
          data: config.data || [],
          showLegend: config.showLegend,
          semiLogY: config.semiLogY,
          fileName: config.fileName
        }
      }
    } catch (e) {
      console.error("Failed to parse plot config:", e)
    }
  }
  return null
}
