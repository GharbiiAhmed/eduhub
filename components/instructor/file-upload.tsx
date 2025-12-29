"use client"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Upload, X, CheckCircle2, AlertCircle, File, Image as ImageIcon, Video, FileText } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useTranslations } from 'next-intl'
import Image from "next/image"

interface FileUploadProps {
  bucket: string
  folder?: string
  accept?: string
  maxSize?: number // in MB
  onUploadComplete: (url: string) => void
  currentUrl?: string
  label?: string
  description?: string
  type?: "image" | "video" | "pdf" | "file"
}

export function FileUpload({
  bucket,
  folder = "",
  accept,
  maxSize = 50,
  onUploadComplete,
  currentUrl,
  label = "Upload File",
  description,
  type = "file",
}: FileUploadProps) {
  const t = useTranslations('courses')
  const tCommon = useTranslations('common')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const getIcon = () => {
    switch (type) {
      case "image":
        return <ImageIcon className="w-5 h-5" />
      case "video":
        return <Video className="w-5 h-5" />
      case "pdf":
        return <FileText className="w-5 h-5" />
      default:
        return <File className="w-5 h-5" />
    }
  }

  const getAcceptTypes = () => {
    if (accept) return accept
    switch (type) {
      case "image":
        return "image/*"
      case "video":
        return "video/*"
      case "pdf":
        return "application/pdf"
      default:
        return "*/*"
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > maxSize) {
      toast({
        title: t('fileTooLarge'),
        description: t('fileSizeMustBeLessThan', { maxSize }),
        variant: "destructive",
      })
      return
    }

    // Validate file type
    if (type === "image" && !file.type.startsWith("image/")) {
      toast({
        title: t('invalidFileType'),
        description: t('pleaseSelectImageFile'),
        variant: "destructive",
      })
      return
    }

    if (type === "video" && !file.type.startsWith("video/")) {
      toast({
        title: t('invalidFileType'),
        description: t('pleaseSelectVideoFile'),
        variant: "destructive",
      })
      return
    }

    if (type === "pdf" && file.type !== "application/pdf") {
      toast({
        title: t('invalidFileType'),
        description: t('pleaseSelectPdfFile'),
        variant: "destructive",
      })
      return
    }

    // Create preview for images
    if (type === "image") {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }

    await uploadFile(file)
  }

  const uploadFile = async (file: File) => {
    try {
      setUploading(true)
      setUploadProgress(0)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error(t('mustBeLoggedInToUpload'))
      }

      // Generate unique filename
      const fileExt = file.name.split(".").pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`
      const filePath = folder ? `${folder}/${fileName}` : fileName

      // Get session for auth headers
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error(t('mustBeLoggedInToUpload'))
      }

      // Use Supabase SDK with progress simulation
      // Start with initial progress to show activity
      setUploadProgress(5)
      
      // Calculate estimated upload time based on file size (rough estimate: 1MB per second)
      const fileSizeMB = file.size / (1024 * 1024)
      const estimatedSeconds = Math.max(fileSizeMB * 0.8, 3) // Estimate, minimum 3 seconds
      const updateInterval = 200 // Update every 200ms for smooth progress
      const progressPerUpdate = 85 / (estimatedSeconds * 1000 / updateInterval) // Reach 85% over estimated time

      // Start progress simulation immediately
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev < 85) {
            const newProgress = prev + progressPerUpdate
            return Math.min(newProgress, 85)
          }
          return prev
        })
      }, updateInterval)

      try {
        // Upload file to Supabase Storage
        const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        })

        clearInterval(progressInterval)

        if (error) {
          throw error
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from(bucket).getPublicUrl(filePath)

        setUploadProgress(100)
        setPreviewUrl(publicUrl)
        onUploadComplete(publicUrl)

        toast({
          title: t('uploadSuccessful'),
          description: t('fileUploadedSuccessfully'),
        })
      } catch (uploadError: any) {
        clearInterval(progressInterval)
        throw uploadError
      }
    } catch (error: any) {
      console.error("Error uploading file:", error)
      toast({
        title: t('uploadFailed'),
        description: error.message || t('failedToUploadFile'),
        variant: "destructive",
      })
      setUploadProgress(0)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleRemove = () => {
    setPreviewUrl(null)
    onUploadComplete("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{label}</Label>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>

      {previewUrl && type === "image" && (
        <div className="relative w-full h-48 rounded-lg overflow-hidden border border-border">
          <Image
            src={previewUrl}
            alt="Preview"
            fill
            className="object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={handleRemove}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {previewUrl && type !== "image" && (
        <div className="flex items-center justify-between p-4 border border-border rounded-lg">
          <div className="flex items-center gap-2">
            {getIcon()}
            <span className="text-sm font-medium">{previewUrl.split("/").pop()}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRemove}
          >
            <X className="w-4 h-4 mr-2" />
            {tCommon('remove')}
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <Input
          ref={fileInputRef}
          type="file"
          accept={getAcceptTypes()}
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
          id={`file-upload-${bucket}`}
        />
        <Label htmlFor={`file-upload-${bucket}`}>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <>
                <Upload className="w-4 h-4 mr-2 animate-spin" />
                {t('uploading')}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                {previewUrl ? t('replaceFile') : t('chooseFile')}
              </>
            )}
          </Button>
        </Label>
        {uploading && (
          <div className="space-y-2">
            <Progress value={uploadProgress} />
            <p className="text-xs text-muted-foreground text-center">{uploadProgress}%</p>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {t('maxFileSize')}: {maxSize}MB
        </p>
      </div>
    </div>
  )
}

