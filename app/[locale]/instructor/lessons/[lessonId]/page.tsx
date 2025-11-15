"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useEffect, useState, use } from "react"
import { useRouter } from '@/i18n/routing'
import { FileUpload } from "@/components/instructor/file-upload"
import { useTranslations } from 'next-intl'

export default function LessonDetailPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const t = useTranslations('courses')
  const tCommon = useTranslations('common')
  const { lessonId } = use(params)
  const [lesson, setLesson] = useState<any>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [contentType, setContentType] = useState("text")
  const [textContent, setTextContent] = useState("")
  const [videoUrl, setVideoUrl] = useState("")
  const [pdfUrl, setPdfUrl] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchLesson = async () => {
      const supabase = createClient()
      const { data } = await supabase.from("lessons").select("*").eq("id", lessonId).single()

      if (data) {
        setLesson(data)
        setTitle(data.title)
        setDescription(data.description || "")
        setContentType(data.content_type)
        setTextContent(data.text_content || "")
        setVideoUrl(data.video_url || "")
        setPdfUrl(data.pdf_url || "")
        setImageUrl(data.image_url || "")
      }
      setIsLoading(false)
    }

    fetchLesson()
  }, [lessonId])

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsSaving(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from("lessons")
        .update({
          title,
          description,
          content_type: contentType,
          text_content: textContent,
          video_url: videoUrl,
          pdf_url: pdfUrl,
          image_url: imageUrl || null,
        })
        .eq("id", lessonId)

      if (updateError) throw updateError

      router.back()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('anErrorOccurred'))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div>{tCommon('loading')}</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('editLesson')}</h1>
        <Button variant="outline" onClick={() => router.back()}>
          {tCommon('back')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('lessonDetails')}</CardTitle>
          <CardDescription>{t('updateYourLessonContent')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveLesson} className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="title">{t('lessonTitle')}</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">{tCommon('description')}</Label>
              <Textarea
                id="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contentType">{t('contentType')}</Label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger id="contentType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">{t('text')}</SelectItem>
                  <SelectItem value="video">{t('video')}</SelectItem>
                  <SelectItem value="pdf">{t('pdf')}</SelectItem>
                  <SelectItem value="mixed">{t('mixed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(contentType === "text" || contentType === "mixed") && (
              <div className="grid gap-2">
                <Label htmlFor="textContent">{t('textContent')}</Label>
                <Textarea
                  id="textContent"
                  rows={6}
                  placeholder={t('enterYourLessonContent')}
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                />
              </div>
            )}

            {(contentType === "text" || contentType === "mixed") && (
              <div className="grid gap-2">
                <FileUpload
                  bucket="lesson-images"
                  folder={`lesson-${lessonId}`}
                  type="image"
                  label={t('lessonImage')}
                  description={t('uploadImageDescription')}
                  maxSize={10}
                  currentUrl={imageUrl}
                  onUploadComplete={(url) => setImageUrl(url)}
                />
              </div>
            )}

            {(contentType === "video" || contentType === "mixed") && (
              <div className="grid gap-2">
                <FileUpload
                  bucket="lesson-videos"
                  folder={`lesson-${lessonId}`}
                  type="video"
                  label={t('videoFile')}
                  description={t('uploadVideoDescription')}
                  maxSize={500}
                  currentUrl={videoUrl}
                  onUploadComplete={(url) => setVideoUrl(url)}
                />
                <div className="text-sm text-muted-foreground">
                  {t('orEnterVideoUrl')}
                </div>
                <Input
                  id="videoUrl"
                  placeholder={t('videoUrlPlaceholder')}
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                />
              </div>
            )}

            {(contentType === "pdf" || contentType === "mixed") && (
              <div className="grid gap-2">
                <FileUpload
                  bucket="lesson-pdfs"
                  folder={`lesson-${lessonId}`}
                  type="pdf"
                  label={t('pdfFile')}
                  description={t('uploadPdfDescription')}
                  maxSize={50}
                  currentUrl={pdfUrl}
                  onUploadComplete={(url) => setPdfUrl(url)}
                />
                <div className="text-sm text-muted-foreground">
                  {t('orEnterPdfUrl')}
                </div>
                <Input
                  id="pdfUrl"
                  placeholder={t('pdfUrlPlaceholder')}
                  value={pdfUrl}
                  onChange={(e) => setPdfUrl(e.target.value)}
                />
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-4">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? t('saving') : t('saveLesson')}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                {tCommon('cancel')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
