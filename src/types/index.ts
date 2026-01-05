export type ReportType =
  | 'PK_REPORT'
  | 'TOXICOLOGY'
  | 'CMC'
  | 'CLINICAL_PHARMACOLOGY'
  | 'BIOANALYTICAL'
  | 'ADME'
  | 'PHARMACOLOGY'

export type ReportStatus =
  | 'DRAFT'
  | 'GENERATING'
  | 'REVIEW'
  | 'QC_PENDING'
  | 'QC_COMPLETE'
  | 'FINALIZED'
  | 'EXPORTED'

export type FileType =
  | 'NCA_PARAMETERS'
  | 'CONCENTRATION_DATA'
  | 'TISSUE_DATA'
  | 'FIGURE'
  | 'PROTOCOL'
  | 'OTHER'

export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM'

export type QCCategory =
  | 'DATA_ACCURACY'
  | 'FORMATTING'
  | 'TERMINOLOGY'
  | 'CONSISTENCY'
  | 'CALCULATIONS'
  | 'COMPLETENESS'
  | 'REGULATORY'

export type Severity = 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO'

export type QCStatus = 'PENDING' | 'ACKNOWLEDGED' | 'FIXED' | 'DISMISSED'

export interface Report {
  id: string
  createdAt: Date
  updatedAt: Date
  reportType: ReportType
  status: ReportStatus
  studyId: string
  reportNumber?: string | null
  reportTitle: string
  reportVersion: string
  testFacility?: string | null
  testFacilityStudyNum?: string | null
  species?: string | null
  doseLevel?: string | null
  analytes?: string | null
  matrices?: string | null
  routeOfAdmin?: string | null
  preparedBy?: string | null
  reviewedBy?: string | null
  approvedBy?: string | null
  content?: ReportContent | null
  extractedContext?: ExtractedContext | null
  uploadedFiles?: UploadedFile[]
  chatMessages?: ChatMessage[]
  qcResults?: QCResult[]
}

export interface UploadedFile {
  id: string
  createdAt: Date
  filename: string
  fileType: FileType
  mimeType: string
  size: number
  blobUrl: string
  processed: boolean
  extractedData?: Record<string, unknown> | null
  reportId: string
}

export interface ChatMessage {
  id: string
  createdAt: Date
  role: MessageRole
  content: string
  metadata?: Record<string, unknown> | null
  reportId: string
}

export interface QCResult {
  id: string
  createdAt: Date
  category: QCCategory
  severity: Severity
  section: string
  issue: string
  suggestion?: string | null
  status: QCStatus
  resolvedAt?: Date | null
  resolution?: string | null
  reportId: string
}

export interface ReportContent {
  sections: ReportSection[]
  tables: ReportTable[]
  figures: ReportFigure[]
  metadata: ReportMetadata
}

export interface ReportSection {
  id: string
  title: string
  level: 1 | 2 | 3
  numbered: boolean
  content: string
  order: number
}

export interface ReportTable {
  id: string
  caption: string
  headers: string[]
  data: string[][]
  footnotes?: string[]
  order: number
  sectionId: string
}

export interface ReportFigure {
  id: string
  caption: string
  imageUrl: string
  order: number
  sectionId: string
}

export interface ReportMetadata {
  studyId: string
  reportNumber: string
  reportTitle: string
  reportVersion: string
  reportDate: string
  testFacility?: string
  species?: string
  routeOfAdmin?: string
  doseLevel?: string
  analytes?: string
  preparedBy?: AuthorInfo
  reviewedBy?: AuthorInfo
  approvedBy?: AuthorInfo
}

export interface AuthorInfo {
  name: string
  title?: string
  degree?: string
}

export interface ExtractedContext {
  ncaParameters?: NCAParameter[]
  concentrationData?: ConcentrationDataPoint[]
  tissueData?: TissueDataPoint[]
  groups?: GroupInfo[]
  summary?: string
  files?: {
    filename: string
    fileType: FileType
    extractedData: unknown
  }[]
}

export interface NCAParameter {
  animalId: string
  group: string
  dose: number
  cmax?: number
  tmax?: number
  auclast?: number
  aucinf?: number
  halfLife?: number
  cl?: number
  vz?: number
  vss?: number
  cmaxD?: number
  auclastD?: number
  rsq?: number
}

export interface ConcentrationDataPoint {
  animalId: string
  group: string
  time: number
  concentration: number
  dose: number
  matrix: string
}

export interface TissueDataPoint {
  animalId: string
  group: string
  tissue: string
  concentration: number
  timepoint: string
}

export interface GroupInfo {
  code: string
  label: string
  dose: number
  animalIds: string[]
  formulation?: string
}

export interface ReportTypeConfig {
  type: ReportType
  name: string
  description: string
  icon: string
  sections: SectionTemplate[]
}

export interface SectionTemplate {
  id: string
  title: string
  level: 1 | 2 | 3
  numbered: boolean
  required: boolean
  contentType: 'narrative' | 'table' | 'figure' | 'mixed'
  defaultContent?: string
}

export const REPORT_TYPES: ReportTypeConfig[] = [
  {
    type: 'PK_REPORT',
    name: 'Pharmacokinetics (PK)',
    description: 'Analysis of drug absorption, distribution, metabolism, and excretion parameters',
    icon: 'Activity',
    sections: [
      { id: 'exec-summary', title: 'Executive Summary', level: 1, numbered: false, required: true, contentType: 'narrative' },
      { id: 'intro', title: 'Introduction', level: 1, numbered: true, required: true, contentType: 'narrative' },
      { id: 'intro-bg', title: 'Background', level: 2, numbered: true, required: true, contentType: 'narrative' },
      { id: 'intro-obj', title: 'Objectives', level: 2, numbered: true, required: true, contentType: 'narrative' },
      { id: 'methods', title: 'Methods', level: 1, numbered: true, required: true, contentType: 'narrative' },
      { id: 'methods-design', title: 'Study Design', level: 2, numbered: true, required: true, contentType: 'mixed' },
      { id: 'methods-bioanalytical', title: 'Bioanalytical Methods', level: 2, numbered: true, required: true, contentType: 'narrative' },
      { id: 'methods-pk', title: 'Pharmacokinetic Data Analysis', level: 2, numbered: true, required: true, contentType: 'narrative' },
      { id: 'results', title: 'Results', level: 1, numbered: true, required: true, contentType: 'mixed' },
      { id: 'discussion', title: 'Discussion', level: 1, numbered: true, required: true, contentType: 'narrative' },
      { id: 'conclusions', title: 'Conclusions', level: 1, numbered: true, required: true, contentType: 'narrative' },
      { id: 'references', title: 'References', level: 1, numbered: false, required: false, contentType: 'narrative' },
      { id: 'appendices', title: 'Appendices', level: 1, numbered: false, required: false, contentType: 'mixed' },
    ]
  },
  {
    type: 'TOXICOLOGY',
    name: 'Toxicology',
    description: 'Preclinical safety and toxicity study reports',
    icon: 'AlertTriangle',
    sections: [
      { id: 'exec-summary', title: 'Executive Summary', level: 1, numbered: false, required: true, contentType: 'narrative' },
      { id: 'intro', title: 'Introduction', level: 1, numbered: true, required: true, contentType: 'narrative' },
      { id: 'methods', title: 'Materials and Methods', level: 1, numbered: true, required: true, contentType: 'narrative' },
      { id: 'results', title: 'Results', level: 1, numbered: true, required: true, contentType: 'mixed' },
      { id: 'discussion', title: 'Discussion', level: 1, numbered: true, required: true, contentType: 'narrative' },
      { id: 'conclusions', title: 'Conclusions', level: 1, numbered: true, required: true, contentType: 'narrative' },
    ]
  },
  {
    type: 'CMC',
    name: 'Chemistry, Manufacturing & Controls',
    description: 'Drug substance and drug product characterization',
    icon: 'Flask',
    sections: [
      { id: 'exec-summary', title: 'Executive Summary', level: 1, numbered: false, required: true, contentType: 'narrative' },
      { id: 'drug-substance', title: 'Drug Substance', level: 1, numbered: true, required: true, contentType: 'mixed' },
      { id: 'drug-product', title: 'Drug Product', level: 1, numbered: true, required: true, contentType: 'mixed' },
      { id: 'stability', title: 'Stability', level: 1, numbered: true, required: true, contentType: 'mixed' },
    ]
  },
  {
    type: 'CLINICAL_PHARMACOLOGY',
    name: 'Clinical Pharmacology',
    description: 'Human PK/PD studies and clinical pharmacology reports',
    icon: 'Users',
    sections: [
      { id: 'exec-summary', title: 'Executive Summary', level: 1, numbered: false, required: true, contentType: 'narrative' },
      { id: 'intro', title: 'Introduction', level: 1, numbered: true, required: true, contentType: 'narrative' },
      { id: 'methods', title: 'Methods', level: 1, numbered: true, required: true, contentType: 'narrative' },
      { id: 'results', title: 'Results', level: 1, numbered: true, required: true, contentType: 'mixed' },
      { id: 'discussion', title: 'Discussion', level: 1, numbered: true, required: true, contentType: 'narrative' },
      { id: 'conclusions', title: 'Conclusions', level: 1, numbered: true, required: true, contentType: 'narrative' },
    ]
  },
  {
    type: 'BIOANALYTICAL',
    name: 'Bioanalytical',
    description: 'Method validation and bioanalytical study reports',
    icon: 'TestTube',
    sections: [
      { id: 'exec-summary', title: 'Executive Summary', level: 1, numbered: false, required: true, contentType: 'narrative' },
      { id: 'intro', title: 'Introduction', level: 1, numbered: true, required: true, contentType: 'narrative' },
      { id: 'methods', title: 'Materials and Methods', level: 1, numbered: true, required: true, contentType: 'narrative' },
      { id: 'results', title: 'Results', level: 1, numbered: true, required: true, contentType: 'mixed' },
      { id: 'conclusions', title: 'Conclusions', level: 1, numbered: true, required: true, contentType: 'narrative' },
    ]
  },
  {
    type: 'ADME',
    name: 'ADME',
    description: 'Absorption, Distribution, Metabolism, and Excretion studies',
    icon: 'GitBranch',
    sections: [
      { id: 'exec-summary', title: 'Executive Summary', level: 1, numbered: false, required: true, contentType: 'narrative' },
      { id: 'intro', title: 'Introduction', level: 1, numbered: true, required: true, contentType: 'narrative' },
      { id: 'methods', title: 'Materials and Methods', level: 1, numbered: true, required: true, contentType: 'narrative' },
      { id: 'results', title: 'Results', level: 1, numbered: true, required: true, contentType: 'mixed' },
      { id: 'discussion', title: 'Discussion', level: 1, numbered: true, required: true, contentType: 'narrative' },
      { id: 'conclusions', title: 'Conclusions', level: 1, numbered: true, required: true, contentType: 'narrative' },
    ]
  },
  {
    type: 'PHARMACOLOGY',
    name: 'Pharmacology',
    description: 'Primary and secondary pharmacodynamic studies and safety pharmacology',
    icon: 'Pill',
    sections: [
      { id: 'exec-summary', title: 'Executive Summary', level: 1, numbered: false, required: true, contentType: 'narrative' },
      { id: 'intro', title: 'Introduction', level: 1, numbered: true, required: true, contentType: 'narrative' },
      { id: 'intro-bg', title: 'Background', level: 2, numbered: true, required: true, contentType: 'narrative' },
      { id: 'intro-obj', title: 'Objectives', level: 2, numbered: true, required: true, contentType: 'narrative' },
      { id: 'methods', title: 'Materials and Methods', level: 1, numbered: true, required: true, contentType: 'narrative' },
      { id: 'methods-test-system', title: 'Test System', level: 2, numbered: true, required: true, contentType: 'narrative' },
      { id: 'methods-test-article', title: 'Test Article', level: 2, numbered: true, required: true, contentType: 'narrative' },
      { id: 'methods-study-design', title: 'Study Design', level: 2, numbered: true, required: true, contentType: 'mixed' },
      { id: 'methods-endpoints', title: 'Endpoints and Measurements', level: 2, numbered: true, required: true, contentType: 'narrative' },
      { id: 'methods-stats', title: 'Statistical Analysis', level: 2, numbered: true, required: true, contentType: 'narrative' },
      { id: 'results', title: 'Results', level: 1, numbered: true, required: true, contentType: 'mixed' },
      { id: 'results-primary-pd', title: 'Primary Pharmacodynamics', level: 2, numbered: true, required: true, contentType: 'mixed' },
      { id: 'results-secondary-pd', title: 'Secondary Pharmacodynamics', level: 2, numbered: true, required: false, contentType: 'mixed' },
      { id: 'results-safety-pharm', title: 'Safety Pharmacology', level: 2, numbered: true, required: false, contentType: 'mixed' },
      { id: 'discussion', title: 'Discussion', level: 1, numbered: true, required: true, contentType: 'narrative' },
      { id: 'conclusions', title: 'Conclusions', level: 1, numbered: true, required: true, contentType: 'narrative' },
      { id: 'references', title: 'References', level: 1, numbered: false, required: false, contentType: 'narrative' },
      { id: 'appendices', title: 'Appendices', level: 1, numbered: false, required: false, contentType: 'mixed' },
    ]
  }
]
