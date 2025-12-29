"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState, use } from "react"
import { useRouter } from '@/i18n/routing'
import QuizSection from "@/components/student/quiz-section"
import { useTranslations } from 'next-intl'

export default function StudentLessonPage({
  params
}: {
  params: Promise<{ lessonId: string }>
}) {
  const t = useTranslations('courses')
  const tCommon = useTranslations('common')
  const { lessonId } = use(params)
  const [lesson, setLesson] = useState<any>(null)
  const [isCompleted, setIsCompleted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isMarking, setIsMarking] = useState(false)
  const [quizzes, setQuizzes] = useState<any[]>([])
  const [videoError, setVideoError] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchLesson = async () => {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data: lessonData } = await supabase.from("lessons").select("*").eq("id", lessonId).single()

      if (lessonData) {
        setLesson(lessonData)
        
        // If video URL exists, try to get a working URL
        if (lessonData.video_url) {
          console.log('Video URL from database:', lessonData.video_url)
          
          // Always try to generate a signed URL first (more reliable)
          try {
            // Extract path from Supabase storage URL
            // Format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
            let filePath: string | null = null
            
            // Try different URL patterns
            const patterns = [
              /\/storage\/v1\/object\/public\/lesson-videos\/(.+)$/,
              /\/storage\/v1\/object\/sign\/lesson-videos\/(.+)$/,
              /lesson-videos\/(.+)$/
            ]
            
            for (const pattern of patterns) {
              const match = lessonData.video_url.match(pattern)
              if (match && match[1]) {
                filePath = decodeURIComponent(match[1])
                break
              }
            }
            
            // If no pattern matched, try to extract from the full URL
            if (!filePath) {
              const urlParts = lessonData.video_url.split('/lesson-videos/')
              if (urlParts.length > 1) {
                filePath = decodeURIComponent(urlParts[1].split('?')[0]) // Remove query params
              }
            }
            
            if (filePath) {
              console.log('Extracted file path:', filePath)
              
              // Always use signed URL - it's more reliable and works for both public and private buckets
              const { data: signedData, error: signedError } = await supabase
                .storage
                .from('lesson-videos')
                .createSignedUrl(filePath, 7200) // 2 hour expiry
              
              if (!signedError && signedData?.signedUrl) {
                console.log('Generated signed URL successfully')
                setVideoUrl(signedData.signedUrl)
              } else {
                console.error('Error generating signed URL:', signedError)
                // Fallback: try public URL
                const { data: publicUrlData } = supabase
                  .storage
                  .from('lesson-videos')
                  .getPublicUrl(filePath)
                
                if (publicUrlData?.publicUrl) {
                  console.log('Using public URL as fallback')
                  setVideoUrl(publicUrlData.publicUrl)
                } else {
                  console.error('Failed to get public URL')
                  setVideoUrl(lessonData.video_url) // Last resort
                }
              }
            } else {
              console.warn('Could not extract file path from URL, using original URL')
              setVideoUrl(lessonData.video_url)
            }
          } catch (error) {
            console.error('Error processing video URL:', error)
            // Keep the original URL as fallback
            setVideoUrl(lessonData.video_url)
          }
        }

        // Check if lesson is completed
        const { data: progressData } = await supabase
          .from("lesson_progress")
          .select("*")
          .eq("student_id", user.id)
          .eq("lesson_id", lessonId)
          .single()

        if (progressData) {
          setIsCompleted(progressData.completed)
        }

        // Fetch quizzes for this specific lesson
        const { data: quizzesData } = await supabase
          .from("quizzes")
          .select("*")
          .eq("lesson_id", lessonId)
          .eq("is_published", true)

        if (quizzesData) {
          setQuizzes(quizzesData)
        }
      }

      setIsLoading(false)
    }

    fetchLesson()
  }, [lessonId, router])

  const handleMarkComplete = async () => {
    const supabase = createClient()
    setIsMarking(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error("Not authenticated")

      // First, get the course ID for this lesson
      const { data: lessonData } = await supabase
        .from("lessons")
        .select("module_id, modules(course_id)")
        .eq("id", lessonId)
        .single()

      if (!lessonData) throw new Error("Lesson not found")

      const courseId = lessonData.modules?.course_id
      if (!courseId) throw new Error("Course not found")

      // Update lesson progress
      await supabase.from("lesson_progress").upsert({
        student_id: user.id,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date().toISOString(),
      })

      // Update overall course progress
      const progressResponse = await fetch("/api/update-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: courseId,
          lessonId: lessonId,
          completed: true,
        }),
      })

      if (!progressResponse.ok) {
        console.error("Failed to update course progress")
      }

      setIsCompleted(true)
    } catch (error: unknown) {
      console.error("Error marking lesson complete:", error)
    } finally {
      setIsMarking(false)
    }
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!lesson) {
    return <div>Lesson not found</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{lesson.title}</h1>
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lesson Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {lesson.description && (
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground">{lesson.description}</p>
            </div>
          )}

          {(lesson.content_type === "text" || lesson.content_type === "mixed") && lesson.text_content && (
            <div>
              <h3 className="font-semibold mb-2">Content</h3>
              <div className="prose prose-sm max-w-none">{lesson.text_content}</div>
            </div>
          )}

          {(lesson.content_type === "video" || lesson.content_type === "mixed") && (videoUrl || lesson.video_url) && (
            <div>
              <h3 className="font-semibold mb-2">Video</h3>
              {videoError ? (
                <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
                  <p className="font-medium">Unable to load video</p>
                  <p className="text-sm mt-1">{videoError}</p>
                  <div className="mt-2 space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={async () => {
                        setVideoError(null)
                        // Try to regenerate signed URL
                        const supabase = createClient()
                        const urlMatch = (videoUrl || lesson.video_url)?.match(/\/storage\/v1\/object\/public\/lesson-videos\/(.+)$/)
                        if (urlMatch && urlMatch[1]) {
                          const filePath = decodeURIComponent(urlMatch[1])
                          const { data: signedData } = await supabase
                            .storage
                            .from('lesson-videos')
                            .createSignedUrl(filePath, 3600)
                          if (signedData?.signedUrl) {
                            setVideoUrl(signedData.signedUrl)
                          }
                        }
                        const video = document.querySelector('video') as HTMLVideoElement
                        if (video) {
                          video.load()
                        }
                      }}
                    >
                      Retry
                    </Button>
                    {videoUrl && (
                      <div className="text-xs text-muted-foreground mt-2">
                        <p>Video URL: {videoUrl.substring(0, 80)}...</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <video 
                  src={videoUrl || lesson.video_url} 
                  controls 
                  preload="metadata"
                  playsInline
                  className="w-full rounded-lg" 
                  style={{ maxHeight: "500px" }}
                  crossOrigin="anonymous"
                  onError={(e) => {
                    console.error("Video playback error:", e)
                    const target = e.target as HTMLVideoElement
                    const error = target.error
                    let errorMessage = "Unable to load video. Please check your internet connection or contact support."
                    
                    if (error) {
                      switch (error.code) {
                        case error.MEDIA_ERR_ABORTED:
                          errorMessage = "Video loading was aborted."
                          break
                        case error.MEDIA_ERR_NETWORK:
                          errorMessage = "Network error occurred while loading the video. The bucket may not be public or CORS may be blocking access."
                          break
                        case error.MEDIA_ERR_DECODE:
                          errorMessage = "Video decoding error. The file may be corrupted or in an unsupported format."
                          break
                        case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                          errorMessage = "Video format not supported by your browser."
                          break
                      }
                    }
                    console.error("Video error details:", {
                      code: error?.code,
                      message: error?.message,
                      url: videoUrl || lesson.video_url
                    })
                    setVideoError(errorMessage)
                  }}
                  onLoadStart={() => {
                    console.log("Video loading started:", videoUrl || lesson.video_url)
                  }}
                  onCanPlay={() => {
                    console.log("Video can play")
                    setVideoError(null)
                  }}
                >
                  <source src={videoUrl || lesson.video_url} type="video/mp4" />
                  <source src={videoUrl || lesson.video_url} type="video/webm" />
                  <source src={videoUrl || lesson.video_url} type="video/quicktime" />
                  Your browser does not support the video tag.
                </video>
              )}
            </div>
          )}

          {(lesson.content_type === "pdf" || lesson.content_type === "mixed") && lesson.pdf_url && (
            <div>
              <h3 className="font-semibold mb-2">PDF Document</h3>
              <a href={lesson.pdf_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline">Download PDF</Button>
              </a>
            </div>
          )}

          {!isCompleted && (
            <Button onClick={handleMarkComplete} disabled={isMarking} className="w-full">
              {isMarking ? t('marking') : t('markAsComplete')}
            </Button>
          )}

          {isCompleted && <div className="text-green-600 font-medium">✓ {t('lessonCompleted')}</div>}
        </CardContent>
      </Card>

      {quizzes.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Quizzes</h2>
          {quizzes.map((quiz) => (
            <QuizSection key={quiz.id} quiz={quiz} />
          ))}
        </div>
      )}
    </div>
  )
}
