import Papa from 'papaparse'

export interface ParsedCSV {
  headers: string[]
  data: Record<string, any>[]
  rowCount: number
  errors: any[]
}

export function parseCSV(content: string): ParsedCSV {
  const result = Papa.parse(content, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true
  })

  return {
    headers: result.meta.fields || [],
    data: result.data as Record<string, any>[],
    rowCount: result.data.length,
    errors: result.errors
  }
}

export interface NCAData {
  animalId: string
  group: string
  dose: number
  cmax?: number
  tmax?: number
  auclast?: number
  halfLife?: number
  rsq?: number
}

export function extractNCAData(parsed: ParsedCSV): NCAData[] {
  const columnMappings: Record<string, string> = {
    'Animal_ID': 'animalId',
    'AnimalID': 'animalId',
    'Animal ID': 'animalId',
    'Group': 'group',
    'Treatment': 'group',
    'Dose': 'dose',
    'Dose_Level': 'dose',
    'Cmax': 'cmax',
    'Tmax': 'tmax',
    'AUClast': 'auclast',
    'AUC_last': 'auclast',
    'HL_Lambda_z': 'halfLife',
    't1/2': 'halfLife',
    'Half_life': 'halfLife',
    'Rsq_adjusted': 'rsq',
    'Rsq': 'rsq',
    'R2': 'rsq'
  }

  return parsed.data.map(row => {
    const ncaData: NCAData = {
      animalId: '',
      group: '',
      dose: 0
    }

    for (const [sourceCol, targetProp] of Object.entries(columnMappings)) {
      if (row[sourceCol] !== undefined) {
        (ncaData as any)[targetProp] = row[sourceCol]
      }
    }

    return ncaData
  }).filter(d => d.animalId || d.group)
}

export function calculateSummaryStats(values: number[]): {
  mean: number
  sd: number
  cv: number
  n: number
} {
  const validValues = values.filter(v => v != null && !isNaN(v))
  const n = validValues.length

  if (n === 0) {
    return { mean: 0, sd: 0, cv: 0, n: 0 }
  }

  const mean = validValues.reduce((a, b) => a + b, 0) / n
  const variance = validValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1 || 1)
  const sd = Math.sqrt(variance)
  const cv = mean !== 0 ? (sd / Math.abs(mean)) * 100 : 0

  return { mean, sd, cv, n }
}

export function formatMeanCVString(mean: number, cv: number): string {
  if (mean === 0 || isNaN(mean)) return 'NC'

  const formatNum = (val: number): string => {
    if (Math.abs(val) < 0.01) return val.toFixed(4)
    if (Math.abs(val) < 1) return val.toFixed(3)
    if (Math.abs(val) < 100) return val.toFixed(2)
    if (Math.abs(val) < 10000) return val.toFixed(1)
    return val.toLocaleString('en-US', { maximumFractionDigits: 0 })
  }

  return `${formatNum(mean)} (${Math.round(cv)})`
}

export function detectFileType(filename: string): string {
  const lowerName = filename.toLowerCase()

  if (lowerName.includes('nca') || lowerName.includes('parameter')) {
    return 'NCA_PARAMETERS'
  }
  if (lowerName.includes('concentration') || lowerName.includes('conc')) {
    return 'CONCENTRATION_DATA'
  }
  if (lowerName.includes('tissue')) {
    return 'TISSUE_DATA'
  }
  if (lowerName.endsWith('.pdf')) {
    return 'PROTOCOL'
  }
  if (lowerName.match(/\.(png|jpg|jpeg|gif)$/)) {
    return 'FIGURE'
  }

  return 'OTHER'
}
