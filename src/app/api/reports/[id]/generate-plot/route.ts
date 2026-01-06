import { NextRequest, NextResponse } from "next/server"
import { optionalReportOwnership } from "@/lib/auth/api-auth"
import prisma from "@/lib/db/prisma"

export const maxDuration = 60

interface PlotRequest {
  plotType: "line" | "scatter" | "bar" | "semilog" | "mean_error"
  title: string
  xLabel: string
  yLabel: string
  dataSource: "concentration_time" | "nca_parameters" | "custom"
  customData?: {
    x: number[]
    y: number[]
    name?: string
  }[]
  options?: {
    semiLogY?: boolean
    showMean?: boolean
    showIndividual?: boolean
    groupBy?: string
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { error, report, isDemo } = await optionalReportOwnership(request, id)

    if (error) return error
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 })
    }

    const body: PlotRequest = await request.json()
    const { plotType, title, xLabel, yLabel, dataSource, customData, options } = body

    // Get uploaded files for this report
    const uploadedFiles = await prisma.uploadedFile.findMany({
      where: { reportId: id }
    })

    let plotData: { x: number[]; y: number[]; name?: string; error_y?: { type: "data"; array: number[]; visible: boolean } }[] = []

    if (dataSource === "custom" && customData) {
      plotData = customData.map(d => ({
        x: d.x,
        y: d.y,
        name: d.name
      }))
    } else if (dataSource === "concentration_time") {
      // Find concentration-time data file
      const concFile = uploadedFiles.find((f: { fileType: string }) => f.fileType === "CONCENTRATION_DATA")
      if (concFile?.extractedData) {
        const data = concFile.extractedData as any
        if (data.rows && Array.isArray(data.rows)) {
          // Group by subject
          const subjectData: Record<string, { time: number[]; conc: number[] }> = {}
          const meanData: Record<number, number[]> = {}

          for (const row of data.rows) {
            const subject = row.Subject_ID || row.Subject || row.ID
            const time = parseFloat(row.Time_h || row.Time || row.TIME || 0)
            const conc = parseFloat(row.Concentration_mg_L || row.Concentration || row.CONC || 0)

            if (!isNaN(time) && !isNaN(conc)) {
              if (!subjectData[subject]) {
                subjectData[subject] = { time: [], conc: [] }
              }
              subjectData[subject].time.push(time)
              subjectData[subject].conc.push(conc)

              // For mean calculation
              if (!meanData[time]) meanData[time] = []
              meanData[time].push(conc)
            }
          }

          if (options?.showIndividual !== false) {
            // Add individual subject traces
            for (const [subject, values] of Object.entries(subjectData)) {
              plotData.push({
                x: values.time,
                y: values.conc,
                name: `Subject ${subject}`
              })
            }
          }

          if (options?.showMean) {
            // Calculate mean and SD
            const times = Object.keys(meanData).map(Number).sort((a, b) => a - b)
            const means: number[] = []
            const sds: number[] = []

            for (const time of times) {
              const values = meanData[time]
              const mean = values.reduce((a, b) => a + b, 0) / values.length
              means.push(mean)

              const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length
              sds.push(Math.sqrt(variance))
            }

            plotData.push({
              x: times,
              y: means,
              name: "Mean ± SD",
              error_y: {
                type: "data",
                array: sds,
                visible: true
              }
            })
          }
        }
      }
    } else if (dataSource === "nca_parameters") {
      // Find NCA parameters file
      const ncaFile = uploadedFiles.find((f: { fileType: string }) => f.fileType === "NCA_PARAMETERS")
      if (ncaFile?.extractedData) {
        const data = ncaFile.extractedData as any
        if (data.rows && Array.isArray(data.rows)) {
          // Extract parameter for plotting (e.g., bar chart of parameters)
          const parameterNames = ["Cmax", "AUClast", "Tmax", "HL_Lambda_z", "Cl_obs", "Vz_obs"]
          const subjects: string[] = []
          const parameterValues: Record<string, number[]> = {}

          for (const param of parameterNames) {
            parameterValues[param] = []
          }

          for (const row of data.rows) {
            subjects.push(row.Subject_ID || row.Subject || row.ID || "Unknown")
            for (const param of parameterNames) {
              const value = parseFloat(row[param] || 0)
              if (!isNaN(value)) {
                parameterValues[param].push(value)
              }
            }
          }

          // Create grouped bar data
          if (options?.groupBy) {
            const param = options.groupBy
            if (parameterValues[param]) {
              plotData.push({
                x: subjects.map((_, i) => i + 1),
                y: parameterValues[param],
                name: param
              })
            }
          } else {
            // Default: show Cmax
            plotData.push({
              x: subjects.map((_, i) => i + 1),
              y: parameterValues["Cmax"] || [],
              name: "Cmax (mg/L)"
            })
          }
        }
      }
    }

    // Return plot configuration
    const plotConfig = {
      type: plotType,
      title: title || "Generated Plot",
      xLabel: xLabel || "X",
      yLabel: yLabel || "Y",
      data: plotData,
      showLegend: plotData.length > 1,
      semiLogY: options?.semiLogY || plotType === "semilog"
    }

    return NextResponse.json({
      success: true,
      plotConfig,
      message: `Plot "${title}" generated successfully with ${plotData.length} data series`
    })
  } catch (error) {
    console.error("Plot generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate plot" },
      { status: 500 }
    )
  }
}
