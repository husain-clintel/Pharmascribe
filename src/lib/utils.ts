import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "NC"
  }

  const val = Number(value)
  if (val === 0) return "0"

  if (Math.abs(val) < 0.01) return val.toFixed(4)
  if (Math.abs(val) < 1) return val.toFixed(3)
  if (Math.abs(val) < 100) return val.toFixed(2)
  if (Math.abs(val) < 10000) return val.toFixed(1)
  return val.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export function formatMeanCV(mean: number | null | undefined, sd: number | null | undefined): string {
  if (mean === null || mean === undefined || isNaN(mean)) {
    return "NC"
  }

  const meanVal = Number(mean)
  if (sd === null || sd === undefined || isNaN(sd) || meanVal === 0) {
    return formatNumber(meanVal)
  }

  const cv = (Number(sd) / Math.abs(meanVal)) * 100
  return `${formatNumber(meanVal)} (${cv.toFixed(0)})`
}

export function formatAnimalId(animalId: string | number): string {
  try {
    return String(Math.floor(Number(animalId)))
  } catch {
    return String(animalId)
  }
}

export function getReportTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    PK_REPORT: "Pharmacokinetics (PK)",
    TOXICOLOGY: "Toxicology",
    CMC: "Chemistry, Manufacturing & Controls",
    CLINICAL_PHARMACOLOGY: "Clinical Pharmacology",
    BIOANALYTICAL: "Bioanalytical",
    ADME: "ADME (Absorption, Distribution, Metabolism, Excretion)",
    PHARMACOLOGY: "Pharmacology"
  }
  return labels[type] || type
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-800",
    GENERATING: "bg-blue-100 text-blue-800",
    REVIEW: "bg-yellow-100 text-yellow-800",
    QC_PENDING: "bg-orange-100 text-orange-800",
    QC_COMPLETE: "bg-green-100 text-green-800",
    FINALIZED: "bg-purple-100 text-purple-800",
    EXPORTED: "bg-indigo-100 text-indigo-800"
  }
  return colors[status] || "bg-gray-100 text-gray-800"
}

export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    CRITICAL: "bg-red-100 text-red-800 border-red-200",
    MAJOR: "bg-orange-100 text-orange-800 border-orange-200",
    MINOR: "bg-yellow-100 text-yellow-800 border-yellow-200",
    INFO: "bg-blue-100 text-blue-800 border-blue-200"
  }
  return colors[severity] || "bg-gray-100 text-gray-800"
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + "..."
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
