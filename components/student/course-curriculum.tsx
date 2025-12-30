"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useEffect, useState } from "react"
import { 
  ChevronDown, 
  ChevronRight, 
  PlayCircle, 
  CheckCircle2, 
  Circle,
  FileText,
  HelpCircle,
  Clock,
  Award
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Module {
  id: string
  title: string
  description: string
  order_index: number
}

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

interface CourseCurriculumProps {
  courseId: string
  modules: Module[]
  courseDescription?: string
  courseTitle?: string
}

export default function CourseCurriculum({ 
  courseId, 
  modules, 
  courseDescription,
  courseTitle 
}: CourseCurriculumProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({})
  const [quizzes, setQuizzes] = useState<Record<string, Quiz[]>>({})
  const [lessonProgress, setLessonProgress] = useState<Record<string, LessonProgress>>({})
  const [quizProgress, setQuizProgress] = useState<Record<string, QuizProgress>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [showAbout, setShowAbout] = useState(false)

  const toggleModule = async (moduleId: string) => {
    const newExpanded = new Set(expandedModules)
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId)
    } else {
      newExpanded.add(moduleId)
      // Fetch lessons and quizzes when expanding
      if (!lessons[moduleId] && !loading[moduleId]) {
        await fetchModuleContent(moduleId)
      }
    }
    setExpandedModules(newExpanded)
  }

  const fetchModuleContent = async (moduleId: string) => {
    setLoading(prev => ({ ...prev, [moduleId]: true }))
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Fetch lessons
    const { data: lessonsData } = await supabase
      .from("lessons")
      .select("*")
      .eq("module_id", moduleId)
      .order("order_index", { ascending: true })

    // Fetch quizzes - try both schema versions
    // First try: quizzes linked directly to module_id (newer schema)
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

    if (lessonsData) {
      setLessons(prev => ({ ...prev, [moduleId]: lessonsData }))
      
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
      setLessonProgress(prev => ({ ...prev, ...progressMap }))
    }

    if (quizzesData) {
      setQuizzes(prev => ({ ...prev, [moduleId]: quizzesData }))
      
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
      setQuizProgress(prev => ({ ...prev, ...quizProgressMap }))
    }

    setLoading(prev => ({ ...prev, [moduleId]: false }))
  }

  // Calculate module progress
  const getModuleProgress = (moduleId: string) => {
    const moduleLessons = lessons[moduleId] || []
    const moduleQuizzes = quizzes[moduleId] || []
    const totalItems = moduleLessons.length + moduleQuizzes.length
    if (totalItems === 0) return 0

    const completedLessons = moduleLessons.filter(l => lessonProgress[l.id]?.completed).length
    const completedQuizzes = moduleQuizzes.filter(q => quizProgress[q.id]?.completed).length
    const completedItems = completedLessons + completedQuizzes

    return Math.round((completedItems / totalItems) * 100)
  }

  // Expand first module by default
  useEffect(() => {
    if (modules.length > 0 && expandedModules.size === 0) {
      const firstModuleId = modules[0].id
      setExpandedModules(new Set([firstModuleId]))
      fetchModuleContent(firstModuleId)
    }
  }, [modules])

  return (
    <div className="space-y-6">
      {/* Curriculum Header */}
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold mb-2">Course Curriculum</h2>
        <p className="text-muted-foreground">Expand modules to view lessons and quizzes</p>
      </div>

      {/* Modules List */}
      <div className="space-y-3">
        {modules.map((module) => {
          const isExpanded = expandedModules.has(module.id)
          const moduleLessons = lessons[module.id] || []
          const moduleQuizzes = quizzes[module.id] || []
          const moduleProgress = getModuleProgress(module.id)
          const isLoading = loading[module.id]

          return (
            <Card key={module.id} className="overflow-hidden">
              <CardHeader 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleModule(module.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleModule(module.id)
                      }}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">
                          {module.order_index}. {module.title}
                        </CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {moduleLessons.length + moduleQuizzes.length} items
                        </Badge>
                      </div>
                      {module.description && (
                        <CardDescription className="mt-1">
                          {module.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {moduleLessons.length > 0 || moduleQuizzes.length > 0 ? (
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <Progress value={moduleProgress} className="w-20 h-2" />
                        <span className="text-sm text-muted-foreground min-w-[35px]">
                          {moduleProgress}%
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0">
                  {isLoading ? (
                    <div className="py-8 text-center text-muted-foreground">
                      Loading content...
                    </div>
                  ) : (
                    <div className="space-y-2 pl-11">
                      {/* Lessons */}
                      {moduleLessons.map((lesson) => {
                        const progress = lessonProgress[lesson.id]
                        const isCompleted = progress?.completed || false

                        return (
                          <Link
                            key={lesson.id}
                            href={`/student/lessons/${lesson.id}`}
                            className="block"
                          >
                            <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors group">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {isCompleted ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                                ) : (
                                  <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                )}
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <PlayCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <span className={cn(
                                    "font-medium truncate",
                                    isCompleted && "text-muted-foreground"
                                  )}>
                                    {lesson.title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
                                  {lesson.duration && (
                                    <>
                                      <Clock className="h-3 w-3" />
                                      <span>{lesson.duration} min</span>
                                    </>
                                  )}
                                  <Badge variant="outline" className="text-xs">
                                    {lesson.content_type}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </Link>
                        )
                      })}

                      {/* Quizzes */}
                      {moduleQuizzes.map((quiz) => {
                        const progress = quizProgress[quiz.id]
                        const isCompleted = progress?.completed || false
                        const hasAttempts = progress?.attempts && progress.attempts > 0

                        return (
                          <div
                            key={quiz.id}
                            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {isCompleted ? (
                                <Award className="h-5 w-5 text-green-600 flex-shrink-0" />
                              ) : hasAttempts ? (
                                <HelpCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                              ) : (
                                <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                              )}
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className={cn(
                                  "font-medium truncate",
                                  isCompleted && "text-muted-foreground"
                                )}>
                                  {quiz.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
                                {progress?.score !== undefined && (
                                  <span className={cn(
                                    "font-medium",
                                    progress.passed ? "text-green-600" : "text-red-600"
                                  )}>
                                    {progress.score}%
                                  </span>
                                )}
                                {progress?.attempts && progress.attempts > 1 && (
                                  <span className="text-muted-foreground">
                                    ({progress.attempts} attempts)
                                  </span>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  Quiz
                                </Badge>
                              </div>
                            </div>
                            <Link
                              href="/student/quizzes"
                              className="ml-auto"
                            >
                              <Button variant="outline" size="sm">
                                Take Quiz
                              </Button>
                            </Link>
                          </div>
                        )
                      })}

                      {moduleLessons.length === 0 && moduleQuizzes.length === 0 && (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          No content in this module yet
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* About Section */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setShowAbout(!showAbout)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowAbout(!showAbout)
                }}
              >
                {showAbout ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
              <CardTitle className="text-lg">About This Course</CardTitle>
            </div>
          </div>
        </CardHeader>
        {showAbout && (
          <CardContent className="pt-0 pl-11">
            <div className="prose prose-sm max-w-none">
              <p className="text-muted-foreground whitespace-pre-line">
                {courseDescription || "No description available."}
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}

