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

          {(lesson.content_type === "video" || lesson.content_type === "mixed") && lesson.video_url && (
            <div>
              <h3 className="font-semibold mb-2">Video</h3>
              <video src={lesson.video_url} controls className="w-full rounded-lg" style={{ maxHeight: "500px" }} />
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
