"use client"

import { createClient } from "@/lib/supabase/client"
import { Link } from '@/i18n/routing'
import { useEffect, useState } from "react"
import { 
  PlayCircle, 
  CheckCircle2, 
  Circle,
  FileText,
  Award,
  Lock,
  ChevronDown,
  ChevronRight,
  Clock,
  GraduationCap,
  ArrowLeft
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useLocale } from 'next-intl'

interface CourseNavigationSidebarProps {
  courseId: string
  currentLessonId?: string
  currentQuizId?: string
}

export default function CourseNavigationSidebar({ 
  courseId,
  currentLessonId,
  currentQuizId
}: CourseNavigationSidebarProps) {
  const [modules, setModules] = useState<any[]>([])
  const [moduleContent, setModuleContent] = useState<Record<string, {
    lessons: any[]
    quizzes: any[]
    lessonQuizzes: any[]
    lessonProgress: Record<string, any>
    quizProgress: Record<string, any>
  }>>({})
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set())
  const [course, setCourse] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const locale = useLocale()
  const isRTL = locale === 'ar'

  useEffect(() => {
    const fetchCourseContent = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setLoading(true)

      // Fetch course info
      const { data: courseData } = await supabase
        .from("courses")
        .select("id, title")
        .eq("id", courseId)
        .single()

      if (courseData) {
        setCourse(courseData)
      }

      // Fetch modules
      const { data: modulesData } = await supabase
        .from("modules")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true })

      if (!modulesData) {
        setLoading(false)
        return
      }

      setModules(modulesData)

      // Fetch content for all modules
      const contentMap: Record<string, any> = {}
      
      for (const module of modulesData) {
        // Fetch lessons
        const { data: lessonsData } = await supabase
          .from("lessons")
          .select("*")
          .eq("module_id", module.id)
          .order("order_index", { ascending: true })

        // Fetch module-level quizzes
        const { data: moduleQuizzes } = await supabase
          .from("quizzes")
          .select("*")
          .eq("module_id", module.id)
          .is("lesson_id", null)
          .order("order_index", { ascending: true })

        // Fetch lesson-level quizzes
        const lessonIds = lessonsData?.map(l => l.id) || []
        let lessonQuizzes: any[] = []
        if (lessonIds.length > 0) {
          const { data: quizzesByLesson } = await supabase
            .from("quizzes")
            .select("*")
            .in("lesson_id", lessonIds)
            .order("order_index", { ascending: true })
          lessonQuizzes = quizzesByLesson || []
        }

        // Fetch lesson progress
        const lessonProgressMap: Record<string, any> = {}
        if (lessonsData && lessonsData.length > 0) {
          const { data: progressData } = await supabase
            .from("lesson_progress")
            .select("lesson_id, completed, completed_at")
            .eq("student_id", user.id)
            .in("lesson_id", lessonsData.map(l => l.id))

          progressData?.forEach((p) => {
            lessonProgressMap[p.lesson_id] = {
              completed: p.completed,
              completed_at: p.completed_at
            }
          })
        }

        // Fetch quiz progress
        const allQuizzes = [...(moduleQuizzes || []), ...lessonQuizzes]
        const quizProgressMap: Record<string, any> = {}
        if (allQuizzes.length > 0) {
          const { data: attemptsData } = await supabase
            .from("quiz_attempts")
            .select("quiz_id, score, passed, created_at")
            .eq("student_id", user.id)
            .in("quiz_id", allQuizzes.map(q => q.id))
            .order("created_at", { ascending: false })

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
              if (attempt.score && (!quizProgressMap[attempt.quiz_id].score || attempt.score > quizProgressMap[attempt.quiz_id].score)) {
                quizProgressMap[attempt.quiz_id].score = attempt.score
                quizProgressMap[attempt.quiz_id].passed = attempt.passed
                quizProgressMap[attempt.quiz_id].completed = attempt.passed || false
              }
            }
          })
        }

        contentMap[module.id] = {
          lessons: lessonsData || [],
          quizzes: moduleQuizzes || [],
          lessonQuizzes: lessonQuizzes,
          lessonProgress: lessonProgressMap,
          quizProgress: quizProgressMap
        }

        // Expand module if it contains current lesson or quiz
        if (currentLessonId || currentQuizId) {
          const hasCurrentLesson = lessonsData?.some(l => l.id === currentLessonId)
          const hasCurrentQuiz = moduleQuizzes?.some(q => q.id === currentQuizId) || 
                                 lessonQuizzes.some(q => q.id === currentQuizId)
          if (hasCurrentLesson || hasCurrentQuiz) {
            setExpandedModules(prev => new Set(prev).add(module.id))
            if (hasCurrentLesson && currentLessonId) {
              setExpandedLessons(prev => new Set(prev).add(currentLessonId))
            }
          }
        }
      }

      setModuleContent(contentMap)
      setLoading(false)
    }

    if (courseId) {
      fetchCourseContent()
    }
  }, [courseId, currentLessonId, currentQuizId])

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev)
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId)
      } else {
        newSet.add(moduleId)
      }
      return newSet
    })
  }

  const toggleLesson = (lessonId: string) => {
    setExpandedLessons(prev => {
      const newSet = new Set(prev)
      if (newSet.has(lessonId)) {
        newSet.delete(lessonId)
      } else {
        newSet.add(lessonId)
      }
      return newSet
    })
  }

  if (loading) {
    return (
      <div className="w-80 bg-background border-l border-border h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className={cn(
      "w-80 bg-background border-l border-border h-full overflow-y-auto flex flex-col",
      isRTL && "border-r border-l-0"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <Link
          href={`/student/courses/${courseId}`}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Course</span>
        </Link>
        {course && (
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground line-clamp-2">
              {course.title}
            </h3>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Course Content
        </h4>
        
        <div className="space-y-1">
          {modules.map((module) => {
            const content = moduleContent[module.id]
            const isExpanded = expandedModules.has(module.id)
            const moduleLessons = content?.lessons || []
            const moduleQuizzes = content?.quizzes || []
            const lessonProgress = content?.lessonProgress || {}
            const quizProgress = content?.quizProgress || {}

            return (
              <div key={module.id} className="border-b border-border last:border-b-0">
                <button
                  onClick={() => toggleModule(module.id)}
                  className="w-full flex items-center gap-2 p-3 hover:bg-muted/50 transition-colors text-left"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="text-sm font-semibold text-foreground flex-1">
                    {module.order_index}. {module.title}
                  </span>
                </button>

                {isExpanded && content && (
                  <div className="pl-6 pb-2 space-y-0.5">
                    {/* Module-level Quizzes */}
                    {moduleQuizzes.map((quiz: any) => {
                      const progress = quizProgress[quiz.id]
                      const isCompleted = progress?.completed || false
                      const isActive = currentQuizId === quiz.id
                      
                      return (
                        <Link
                          key={quiz.id}
                          href={`/student/quizzes/${quiz.id}`}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                            isActive 
                              ? "bg-primary text-primary-foreground" 
                              : "hover:bg-muted text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                            isCompleted ? "bg-green-500/20" : "bg-muted"
                          )}>
                            {isCompleted ? (
                              <Award className="w-3 h-3 text-green-600 dark:text-green-400" />
                            ) : (
                              <FileText className="w-3 h-3" />
                            )}
                          </div>
                          <span className="flex-1 truncate">{quiz.title}</span>
                          {progress?.score !== undefined && (
                            <span className={cn(
                              "text-xs font-medium",
                              isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                            )}>
                              {progress.score}%
                            </span>
                          )}
                        </Link>
                      )
                    })}

                    {/* Lessons */}
                    {moduleLessons.map((lesson: any) => {
                      const progress = lessonProgress[lesson.id]
                      const isCompleted = progress?.completed || false
                      const isActive = currentLessonId === lesson.id
                      const lessonQuizzes = content.lessonQuizzes?.filter((q: any) => q.lesson_id === lesson.id) || []
                      const isLessonExpanded = expandedLessons.has(lesson.id)

                      return (
                        <div key={lesson.id}>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/student/lessons/${lesson.id}`}
                              className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors flex-1",
                                isActive 
                                  ? "bg-primary text-primary-foreground" 
                                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
                              )}
                            >
                              <div className={cn(
                                "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                                isCompleted ? "bg-green-500/20" : "bg-muted"
                              )}>
                                {isCompleted ? (
                                  <CheckCircle2 className="w-3 h-3 text-green-600 dark:text-green-400" />
                                ) : (
                                  <PlayCircle className="w-3 h-3" />
                                )}
                              </div>
                              <span className="flex-1 truncate">{lesson.title}</span>
                              {lesson.duration && (
                                <span className={cn(
                                  "text-xs",
                                  isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                                )}>
                                  {lesson.duration}m
                                </span>
                              )}
                            </Link>
                            {lessonQuizzes.length > 0 && (
                              <button
                                onClick={() => toggleLesson(lesson.id)}
                                className="p-1 hover:bg-muted rounded"
                              >
                                {isLessonExpanded ? (
                                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                                )}
                              </button>
                            )}
                          </div>

                          {/* Lesson Quizzes */}
                          {isLessonExpanded && lessonQuizzes.length > 0 && (
                            <div className="pl-8 space-y-0.5 mt-0.5">
                              {lessonQuizzes.map((quiz: any) => {
                                const progress = quizProgress[quiz.id]
                                const isCompleted = progress?.completed || false
                                const isActive = currentQuizId === quiz.id
                                
                                return (
                                  <Link
                                    key={quiz.id}
                                    href={`/student/quizzes/${quiz.id}`}
                                    className={cn(
                                      "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors",
                                      isActive 
                                        ? "bg-primary/80 text-primary-foreground" 
                                        : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                                    )}
                                  >
                                    <div className={cn(
                                      "w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0",
                                      isCompleted ? "bg-green-500/20" : "bg-muted"
                                    )}>
                                      {isCompleted ? (
                                        <Award className="w-2.5 h-2.5 text-green-600 dark:text-green-400" />
                                      ) : (
                                        <FileText className="w-2.5 h-2.5" />
                                      )}
                                    </div>
                                    <span className="flex-1 truncate">{quiz.title}</span>
                                    {progress?.score !== undefined && (
                                      <span className={cn(
                                        "text-xs font-medium",
                                        isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                                      )}>
                                        {progress.score}%
                                      </span>
                                    )}
                                  </Link>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
