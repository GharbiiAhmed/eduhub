"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useEffect, useState, use } from "react"
import { useRouter } from '@/i18n/routing'
import { useTranslations, useLocale } from 'next-intl'
import CourseNavigationSidebar from "@/components/student/course-navigation-sidebar"
import { 
  PlayCircle, 
  CheckCircle2, 
  Clock, 
  BookOpen, 
  FileText,
  Video as VideoIcon,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Trophy
} from "lucide-react"
import { cn } from "@/lib/utils"

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
  const [videoError, setVideoError] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [moduleId, setModuleId] = useState<string | null>(null)
  const [courseId, setCourseId] = useState<string | null>(null)
  const [videoProgress, setVideoProgress] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const router = useRouter()
  const locale = useLocale()
  const isRTL = locale === 'ar'

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

      const { data: lessonData } = await supabase
        .from("lessons")
        .select("*, modules(id, course_id)")
        .eq("id", lessonId)
        .single()

      if (lessonData) {
        setLesson(lessonData)
        setModuleId(lessonData.module_id)
        if (lessonData.modules) {
          setCourseId(lessonData.modules.course_id)
        }
        
        // If video URL exists, try to get a working URL
        if (lessonData.video_url) {
          console.log('Video URL from database:', lessonData.video_url)
          
          try {
            let filePath: string | null = null
            
            const patterns = [
              /\/storage\/v1\/object\/public\/lesson-videos\/(.+)$/,
              /\/storage\/v1\/object\/sign\/lesson-videos\/(.+)$/,
              /lesson-videos\/(.+)$/
            ]
            
            for (const pattern of patterns) {
              const match = lessonData.video_url.match(pattern)
              if (match && match[1]) {
                filePath = decodeURIComponent(match[1].split('?')[0])
                break
              }
            }
            
            if (!filePath) {
              const urlParts = lessonData.video_url.split('/lesson-videos/')
              if (urlParts.length > 1) {
                filePath = decodeURIComponent(urlParts[1].split('?')[0])
              }
            }
            
            if (filePath) {
              console.log('Extracted file path:', filePath)
              
              const isAlreadySigned = lessonData.video_url.includes('/sign/') && lessonData.video_url.includes('token=')
              
              if (isAlreadySigned) {
                console.log('Using existing signed URL from database')
                setVideoUrl(lessonData.video_url)
              } else {
              const { data: signedData, error: signedError } = await supabase
                .storage
                .from('lesson-videos')
                  .createSignedUrl(filePath, 7200)
              
              if (!signedError && signedData?.signedUrl) {
                console.log('Generated signed URL successfully')
                setVideoUrl(signedData.signedUrl)
              } else {
                console.error('Error generating signed URL:', signedError)
                  
                  if (signedError?.message?.includes('Bucket not found') || signedError?.message?.includes('bucket')) {
                    console.error('Bucket access error. Trying to use original URL.')
                    setVideoUrl(lessonData.video_url)
                    setVideoError('Unable to access video storage. Please contact support if this issue persists.')
                  } else {
                const { data: publicUrlData } = supabase
                  .storage
                  .from('lesson-videos')
                  .getPublicUrl(filePath)
                
                if (publicUrlData?.publicUrl) {
                      console.log('Using public URL as fallback:', publicUrlData.publicUrl)
                  setVideoUrl(publicUrlData.publicUrl)
                } else {
                  console.error('Failed to get public URL')
                      console.warn('Using original URL as last resort. Signed URL error:', signedError)
                      setVideoUrl(lessonData.video_url)
                      if (signedError) {
                        setVideoError(`Video access error: ${signedError.message}. The file may not exist or the path may be incorrect.`)
                      }
                    }
                  }
                }
              }
            } else {
              console.warn('Could not extract file path from URL, using original URL')
              setVideoUrl(lessonData.video_url)
            }
          } catch (error) {
            console.error('Error processing video URL:', error)
            setVideoUrl(lessonData.video_url)
            if (error instanceof Error) {
              setVideoError(`Error loading video: ${error.message}`)
            }
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

      const { data: lessonData } = await supabase
        .from("lessons")
        .select("module_id, modules(course_id)")
        .eq("id", lessonId)
        .single()

      if (!lessonData) throw new Error("Lesson not found")

      const courseId = lessonData.modules?.course_id
      if (!courseId) throw new Error("Course not found")

      await supabase.from("lesson_progress").upsert({
        student_id: user.id,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date().toISOString(),
      })

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading lesson...</p>
        </div>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p className="text-lg font-medium">Lesson not found</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <BookOpen className="h-3 w-3" />
                  Lesson
                </Badge>
                {isCompleted && (
                  <Badge variant="default" className="gap-1 bg-green-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Completed
                  </Badge>
                )}
              </div>
              <h1 className="text-4xl font-bold tracking-tight">{lesson.title}</h1>
              {lesson.description && (
                <p className="text-lg text-muted-foreground">{lesson.description}</p>
              )}
            </div>
            <Button variant="outline" onClick={() => router.back()} className="shrink-0">
              <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

          {/* Progress Bar */}
          {videoDuration > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Video Progress</span>
                <span className="font-medium">{formatTime(videoProgress)} / {formatTime(videoDuration)}</span>
              </div>
              <Progress value={(videoProgress / videoDuration) * 100} className="h-2" />
            </div>
          )}
            </div>

        {/* Video Section */}
          {(lesson.content_type === "video" || lesson.content_type === "mixed") && (videoUrl || lesson.video_url) && (
          <Card className="overflow-hidden border-2">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 pb-3">
              <div className="flex items-center gap-2">
                <VideoIcon className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl">Video Lesson</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {videoError ? (
                <div className="p-8 bg-destructive/10 text-destructive rounded-lg m-4">
                  <div className="text-center space-y-4">
                    <div className="text-4xl">⚠️</div>
                    <div>
                      <p className="font-semibold text-lg">Unable to load video</p>
                  <p className="text-sm mt-1">{videoError}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={async () => {
                        setVideoError(null)
                        const supabase = createClient()
                        const currentUrl = videoUrl || lesson.video_url
                        
                        let filePath: string | null = null
                        const patterns = [
                          /\/storage\/v1\/object\/public\/lesson-videos\/(.+)$/,
                          /\/storage\/v1\/object\/sign\/lesson-videos\/(.+)$/,
                          /lesson-videos\/(.+)$/
                        ]
                        
                        for (const pattern of patterns) {
                          const match = currentUrl?.match(pattern)
                          if (match && match[1]) {
                            filePath = decodeURIComponent(match[1].split('?')[0])
                            break
                          }
                        }
                        
                        if (!filePath && currentUrl) {
                          const urlParts = currentUrl.split('/lesson-videos/')
                          if (urlParts.length > 1) {
                            filePath = decodeURIComponent(urlParts[1].split('?')[0])
                          }
                        }
                        
                        if (filePath) {
                          const { data: signedData, error: signedError } = await supabase
                            .storage
                            .from('lesson-videos')
                            .createSignedUrl(filePath, 3600)
                          
                          if (signedData?.signedUrl) {
                            setVideoUrl(signedData.signedUrl)
                          } else if (signedError) {
                            setVideoError(`Failed to generate signed URL: ${signedError.message}`)
                          }
                        } else {
                          setVideoError('Could not extract file path from URL')
                        }
                        
                        const video = document.querySelector('video') as HTMLVideoElement
                        if (video) {
                          video.load()
                        }
                      }}
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="relative bg-black rounded-lg overflow-hidden">
                <video 
                  src={videoUrl || lesson.video_url} 
                  controls 
                  preload="metadata"
                  playsInline
                    className="w-full aspect-video"
                  crossOrigin="anonymous"
                    onTimeUpdate={(e) => {
                      const video = e.target as HTMLVideoElement
                      setVideoProgress(video.currentTime)
                    }}
                    onLoadedMetadata={(e) => {
                      const video = e.target as HTMLVideoElement
                      setVideoDuration(video.duration)
                    }}
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
                            errorMessage = "Network error occurred while loading the video."
                          break
                        case error.MEDIA_ERR_DECODE:
                            errorMessage = "Video decoding error. The file may be corrupted."
                          break
                        case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                          errorMessage = "Video format not supported by your browser."
                          break
                      }
                    }
                    setVideoError(errorMessage)
                  }}
                  onCanPlay={() => {
                    setVideoError(null)
                  }}
                >
                  <source src={videoUrl || lesson.video_url} type="video/mp4" />
                  <source src={videoUrl || lesson.video_url} type="video/webm" />
                  Your browser does not support the video tag.
                </video>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Text Content */}
        {(lesson.content_type === "text" || lesson.content_type === "mixed") && lesson.text_content && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle>Lesson Content</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-lg dark:prose-invert max-w-none">
                <div dangerouslySetInnerHTML={{ __html: lesson.text_content }} />
            </div>
            </CardContent>
          </Card>
          )}

        {/* PDF Content */}
          {(lesson.content_type === "pdf" || lesson.content_type === "mixed") && lesson.pdf_url && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle>PDF Document</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <a href={lesson.pdf_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="w-full sm:w-auto">
                  <FileText className="h-4 w-4 mr-2" />
                  Open PDF Document
                </Button>
              </a>
            </CardContent>
          </Card>
          )}

        {/* Completion Section */}
        <Card className={cn(
          "border-2 transition-all",
          isCompleted ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-primary/20"
        )}>
          <CardContent className="p-6">
            {isCompleted ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-green-500 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-green-700 dark:text-green-400">Lesson Completed!</h3>
                    <p className="text-sm text-muted-foreground">Great job! You've completed this lesson.</p>
                  </div>
                </div>
                <Trophy className="h-8 w-8 text-yellow-500" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-6 w-6 text-primary" />
                  <div>
                    <h3 className="text-lg font-semibold">Ready to mark as complete?</h3>
                    <p className="text-sm text-muted-foreground">Make sure you've reviewed all the content before completing.</p>
                  </div>
                </div>
                <Button 
                  onClick={handleMarkComplete} 
                  disabled={isMarking} 
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  {isMarking ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {t('marking')}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {t('markAsComplete')}
                    </>
                  )}
            </Button>
              </div>
          )}
        </CardContent>
        </Card>
        </div>
      </div>

      {/* Course Navigation Sidebar */}
      {courseId && (
        <CourseNavigationSidebar
          courseId={courseId}
          currentLessonId={lessonId}
        />
      )}
    </div>
  )
}
