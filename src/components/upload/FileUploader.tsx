"use client"

import { useCallback, useState, useRef } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, File, X, CheckCircle, AlertCircle, Folder, FolderOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn, formatFileSize } from "@/lib/utils"

interface UploadedFile {
  id: string
  filename: string
  fileType: string
  size: number
  blobUrl: string
  extractedData?: any
  folderPath?: string // Track which folder the file came from
}

interface FileUploaderProps {
  onUpload: (files: UploadedFile[]) => void
  maxFiles?: number
  acceptedTypes?: Record<string, string[]>
  fileTypes?: string[] // Force specific file types (e.g., ['PROTOCOL'])
  singleFile?: boolean // Limit to single file
  allowFolders?: boolean // Enable folder upload
}

interface UploadingFile {
  file: File
  progress: number
  status: 'uploading' | 'success' | 'error'
  error?: string
  folderPath?: string
}

// Type for File with webkitRelativePath (already present on File interface)
type FileWithPath = File

export function FileUploader({
  onUpload,
  maxFiles = 100,
  acceptedTypes = {
    'text/csv': ['.csv'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-excel': ['.xls'],
    'application/pdf': ['.pdf'],
    'image/png': ['.png'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'text/plain': ['.txt'],
    'application/json': ['.json'],
  },
  fileTypes,
  singleFile = false,
  allowFolders = true
}: FileUploaderProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [uploadStats, setUploadStats] = useState<{ total: number; completed: number; failed: number } | null>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  // Determine file type based on filename and content type
  const detectFileType = (file: File, folderPath?: string): string => {
    if (fileTypes && fileTypes.length > 0) {
      return fileTypes[0]
    }

    const filename = file.name.toLowerCase()
    const fullPath = folderPath ? `${folderPath}/${filename}`.toLowerCase() : filename

    // Check folder names for context
    if (fullPath.includes('nca') || fullPath.includes('parameter')) {
      return 'NCA_PARAMETERS'
    }
    if (fullPath.includes('concentration') || fullPath.includes('conc_')) {
      return 'CONCENTRATION_DATA'
    }
    if (fullPath.includes('tissue')) {
      return 'TISSUE_DATA'
    }
    if (fullPath.includes('protocol') || fullPath.includes('study_design')) {
      return 'PROTOCOL'
    }
    if (fullPath.includes('figure') || fullPath.includes('graph') || fullPath.includes('chart')) {
      return 'FIGURE'
    }
    if (file.type.startsWith('image/')) {
      return 'FIGURE'
    }
    if (file.type === 'application/pdf') {
      return 'PROTOCOL'
    }

    return 'OTHER'
  }

  // Process and upload files
  const processFiles = useCallback(async (files: FileWithPath[]) => {
    // Filter out hidden files and system files
    const validFiles = files.filter(file => {
      const name = file.name
      return !name.startsWith('.') && !name.startsWith('__') && !name.includes('.DS_Store')
    })

    if (validFiles.length === 0) return

    // Limit files if needed
    const filesToUpload = singleFile ? validFiles.slice(0, 1) : validFiles.slice(0, maxFiles)

    // Initialize upload stats
    setUploadStats({ total: filesToUpload.length, completed: 0, failed: 0 })

    const newUploading = filesToUpload.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const,
      folderPath: file.webkitRelativePath ? file.webkitRelativePath.split('/').slice(0, -1).join('/') : undefined
    }))

    setUploadingFiles(prev => [...prev, ...newUploading])

    const uploadedFiles: UploadedFile[] = []
    let completed = 0
    let failed = 0

    // Upload files in parallel batches
    const batchSize = 5
    for (let i = 0; i < filesToUpload.length; i += batchSize) {
      const batch = filesToUpload.slice(i, i + batchSize)

      await Promise.all(batch.map(async (file) => {
        const folderPath = file.webkitRelativePath ? file.webkitRelativePath.split('/').slice(0, -1).join('/') : undefined

        try {
          const formData = new FormData()
          formData.append('file', file)

          const fileType = detectFileType(file, folderPath)
          formData.append('fileType', fileType)

          // Include folder path in metadata
          if (folderPath) {
            formData.append('folderPath', folderPath)
          }

          // Simulate progress updates
          const progressInterval = setInterval(() => {
            setUploadingFiles(prev =>
              prev.map(uf =>
                uf.file === file && uf.progress < 90
                  ? { ...uf, progress: uf.progress + 10 }
                  : uf
              )
            )
          }, 100)

          const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData
          })

          clearInterval(progressInterval)

          if (res.ok) {
            const data = await res.json()
            uploadedFiles.push({
              id: data.id,
              filename: file.name,
              fileType: fileType,
              size: file.size,
              blobUrl: data.blobUrl,
              extractedData: data.extractedData,
              folderPath: folderPath
            })

            setUploadingFiles(prev =>
              prev.map(uf =>
                uf.file === file
                  ? { ...uf, progress: 100, status: 'success' }
                  : uf
              )
            )
            completed++
          } else {
            throw new Error('Upload failed')
          }
        } catch (error) {
          setUploadingFiles(prev =>
            prev.map(uf =>
              uf.file === file
                ? { ...uf, status: 'error', error: 'Upload failed' }
                : uf
            )
          )
          failed++
        }

        // Update stats
        setUploadStats(prev => prev ? { ...prev, completed, failed } : null)
      }))
    }

    if (uploadedFiles.length > 0) {
      onUpload(uploadedFiles)
    }

    // Clear completed uploads after a delay
    setTimeout(() => {
      setUploadingFiles(prev => prev.filter(uf => uf.status === 'uploading'))
      setUploadStats(null)
    }, 3000)
  }, [onUpload, fileTypes, singleFile, maxFiles])

  // Handle regular file drop
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    await processFiles(acceptedFiles as FileWithPath[])
  }, [processFiles])

  // Handle folder selection
  const handleFolderSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    // Convert FileList to array with webkitRelativePath preserved
    const fileArray: FileWithPath[] = []
    for (let i = 0; i < files.length; i++) {
      fileArray.push(files[i] as FileWithPath)
    }

    await processFiles(fileArray)

    // Reset input
    if (folderInputRef.current) {
      folderInputRef.current.value = ''
    }
  }, [processFiles])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: singleFile ? 1 : maxFiles,
    accept: acceptedTypes,
    noClick: false,
    noKeyboard: false
  })

  const removeUploadingFile = (file: File) => {
    setUploadingFiles(prev => prev.filter(uf => uf.file !== file))
  }

  // Group uploading files by folder
  const groupedFiles = uploadingFiles.reduce((acc, uf) => {
    const folder = uf.folderPath || 'Individual Files'
    if (!acc[folder]) acc[folder] = []
    acc[folder].push(uf)
    return acc
  }, {} as Record<string, UploadingFile[]>)

  return (
    <div className="space-y-4">
      {/* Main drop zone for files */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-gray-200 hover:border-primary/50"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
        {isDragActive ? (
          <p className="text-primary font-medium">Drop files here...</p>
        ) : (
          <>
            <p className="font-medium">Drag & drop files here, or click to select</p>
            <p className="text-sm text-muted-foreground mt-1">
              Supported: CSV, Excel, PDF, PNG, JPG, TXT, JSON
            </p>
          </>
        )}
      </div>

      {/* Folder upload button */}
      {allowFolders && !singleFile && (
        <div className="flex items-center gap-4">
          <div className="flex-1 border-t border-gray-200" />
          <span className="text-sm text-muted-foreground">or</span>
          <div className="flex-1 border-t border-gray-200" />
        </div>
      )}

      {allowFolders && !singleFile && (
        <div className="flex gap-3">
          <input
            ref={folderInputRef}
            type="file"
            // @ts-ignore - webkitdirectory is not in standard types
            webkitdirectory=""
            // @ts-ignore
            directory=""
            multiple
            onChange={handleFolderSelect}
            className="hidden"
            id="folder-upload"
          />
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => folderInputRef.current?.click()}
          >
            <FolderOpen className="h-4 w-4 mr-2" />
            Upload Folder(s)
          </Button>
          <p className="text-xs text-muted-foreground self-center">
            Select one or more folders to upload all files within
          </p>
        </div>
      )}

      {/* Upload progress stats */}
      {uploadStats && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-blue-700">
              Uploading {uploadStats.total} files...
            </span>
            <span className="text-blue-600">
              {uploadStats.completed} completed
              {uploadStats.failed > 0 && <span className="text-red-500"> · {uploadStats.failed} failed</span>}
            </span>
          </div>
          <Progress
            value={(uploadStats.completed / uploadStats.total) * 100}
            className="h-2 mt-2"
          />
        </div>
      )}

      {/* Uploading files list - grouped by folder */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {Object.entries(groupedFiles).map(([folder, files]) => (
            <div key={folder} className="space-y-1">
              {folder !== 'Individual Files' && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                  <Folder className="h-4 w-4" />
                  <span className="font-medium">{folder}</span>
                  <span className="text-xs">({files.length} files)</span>
                </div>
              )}
              {files.map((uf, idx) => (
                <div
                  key={`${folder}-${idx}`}
                  className={cn(
                    "flex items-center gap-3 p-2 bg-gray-50 rounded-lg",
                    folder !== 'Individual Files' && "ml-6"
                  )}
                >
                  <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">{uf.file.name}</p>
                      <span className="text-xs text-muted-foreground ml-2">
                        {formatFileSize(uf.file.size)}
                      </span>
                    </div>
                    {uf.status === 'uploading' && (
                      <Progress value={uf.progress} className="h-1 mt-1" />
                    )}
                    {uf.status === 'error' && (
                      <p className="text-xs text-destructive mt-1">{uf.error}</p>
                    )}
                  </div>
                  {uf.status === 'success' && (
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  )}
                  {uf.status === 'error' && (
                    <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                  )}
                  {uf.status === 'uploading' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={() => removeUploadingFile(uf.file)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        <p className="font-medium mb-1">File type detection:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Files/folders containing "NCA" or "parameter" → NCA Parameters</li>
          <li>Files/folders containing "concentration" → Concentration Data</li>
          <li>Files/folders containing "tissue" → Tissue Data</li>
          <li>Images (PNG/JPG) → Figures</li>
          <li>PDFs → Protocol Documents</li>
        </ul>
        {allowFolders && (
          <p className="mt-2 text-muted-foreground">
            <strong>Tip:</strong> Folder names are used for automatic file type detection.
            Name your folders descriptively (e.g., "NCA_Parameters", "Concentration_Data").
          </p>
        )}
      </div>
    </div>
  )
}
