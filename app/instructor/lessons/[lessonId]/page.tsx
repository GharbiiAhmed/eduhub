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
import { useRouter } from "next/navigation"
import { FileUpload } from "@/components/instructor/file-upload"

export default function LessonDetailPage({ params }: { params: Promise<{ lessonId: string }> }) {
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
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Edit Lesson</h1>
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lesson Details</CardTitle>
          <CardDescription>Update your lesson content</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveLesson} className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="title">Lesson Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contentType">Content Type</Label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger id="contentType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(contentType === "text" || contentType === "mixed") && (
              <div className="grid gap-2">
                <Label htmlFor="textContent">Text Content</Label>
                <Textarea
                  id="textContent"
                  rows={6}
                  placeholder="Enter your lesson content here..."
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
                  label="Lesson Image"
                  description="Upload an image for this lesson (JPG, PNG, WebP - max 10MB)"
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
                  label="Video File"
                  description="Upload a video file for this lesson (MP4, WebM, MOV - max 500MB)"
                  maxSize={500}
                  currentUrl={videoUrl}
                  onUploadComplete={(url) => setVideoUrl(url)}
                />
                <div className="text-sm text-muted-foreground">
                  Or enter a video URL:
                </div>
                <Input
                  id="videoUrl"
                  placeholder="https://example.com/video.mp4"
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
                  label="PDF File"
                  description="Upload a PDF file for this lesson (max 50MB)"
                  maxSize={50}
                  currentUrl={pdfUrl}
                  onUploadComplete={(url) => setPdfUrl(url)}
                />
                <div className="text-sm text-muted-foreground">
                  Or enter a PDF URL:
                </div>
                <Input
                  id="pdfUrl"
                  placeholder="https://example.com/document.pdf"
                  value={pdfUrl}
                  onChange={(e) => setPdfUrl(e.target.value)}
                />
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-4">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Lesson"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
