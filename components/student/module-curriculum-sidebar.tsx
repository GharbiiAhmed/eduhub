"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { useParams } from "next/navigation"
import { 
  PlayCircle, 
  CheckCircle2, 
  Circle,
  FileText,
  HelpCircle,
  Clock,
  Award,
  BookOpen
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Lesson {
  id: string
  title: string
  content_type: string
  order_index: number
  duration?: number
}

interface Quiz {
  id: string
  title: string
  description: string
  order_index: number
  passing_score: number
  lesson_id?: string
  module_id?: string
}

interface LessonProgress {
  completed: boolean
  completed_at?: string
}

interface QuizProgress {
  completed: boolean
  score?: number
  passed?: boolean
  attempts?: number
}

interface ModuleCurriculumSidebarProps {
  moduleId: string
  currentLessonId?: string
  currentQuizId?: string
  courseId?: string
}

export default function ModuleCurriculumSidebar({ 
  moduleId, 
  currentLessonId,
  currentQuizId,
  courseId 
}: ModuleCurriculumSidebarProps) {
  const pathname = usePathname()
  const params = useParams()
  // Check if we're in a locale route by checking if params has locale
  const locale = params?.locale as string | undefined
  const localePrefix = locale ? `/${locale}` : ''
  
  const [module, setModule] = useState<any>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [lessonProgress, setLessonProgress] = useState<Record<string, LessonProgress>>({})
  const [quizProgress, setQuizProgress] = useState<Record<string, QuizProgress>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchModuleContent = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setLoading(true)

      // Fetch module info
      const { data: moduleData } = await supabase
        .from("modules")
        .select("*")
        .eq("id", moduleId)
        .single()

      if (moduleData) {
        setModule(moduleData)
      }

      // Fetch lessons
      const { data: lessonsData } = await supabase
        .from("lessons")
        .select("*")
        .eq("module_id", moduleId)
        .order("order_index", { ascending: true })

      if (lessonsData) {
        setLessons(lessonsData)

        // Fetch lesson progress
        const { data: progressData } = await supabase
          .from("lesson_progress")
          .select("lesson_id, completed, completed_at")
          .eq("student_id", user.id)
          .in("lesson_id", lessonsData.map(l => l.id))

        const progressMap: Record<string, LessonProgress> = {}
        progressData?.forEach((p) => {
          progressMap[p.lesson_id] = {
            completed: p.completed,
            completed_at: p.completed_at
          }
        })
        setLessonProgress(progressMap)
      }

      // Fetch quizzes - try both schema versions
      let { data: quizzesData } = await supabase
        .from("quizzes")
        .select("*")
        .eq("module_id", moduleId)
        .order("order_index", { ascending: true })

      // If no quizzes found, try: quizzes linked to lessons (older schema)
      if (!quizzesData || quizzesData.length === 0) {
        const lessonIds = lessonsData?.map(l => l.id) || []
        if (lessonIds.length > 0) {
          const { data: quizzesByLesson } = await supabase
            .from("quizzes")
            .select("*")
            .in("lesson_id", lessonIds)
            .order("order_index", { ascending: true })
          quizzesData = quizzesByLesson || []
        }
      }

      if (quizzesData) {
        setQuizzes(quizzesData)

        // Fetch quiz progress
        const { data: attemptsData } = await supabase
          .from("quiz_attempts")
          .select("quiz_id, score, passed, created_at")
          .eq("student_id", user.id)
          .in("quiz_id", quizzesData.map(q => q.id))
          .order("created_at", { ascending: false })

        const quizProgressMap: Record<string, QuizProgress> = {}
        attemptsData?.forEach((attempt) => {
          if (!quizProgressMap[attempt.quiz_id]) {
            quizProgressMap[attempt.quiz_id] = {
              completed: attempt.passed || false,
              score: attempt.score,
              passed: attempt.passed,
              attempts: 1
            }
          } else {
            quizProgressMap[attempt.quiz_id].attempts = (quizProgressMap[attempt.quiz_id].attempts || 0) + 1
            // Keep the best score
            if (attempt.score && (!quizProgressMap[attempt.quiz_id].score || attempt.score > quizProgressMap[attempt.quiz_id].score!)) {
              quizProgressMap[attempt.quiz_id].score = attempt.score
              quizProgressMap[attempt.quiz_id].passed = attempt.passed
              quizProgressMap[attempt.quiz_id].completed = attempt.passed || false
            }
          }
        })
        setQuizProgress(quizProgressMap)
      }

      setLoading(false)
    }

    if (moduleId) {
      fetchModuleContent()
    }
  }, [moduleId])

  // Calculate module progress
  const totalItems = lessons.length + quizzes.length
  const completedLessons = lessons.filter(l => lessonProgress[l.id]?.completed).length
  const completedQuizzes = quizzes.filter(q => quizProgress[q.id]?.completed).length
  const completedItems = completedLessons + completedQuizzes
  const moduleProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  // Combine and sort lessons and quizzes by order_index
  const allItems = [
    ...lessons.map(l => ({ ...l, type: 'lesson' as const })),
    ...quizzes.map(q => ({ ...q, type: 'quiz' as const }))
  ].sort((a, b) => {
    // If both have order_index, sort by that
    if (a.order_index !== undefined && b.order_index !== undefined) {
      return a.order_index - b.order_index
    }
    // Lessons come before quizzes if order_index is the same
    if (a.type === 'lesson' && b.type === 'quiz') return -1
    if (a.type === 'quiz' && b.type === 'lesson') return 1
    return 0
  })

  if (loading) {
    return (
      <Card className="w-80 h-fit sticky top-4">
        <CardHeader>
          <CardTitle className="text-lg">Loading...</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="w-80 h-fit sticky top-4">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-lg">{module?.title || "Module Content"}</CardTitle>
        </div>
        {totalItems > 0 && (
          <div className="flex items-center gap-2">
            <Progress value={moduleProgress} className="flex-1 h-2" />
            <span className="text-xs text-muted-foreground min-w-[35px]">
              {moduleProgress}%
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1 max-h-[calc(100vh-250px)] overflow-y-auto">
          {allItems.map((item) => {
            if (item.type === 'lesson') {
              const lesson = item as Lesson & { type: 'lesson' }
              const progress = lessonProgress[lesson.id]
              const isCompleted = progress?.completed || false
              const isActive = currentLessonId === lesson.id

              return (
                <Link
                  key={lesson.id}
                  href={`${localePrefix}/student/lessons/${lesson.id}`}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg transition-colors",
                    isActive 
                      ? "bg-primary/10 border border-primary/20" 
                      : "hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <Circle className={cn(
                        "h-4 w-4 flex-shrink-0",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )} />
                    )}
                    <PlayCircle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className={cn(
                      "text-sm truncate",
                      isActive ? "font-medium text-primary" : isCompleted ? "text-muted-foreground" : ""
                    )}>
                      {lesson.title}
                    </span>
                  </div>
                  {lesson.duration && (
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {lesson.duration}m
                    </span>
                  )}
                </Link>
              )
            } else {
              const quiz = item as Quiz & { type: 'quiz' }
              const progress = quizProgress[quiz.id]
              const isCompleted = progress?.completed || false
              const hasAttempts = progress?.attempts && progress.attempts > 0
              const isActive = currentQuizId === quiz.id

              return (
                <Link
                  key={quiz.id}
                  href={`${localePrefix}/student/quizzes`}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg transition-colors",
                    isActive 
                      ? "bg-primary/10 border border-primary/20" 
                      : "hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {isCompleted ? (
                      <Award className="h-4 w-4 text-green-600 flex-shrink-0" />
                    ) : hasAttempts ? (
                      <HelpCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                    ) : (
                      <Circle className={cn(
                        "h-4 w-4 flex-shrink-0",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )} />
                    )}
                    <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className={cn(
                      "text-sm truncate",
                      isActive ? "font-medium text-primary" : isCompleted ? "text-muted-foreground" : ""
                    )}>
                      {quiz.title}
                    </span>
                  </div>
                  {progress?.score !== undefined && (
                    <span className={cn(
                      "text-xs font-medium flex-shrink-0",
                      progress.passed ? "text-green-600" : "text-red-600"
                    )}>
                      {progress.score}%
                    </span>
                  )}
                </Link>
              )
            }
          })}

          {allItems.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No content in this module yet
            </p>
          )}
        </div>

        {courseId && (
          <div className="mt-4 pt-4 border-t">
            <Link href={`${localePrefix}/student/courses/${courseId}`}>
              <Button variant="outline" size="sm" className="w-full">
                Back to Course
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

