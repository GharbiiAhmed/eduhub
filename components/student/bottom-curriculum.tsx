"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams, usePathname } from "next/navigation"
import { 
  PlayCircle, 
  CheckCircle2, 
  Circle,
  FileText,
  Award,
  Lock,
  Dumbbell,
  Video,
  BookMarked,
  ChevronRight
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
  order_index: number
  passing_score: number
  lesson_id?: string
  module_id?: string
}

interface LessonProgress {
  completed: boolean
}

interface QuizProgress {
  completed: boolean
  score?: number
  passed?: boolean
}

interface BottomCurriculumProps {
  moduleId: string
  currentLessonId?: string
  currentQuizId?: string
  courseId?: string
}

type TabType = 'course' | 'exercise' | 'record'

export default function BottomCurriculum({ 
  moduleId, 
  currentLessonId,
  currentQuizId,
  courseId 
}: BottomCurriculumProps) {
  const pathname = usePathname()
  const params = useParams()
  const locale = params?.locale as string | undefined
  const localePrefix = locale ? `/${locale}` : ''
  
  const [activeTab, setActiveTab] = useState<TabType>('course')
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

      const { data: lessonsData } = await supabase
        .from("lessons")
        .select("*")
        .eq("module_id", moduleId)
        .order("order_index", { ascending: true })

      if (lessonsData) {
        setLessons(lessonsData)

        const { data: progressData } = await supabase
          .from("lesson_progress")
          .select("lesson_id, completed")
          .eq("student_id", user.id)
          .in("lesson_id", lessonsData.map(l => l.id))

        const progressMap: Record<string, LessonProgress> = {}
        progressData?.forEach((p) => {
          progressMap[p.lesson_id] = { completed: p.completed }
        })
        setLessonProgress(progressMap)
      }

      let { data: moduleQuizzes } = await supabase
        .from("quizzes")
        .select("*")
        .eq("module_id", moduleId)
        .order("order_index", { ascending: true })

      const lessonIds = lessonsData?.map(l => l.id) || []
      let lessonQuizzes: Quiz[] = []
      if (lessonIds.length > 0) {
        const { data: quizzesByLesson } = await supabase
          .from("quizzes")
          .select("*")
          .in("lesson_id", lessonIds)
          .order("order_index", { ascending: true })
        lessonQuizzes = quizzesByLesson || []
      }

      const allQuizzes = [...(moduleQuizzes || []), ...lessonQuizzes]
      setQuizzes(allQuizzes)

      if (allQuizzes.length > 0) {
        const { data: attemptsData } = await supabase
          .from("quiz_attempts")
          .select("quiz_id, score, passed")
          .eq("student_id", user.id)
          .in("quiz_id", allQuizzes.map(q => q.id))
          .order("created_at", { ascending: false })

        const quizProgressMap: Record<string, QuizProgress> = {}
        attemptsData?.forEach((attempt) => {
          if (!quizProgressMap[attempt.quiz_id]) {
            quizProgressMap[attempt.quiz_id] = {
              completed: attempt.passed || false,
              score: attempt.score,
              passed: attempt.passed
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

  const isItemLocked = (item: { type: 'lesson' | 'quiz', id: string, order_index: number, parentLessonId?: string }): boolean => {
    if (item.type === 'lesson') {
      const lessonIndex = lessons.findIndex(l => l.id === item.id)
      if (lessonIndex === 0) return false
      if (lessonIndex > 0) {
        const previousLesson = lessons[lessonIndex - 1]
        return !lessonProgress[previousLesson.id]?.completed
      }
    }
    
    if (item.type === 'quiz' && item.parentLessonId) {
      return !lessonProgress[item.parentLessonId]?.completed
    }
    
    return false
  }

  const totalItems = lessons.length + quizzes.filter(q => q.module_id === moduleId).length
  const completedLessons = lessons.filter(l => lessonProgress[l.id]?.completed).length
  const completedQuizzes = quizzes.filter(q => q.module_id === moduleId && quizProgress[q.id]?.completed).length
  const completedItems = completedLessons + completedQuizzes
  const moduleProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  const getTabContent = () => {
    if (activeTab === 'course') {
      const items: Array<{ type: 'lesson' | 'quiz', data: any, parentLessonId?: string, order_index: number }> = []
      
      lessons.forEach(lesson => {
        items.push({ type: 'lesson', data: lesson, order_index: lesson.order_index })
        quizzes.filter(q => q.lesson_id === lesson.id).forEach(quiz => {
          items.push({ type: 'quiz', data: quiz, parentLessonId: lesson.id, order_index: quiz.order_index })
        })
      })
      
      quizzes.filter(q => q.module_id === moduleId && !q.lesson_id).forEach(quiz => {
        items.push({ type: 'quiz', data: quiz, order_index: quiz.order_index })
      })
      
      return items.sort((a, b) => a.order_index - b.order_index)
    }
    return []
  }

  const tabContent = getTabContent()

  if (loading) {
    return (
      <Card className="mt-6">
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">Loading curriculum...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mt-6 border-2">
      <CardContent className="p-4">
        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b pb-3">
          <button
            onClick={() => setActiveTab('course')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
              activeTab === 'course' 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <BookMarked className="h-4 w-4" />
            Course
          </button>
          <button
            onClick={() => setActiveTab('exercise')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
              activeTab === 'exercise' 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Dumbbell className="h-4 w-4" />
            Exercise
          </button>
          <button
            onClick={() => setActiveTab('record')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
              activeTab === 'record' 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Video className="h-4 w-4" />
            Record
          </button>
        </div>

        {/* Progress */}
        {activeTab === 'course' && totalItems > 0 && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Module Progress</span>
              <span className="font-medium">{moduleProgress}%</span>
            </div>
            <Progress value={moduleProgress} className="h-2" />
          </div>
        )}

        {/* Content */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {activeTab === 'course' && (
            <>
              {tabContent.map((item) => {
                if (item.type === 'lesson') {
                  const lesson = item.data as Lesson
                  const progress = lessonProgress[lesson.id]
                  const isCompleted = progress?.completed || false
                  const isActive = currentLessonId === lesson.id
                  const isLocked = isItemLocked({ type: 'lesson', id: lesson.id, order_index: lesson.order_index })

                  return (
                    <div key={lesson.id}>
                      <Link
                        href={isLocked ? '#' : `${localePrefix}/student/lessons/${lesson.id}`}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg transition-colors",
                          isLocked 
                            ? "opacity-50 cursor-not-allowed" 
                            : isActive 
                              ? "bg-primary/10 border border-primary/20" 
                              : "hover:bg-muted/50 border border-transparent"
                        )}
                        onClick={(e) => isLocked && e.preventDefault()}
                      >
                        {isLocked ? (
                          <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        ) : isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <Circle className={cn(
                            "h-4 w-4 flex-shrink-0",
                            isActive ? "text-primary" : "text-muted-foreground"
                          )} />
                        )}
                        <PlayCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className={cn(
                          "text-sm flex-1 truncate",
                          isActive ? "font-medium text-primary" : ""
                        )}>
                          {lesson.title}
                        </span>
                        {lesson.duration && (
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {lesson.duration}m
                          </span>
                        )}
                        {isActive && <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />}
                      </Link>
                      {/* Quizzes under lesson */}
                      {quizzes.filter(q => q.lesson_id === lesson.id).map(quiz => {
                        const quizProgressData = quizProgress[quiz.id]
                        const isQuizCompleted = quizProgressData?.completed || false
                        const isQuizActive = currentQuizId === quiz.id
                        const isQuizLocked = isItemLocked({ type: 'quiz', id: quiz.id, order_index: quiz.order_index, parentLessonId: lesson.id })

                        return (
                          <Link
                            key={quiz.id}
                            href={isQuizLocked ? '#' : `${localePrefix}/student/quizzes/${quiz.id}`}
                            className={cn(
                              "flex items-center gap-3 p-3 pl-10 rounded-lg transition-colors",
                              isQuizLocked 
                                ? "opacity-50 cursor-not-allowed" 
                                : isQuizActive 
                                  ? "bg-primary/10 border border-primary/20" 
                                  : "hover:bg-muted/50 border border-transparent"
                            )}
                            onClick={(e) => isQuizLocked && e.preventDefault()}
                          >
                            {isQuizLocked ? (
                              <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            ) : isQuizCompleted ? (
                              <Award className="h-4 w-4 text-green-600 flex-shrink-0" />
                            ) : (
                              <Circle className={cn(
                                "h-4 w-4 flex-shrink-0",
                                isQuizActive ? "text-primary" : "text-muted-foreground"
                              )} />
                            )}
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className={cn(
                              "text-sm flex-1 truncate",
                              isQuizActive ? "font-medium text-primary" : ""
                            )}>
                              {quiz.title}
                            </span>
                            {quizProgressData?.score !== undefined && (
                              <Badge variant={quizProgressData.passed ? "default" : "destructive"} className="text-xs">
                                {quizProgressData.score}%
                              </Badge>
                            )}
                            {isQuizActive && <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />}
                          </Link>
                        )
                      })}
                    </div>
                  )
                } else if (item.type === 'quiz' && !item.parentLessonId) {
                  const quiz = item.data as Quiz
                  const progress = quizProgress[quiz.id]
                  const isCompleted = progress?.completed || false
                  const isActive = currentQuizId === quiz.id
                  const isLocked = isItemLocked({ type: 'quiz', id: quiz.id, order_index: quiz.order_index })

                  return (
                    <Link
                      key={quiz.id}
                      href={isLocked ? '#' : `${localePrefix}/student/quizzes/${quiz.id}`}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg transition-colors",
                        isLocked 
                          ? "opacity-50 cursor-not-allowed" 
                          : isActive 
                            ? "bg-primary/10 border border-primary/20" 
                            : "hover:bg-muted/50 border border-transparent"
                      )}
                      onClick={(e) => isLocked && e.preventDefault()}
                    >
                      {isLocked ? (
                        <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      ) : isCompleted ? (
                        <Award className="h-4 w-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <Circle className={cn(
                          "h-4 w-4 flex-shrink-0",
                          isActive ? "text-primary" : "text-muted-foreground"
                        )} />
                      )}
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className={cn(
                        "text-sm flex-1 truncate",
                        isActive ? "font-medium text-primary" : ""
                      )}>
                        {quiz.title}
                      </span>
                      {progress?.score !== undefined && (
                        <Badge variant={progress.passed ? "default" : "destructive"} className="text-xs">
                          {progress.score}%
                        </Badge>
                      )}
                      {isActive && <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />}
                    </Link>
                  )
                }
                return null
              })}

              {tabContent.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No course content yet
                </p>
              )}
            </>
          )}

          {activeTab === 'exercise' && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No assignments yet
            </p>
          )}

          {activeTab === 'record' && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recorded sessions available
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

