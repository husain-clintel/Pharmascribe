"use client"

import { useState, Suspense, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  FileText,
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  Activity,
  AlertTriangle,
  Users,
  TestTube,
  GitBranch,
  Upload,
  Loader2,
  FileUp,
  CheckCircle2,
  Pill,
  Download,
  Play
} from "lucide-react"
import { REPORT_TYPES, type ReportType } from "@/types"
import { FileUploader } from "@/components/upload/FileUploader"
import { useInactivityLogout } from "@/hooks/useInactivityLogout"

const STEPS = [
  { id: 1, name: "Report Type", description: "Select the type of report" },
  { id: 2, name: "Protocol", description: "Upload study protocol" },
  { id: 3, name: "Study Info", description: "Review & edit metadata" },
  { id: 4, name: "Data Files", description: "Upload data & figures" },
  { id: 5, name: "Review", description: "Review and create" },
]

const iconMap: Record<string, React.ReactNode> = {
  Activity: <Activity className="h-8 w-8" />,
  AlertTriangle: <AlertTriangle className="h-8 w-8" />,
  Flask: <Activity className="h-8 w-8" />,
  Users: <Users className="h-8 w-8" />,
  TestTube: <TestTube className="h-8 w-8" />,
  GitBranch: <GitBranch className="h-8 w-8" />,
  Pill: <Pill className="h-8 w-8" />,
}

interface FormData {
  reportType: ReportType | ""
  studyId: string
  reportNumber: string
  reportTitle: string
  testFacility: string
  testFacilityStudyNum: string
  species: string
  routeOfAdmin: string
  doseLevel: string
  analytes: string
  matrices: string
  preparedBy: string
  reviewedBy: string
  approvedBy: string
}

interface UploadedFile {
  id: string
  filename: string
  fileType: string
  size: number
  blobUrl: string
  extractedData?: any
}

function NewReportContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialType = searchParams.get('type') as ReportType | null
  const isDemo = searchParams.get('demo') === 'true'

  // Auto-logout after 1 hour of inactivity
  useInactivityLogout()

  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [extractingMetadata, setExtractingMetadata] = useState(false)
  const [metadataExtracted, setMetadataExtracted] = useState(false)
  const [protocolFile, setProtocolFile] = useState<UploadedFile | null>(null)
  const [dataFiles, setDataFiles] = useState<UploadedFile[]>([])
  const [extractionError, setExtractionError] = useState<string | null>(null)
  const [loadingSampleProtocol, setLoadingSampleProtocol] = useState(false)
  const [loadingSampleData, setLoadingSampleData] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    reportType: initialType || (isDemo ? "PK_REPORT" as ReportType : ""),
    studyId: "",
    reportNumber: "",
    reportTitle: "",
    testFacility: "",
    testFacilityStudyNum: "",
    species: "",
    routeOfAdmin: "",
    doseLevel: "",
    analytes: "",
    matrices: "",
    preparedBy: "",
    reviewedBy: "",
    approvedBy: "",
  })

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleProtocolUpload = async (uploadedFiles: UploadedFile[]) => {
    if (uploadedFiles.length > 0) {
      const file = uploadedFiles[0]
      setProtocolFile(file)
      setExtractionError(null)

      // Check if file has extracted content
      if (file.extractedData?.content && !file.extractedData?.error) {
        // Auto-extract metadata from protocol
        await extractMetadataFromProtocol(file)
      } else {
        setExtractionError("Protocol content could not be extracted. You can still enter metadata manually or try re-uploading the file.")
      }
    }
  }

  const extractMetadataFromProtocol = async (file: UploadedFile) => {
    setExtractingMetadata(true)
    setExtractionError(null)

    try {
      const protocolContent = file.extractedData?.content
      if (!protocolContent || protocolContent.includes('extraction failed')) {
        throw new Error('Protocol content not available')
      }

      const res = await fetch('/api/extract-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocolContent,
          filename: file.filename,
          reportType: formData.reportType
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to extract metadata')
      }

      const { metadata } = await res.json()

      // Update form with extracted metadata
      setFormData(prev => ({
        ...prev,
        studyId: metadata.studyId || prev.studyId,
        reportNumber: metadata.reportNumber || prev.reportNumber,
        reportTitle: metadata.reportTitle || prev.reportTitle,
        testFacility: metadata.testFacility || prev.testFacility,
        testFacilityStudyNum: metadata.testFacilityStudyNum || prev.testFacilityStudyNum,
        species: metadata.species || prev.species,
        routeOfAdmin: metadata.routeOfAdmin || prev.routeOfAdmin,
        doseLevel: metadata.doseLevel || prev.doseLevel,
        analytes: metadata.analytes || prev.analytes,
        matrices: metadata.matrices || prev.matrices,
      }))

      setMetadataExtracted(true)
    } catch (error) {
      console.error('Failed to extract metadata:', error)
      setExtractionError(error instanceof Error ? error.message : 'Failed to extract metadata from protocol')
    } finally {
      setExtractingMetadata(false)
    }
  }

  const handleDataFileUpload = (uploadedFiles: UploadedFile[]) => {
    setDataFiles((prev) => [...prev, ...uploadedFiles])
  }

  const removeDataFile = (id: string) => {
    setDataFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const removeProtocol = () => {
    setProtocolFile(null)
    setMetadataExtracted(false)
    setExtractionError(null)
  }

  const loadSampleProtocol = async () => {
    setLoadingSampleProtocol(true)
    setExtractionError(null)

    try {
      // Fetch the sample protocol file
      const response = await fetch('/sample-data/theophylline_study_protocol.docx')
      if (!response.ok) {
        throw new Error('Failed to fetch sample protocol')
      }

      const blob = await response.blob()
      const file = new File([blob], 'theophylline_study_protocol.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      })

      // Upload the file through our API
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)
      formDataUpload.append('fileType', 'PROTOCOL')

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'x-demo-mode': 'true'
        },
        body: formDataUpload
      })

      if (!uploadRes.ok) {
        const error = await uploadRes.json()
        throw new Error(error.error || 'Failed to upload sample protocol')
      }

      const uploadedFile = await uploadRes.json()
      setProtocolFile(uploadedFile)

      // Extract metadata from the sample protocol
      if (uploadedFile.extractedData?.content && !uploadedFile.extractedData?.error) {
        await extractMetadataFromProtocol(uploadedFile)
      } else {
        // If DOCX extraction didn't work, use the text summary
        const textResponse = await fetch('/sample-data/theophylline_protocol_summary.txt')
        if (textResponse.ok) {
          const textContent = await textResponse.text()
          // Create a mock file object with the text content
          const mockFile = {
            ...uploadedFile,
            extractedData: { content: textContent }
          }
          await extractMetadataFromProtocol(mockFile)
        }
      }
    } catch (error) {
      console.error('Failed to load sample protocol:', error)
      setExtractionError(error instanceof Error ? error.message : 'Failed to load sample protocol')
    } finally {
      setLoadingSampleProtocol(false)
    }
  }

  const loadSampleData = async () => {
    setLoadingSampleData(true)

    try {
      const sampleFiles = [
        { path: '/sample-data/theophylline_nca_parameters.csv', name: 'theophylline_nca_parameters.csv', type: 'NCA_PARAMETERS', mimeType: 'text/csv' },
        { path: '/sample-data/theophylline_concentration_time.csv', name: 'theophylline_concentration_time.csv', type: 'CONCENTRATION_DATA', mimeType: 'text/csv' },
        { path: '/sample-data/figures/individual_concentration_time.png', name: 'Figure_1_Individual_Concentration_Time.png', type: 'FIGURE', mimeType: 'image/png' },
        { path: '/sample-data/figures/mean_concentration_time.png', name: 'Figure_2_Mean_Concentration_Time.png', type: 'FIGURE', mimeType: 'image/png' },
        { path: '/sample-data/figures/spaghetti_semilog.png', name: 'Figure_3_Semilog_Concentration_Time.png', type: 'FIGURE', mimeType: 'image/png' }
      ]

      const uploadedFiles: UploadedFile[] = []

      for (const sampleFile of sampleFiles) {
        const response = await fetch(sampleFile.path)
        if (!response.ok) {
          throw new Error(`Failed to fetch ${sampleFile.name}`)
        }

        const blob = await response.blob()
        const file = new File([blob], sampleFile.name, { type: sampleFile.mimeType })

        const formDataUpload = new FormData()
        formDataUpload.append('file', file)
        formDataUpload.append('fileType', sampleFile.type)

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'x-demo-mode': 'true'
          },
          body: formDataUpload
        })

        if (!uploadRes.ok) {
          const error = await uploadRes.json()
          throw new Error(error.error || `Failed to upload ${sampleFile.name}`)
        }

        const uploaded = await uploadRes.json()
        uploadedFiles.push(uploaded)
      }

      setDataFiles(prev => [...prev, ...uploadedFiles])
    } catch (error) {
      console.error('Failed to load sample data:', error)
      alert(error instanceof Error ? error.message : 'Failed to load sample data')
    } finally {
      setLoadingSampleData(false)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.reportType !== ""
      case 2:
        return true // Protocol is optional but recommended
      case 3:
        return formData.studyId && formData.reportTitle
      case 4:
        return true // Data files are optional
      case 5:
        return true
      default:
        return false
    }
  }

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // Combine protocol and data files
      const allFiles = [
        ...(protocolFile ? [protocolFile.id] : []),
        ...dataFiles.map(f => f.id)
      ]

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (isDemo) {
        headers['x-demo-mode'] = 'true'
      }

      const res = await fetch('/api/reports', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...formData,
          files: allFiles
        })
      })

      if (res.ok) {
        const report = await res.json()
        // Pass demo flag to report page if in demo mode
        router.push(`/reports/${report.id}${isDemo ? '?demo=true' : ''}`)
      } else {
        alert('Failed to create report')
      }
    } catch (error) {
      console.error('Error creating report:', error)
      alert('Failed to create report')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="container py-4 sm:py-6 md:py-8 px-4 sm:px-6">
      {/* Progress Steps */}
      <div className="mb-4 sm:mb-6 md:mb-8">
        <div className="flex justify-between">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex-1">
              <div className="flex items-center">
                <div
                  className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 text-xs sm:text-sm ${
                    currentStep > step.id
                      ? "border-primary bg-primary text-white"
                      : currentStep === step.id
                      ? "border-primary text-primary"
                      : "border-gray-300 text-gray-300"
                  }`}
                >
                  {currentStep > step.id ? (
                    <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    step.id
                  )}
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 sm:h-1 flex-1 ${
                      currentStep > step.id ? "bg-primary" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
              <div className="mt-1 sm:mt-2">
                <p className={`text-[10px] sm:text-sm font-medium ${
                  currentStep >= step.id ? "text-gray-900" : "text-gray-400"
                }`}>
                  {step.name}
                </p>
                <p className="text-[9px] sm:text-xs text-gray-500 hidden sm:block">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          {/* Step 1: Report Type */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Select Report Type</h2>
              <p className="text-muted-foreground mb-6">
                {isDemo
                  ? "Demo mode: PK Report is pre-selected. Try the full workflow with our sample data!"
                  : "Choose the type of IND report you want to generate"
                }
              </p>
              {isDemo && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-800">
                    <Play className="h-5 w-5" />
                    <span className="font-medium">Demo Mode Active</span>
                  </div>
                  <p className="text-sm text-blue-600 mt-1">
                    Experience the full report generation workflow with our sample theophylline PK study data.
                  </p>
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {REPORT_TYPES.map((type) => {
                  const isDisabled = isDemo && type.type !== "PK_REPORT"
                  return (
                    <Card
                      key={type.type}
                      className={`transition-all ${
                        isDisabled
                          ? "opacity-50 cursor-not-allowed"
                          : "cursor-pointer hover:shadow-md"
                      } ${
                        formData.reportType === type.type
                          ? "ring-2 ring-primary"
                          : ""
                      }`}
                      onClick={() => !isDisabled && updateFormData("reportType", type.type)}
                    >
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                            formData.reportType === type.type
                              ? "bg-primary text-white"
                              : isDisabled
                              ? "bg-gray-100 text-gray-400"
                              : "bg-primary/10 text-primary"
                          }`}>
                            {iconMap[type.icon]}
                          </div>
                          <div>
                            <CardTitle className={`text-base ${isDisabled ? "text-gray-400" : ""}`}>
                              {type.name}
                              {isDisabled && <span className="text-xs ml-2">(Demo: PK only)</span>}
                            </CardTitle>
                          </div>
                        </div>
                        <CardDescription className={`mt-2 ${isDisabled ? "text-gray-400" : ""}`}>
                          {type.description}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 2: Protocol Upload */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Upload Study Protocol</h2>
              <p className="text-muted-foreground mb-6">
                {isDemo
                  ? "In demo mode, use our sample protocol to see how AI-powered metadata extraction works."
                  : "Upload your study protocol (PDF or Word). The AI will automatically extract study metadata to pre-fill the form."
                }
              </p>

              {isDemo && !protocolFile && !loadingSampleProtocol && (
                <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-800 mb-2">
                    <Play className="h-5 w-5" />
                    <span className="font-medium">Demo Mode: Sample Protocol</span>
                  </div>
                  <p className="text-sm text-blue-600 mb-4">
                    In demo mode, you can only use our sample theophylline PK study protocol. Click the button below to load it and see how metadata extraction works.
                  </p>
                  <Button
                    onClick={loadSampleProtocol}
                    disabled={loadingSampleProtocol}
                    className="gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                  >
                    {loadingSampleProtocol ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading Sample Protocol...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Use Sample Theophylline Protocol
                      </>
                    )}
                  </Button>
                </div>
              )}

              {!isDemo && !protocolFile && !loadingSampleProtocol ? (
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <FileUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Drag and drop your protocol file here, or click to browse
                  </p>
                  <FileUploader
                    onUpload={handleProtocolUpload}
                    fileTypes={['PROTOCOL']}
                    singleFile={true}
                  />
                </div>
              ) : loadingSampleProtocol ? (
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Loader2 className="h-12 w-12 mx-auto text-blue-500 mb-4 animate-spin" />
                  <p className="text-blue-600 font-medium">Loading sample protocol...</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Downloading and uploading theophylline study protocol
                  </p>
                </div>
              ) : protocolFile ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                      <div>
                        <p className="font-medium">{protocolFile.filename}</p>
                        <p className="text-sm text-muted-foreground">
                          {(protocolFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={removeProtocol}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {extractingMetadata && (
                    <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-800">Extracting metadata...</p>
                        <p className="text-sm text-blue-600">
                          AI is reading your protocol to extract study information
                        </p>
                      </div>
                    </div>
                  )}

                  {metadataExtracted && !extractingMetadata && (
                    <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800">Metadata extracted successfully!</p>
                        <p className="text-sm text-green-600">
                          Study information has been pre-filled. You can review and edit in the next step.
                        </p>
                      </div>
                    </div>
                  )}

                  {extractionError && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {extractionError}
                        <Button
                          variant="link"
                          className="p-0 h-auto ml-2"
                          onClick={() => protocolFile && extractMetadataFromProtocol(protocolFile)}
                        >
                          Try again
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : null}

              {!isDemo && (
                <p className="text-sm text-muted-foreground mt-6">
                  <strong>Tip:</strong> You can skip this step and enter metadata manually, but uploading a protocol helps ensure accuracy and saves time.
                </p>
              )}
            </div>
          )}

          {/* Step 3: Study Info */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Study Information</h2>
              <p className="text-muted-foreground mb-6">
                {metadataExtracted
                  ? "Review the extracted metadata and make any necessary corrections"
                  : "Enter the study metadata for your report"
                }
              </p>

              {metadataExtracted && (
                <Alert className="mb-6">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Fields were pre-filled from your protocol. Please review and correct any inaccuracies.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="studyId">Study ID *</Label>
                  <Input
                    id="studyId"
                    placeholder="e.g., STU-2024-001"
                    value={formData.studyId}
                    onChange={(e) => updateFormData("studyId", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reportNumber">Report Number</Label>
                  <Input
                    id="reportNumber"
                    placeholder="e.g., PK001"
                    value={formData.reportNumber}
                    onChange={(e) => updateFormData("reportNumber", e.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="reportTitle">Report Title *</Label>
                  <Input
                    id="reportTitle"
                    placeholder="e.g., Pharmacokinetic Analysis of Test Article in Cynomolgus Monkeys"
                    value={formData.reportTitle}
                    onChange={(e) => updateFormData("reportTitle", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="testFacility">Test Facility</Label>
                  <Input
                    id="testFacility"
                    placeholder="e.g., ABC Research Laboratories"
                    value={formData.testFacility}
                    onChange={(e) => updateFormData("testFacility", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="testFacilityStudyNum">Test Facility Study Number</Label>
                  <Input
                    id="testFacilityStudyNum"
                    placeholder="e.g., TF-2024-001"
                    value={formData.testFacilityStudyNum}
                    onChange={(e) => updateFormData("testFacilityStudyNum", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="species">Species</Label>
                  <Select
                    value={formData.species}
                    onValueChange={(value) => updateFormData("species", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select species" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cynomolgus">Cynomolgus Monkey</SelectItem>
                      <SelectItem value="rhesus">Rhesus Monkey</SelectItem>
                      <SelectItem value="rat">Rat</SelectItem>
                      <SelectItem value="mouse">Mouse</SelectItem>
                      <SelectItem value="dog">Dog</SelectItem>
                      <SelectItem value="rabbit">Rabbit</SelectItem>
                      <SelectItem value="human">Human</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="routeOfAdmin">Route of Administration</Label>
                  <Select
                    value={formData.routeOfAdmin}
                    onValueChange={(value) => updateFormData("routeOfAdmin", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select route" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IV">Intravenous (IV)</SelectItem>
                      <SelectItem value="SC">Subcutaneous (SC)</SelectItem>
                      <SelectItem value="IM">Intramuscular (IM)</SelectItem>
                      <SelectItem value="PO">Oral (PO)</SelectItem>
                      <SelectItem value="IP">Intraperitoneal (IP)</SelectItem>
                      <SelectItem value="Topical">Topical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doseLevel">Dose Level(s)</Label>
                  <Input
                    id="doseLevel"
                    placeholder="e.g., 0.25, 1.0 mg/kg"
                    value={formData.doseLevel}
                    onChange={(e) => updateFormData("doseLevel", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="analytes">Analyte(s)</Label>
                  <Input
                    id="analytes"
                    placeholder="e.g., mRNA, ionizable lipid"
                    value={formData.analytes}
                    onChange={(e) => updateFormData("analytes", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="matrices">Matrix/Matrices</Label>
                  <Input
                    id="matrices"
                    placeholder="e.g., plasma, liver, spleen"
                    value={formData.matrices}
                    onChange={(e) => updateFormData("matrices", e.target.value)}
                  />
                </div>

                <div className="md:col-span-2">
                  <h3 className="font-medium mt-4 mb-4">Author Information</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="preparedBy">Prepared By</Label>
                      <Input
                        id="preparedBy"
                        placeholder="Name, Degree, Title"
                        value={formData.preparedBy}
                        onChange={(e) => updateFormData("preparedBy", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reviewedBy">Reviewed By</Label>
                      <Input
                        id="reviewedBy"
                        placeholder="Name, Degree, Title"
                        value={formData.reviewedBy}
                        onChange={(e) => updateFormData("reviewedBy", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="approvedBy">Approved By</Label>
                      <Input
                        id="approvedBy"
                        placeholder="Name, Degree, Title"
                        value={formData.approvedBy}
                        onChange={(e) => updateFormData("approvedBy", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Data Files */}
          {currentStep === 4 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Upload Data Files</h2>
              <p className="text-muted-foreground mb-6">
                {isDemo
                  ? "In demo mode, use our sample theophylline study data files to explore the full workflow."
                  : "Upload your data files (NCA parameters, concentration data) and figures"
                }
              </p>

              {isDemo && dataFiles.length === 0 && !loadingSampleData && (
                <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-800 mb-2">
                    <Play className="h-5 w-5" />
                    <span className="font-medium">Demo Mode: Sample Data</span>
                  </div>
                  <p className="text-sm text-blue-600 mb-4">
                    In demo mode, you can only use our sample theophylline study data. Click the button below to load NCA parameters, concentration-time data, and figures.
                  </p>
                  <Button
                    onClick={loadSampleData}
                    disabled={loadingSampleData}
                    className="gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                  >
                    {loadingSampleData ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading Sample Data...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Use Sample Theophylline Data
                      </>
                    )}
                  </Button>
                </div>
              )}

              {loadingSampleData ? (
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Loader2 className="h-12 w-12 mx-auto text-blue-500 mb-4 animate-spin" />
                  <p className="text-blue-600 font-medium">Loading sample data files...</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Uploading NCA parameters and concentration data
                  </p>
                </div>
              ) : !isDemo ? (
                <FileUploader onUpload={handleDataFileUpload} />
              ) : null}

              {dataFiles.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-medium mb-3">Uploaded Files ({dataFiles.length})</h3>
                  <div className="space-y-2">
                    {dataFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium text-sm">{file.filename}</p>
                            <p className="text-xs text-muted-foreground">
                              {file.fileType} | {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeDataFile(file.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Review & Create</h2>
              <p className="text-muted-foreground mb-6">
                Review your report settings before creating
              </p>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Report Details</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Report Type</p>
                      <p className="font-medium">
                        {REPORT_TYPES.find(t => t.type === formData.reportType)?.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Study ID</p>
                      <p className="font-medium">{formData.studyId}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-muted-foreground">Report Title</p>
                      <p className="font-medium">{formData.reportTitle}</p>
                    </div>
                    {formData.testFacility && (
                      <div>
                        <p className="text-sm text-muted-foreground">Test Facility</p>
                        <p className="font-medium">{formData.testFacility}</p>
                      </div>
                    )}
                    {formData.species && (
                      <div>
                        <p className="text-sm text-muted-foreground">Species</p>
                        <p className="font-medium">{formData.species}</p>
                      </div>
                    )}
                    {formData.routeOfAdmin && (
                      <div>
                        <p className="text-sm text-muted-foreground">Route</p>
                        <p className="font-medium">{formData.routeOfAdmin}</p>
                      </div>
                    )}
                    {formData.doseLevel && (
                      <div>
                        <p className="text-sm text-muted-foreground">Dose Level(s)</p>
                        <p className="font-medium">{formData.doseLevel}</p>
                      </div>
                    )}
                    {formData.analytes && (
                      <div>
                        <p className="text-sm text-muted-foreground">Analyte(s)</p>
                        <p className="font-medium">{formData.analytes}</p>
                      </div>
                    )}
                    {formData.matrices && (
                      <div>
                        <p className="text-sm text-muted-foreground">Matrix/Matrices</p>
                        <p className="font-medium">{formData.matrices}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Uploaded Files</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!protocolFile && dataFiles.length === 0 ? (
                      <p className="text-muted-foreground">No files uploaded</p>
                    ) : (
                      <ul className="space-y-1">
                        {protocolFile && (
                          <li className="flex items-center gap-2 text-sm">
                            <FileText className="h-4 w-4 text-green-600" />
                            {protocolFile.filename}
                            <span className="text-xs text-muted-foreground">(Protocol)</span>
                          </li>
                        )}
                        {dataFiles.map((file) => (
                          <li key={file.id} className="flex items-center gap-2 text-sm">
                            <FileText className="h-4 w-4" />
                            {file.filename}
                            <span className="text-xs text-muted-foreground">({file.fileType})</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>

            {currentStep < STEPS.length ? (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create Report <Check className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

function LoadingFallback() {
  return (
    <main className="container py-8">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    </main>
  )
}

export default function NewReportPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container flex h-14 sm:h-16 items-center gap-2 sm:gap-4 px-4">
          <Link href="/reports">
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            <span className="text-lg sm:text-xl font-bold">New Report</span>
          </div>
        </div>
      </header>

      <Suspense fallback={<LoadingFallback />}>
        <NewReportContent />
      </Suspense>
    </div>
  )
}
