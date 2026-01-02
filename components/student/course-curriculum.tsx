"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { 
  ChevronDown, 
  ChevronRight, 
  PlayCircle, 
  CheckCircle2, 
  Circle,
  FileText,
  HelpCircle,
  Clock,
  Award,
  Lock,
  Dumbbell,
  Video,
  BookMarked
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
  lesson_id?: string
  module_id?: string
}

interface Assignment {
  id: string
  title: string
  description: string
  due_date?: string
  max_points: number
  module_id?: string
  order_index?: number
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

interface AssignmentProgress {
  submitted: boolean
  graded: boolean
  score?: number
}

interface CourseCurriculumProps {
  courseId: string
  modules: Module[]
  courseDescription?: string
  courseTitle?: string
}

type TabType = 'course' | 'exercise' | 'record'

export default function CourseCurriculum({ 
  courseId, 
  modules, 
  courseDescription,
  courseTitle 
}: CourseCurriculumProps) {
  const params = useParams()
  const locale = params?.locale as string | undefined
  const localePrefix = locale ? `/${locale}` : ''
  
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<Record<string, TabType>>({})
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({})
  const [quizzes, setQuizzes] = useState<Record<string, Quiz[]>>({})
  const [assignments, setAssignments] = useState<Record<string, Assignment[]>>({})
  const [lessonProgress, setLessonProgress] = useState<Record<string, LessonProgress>>({})
  const [quizProgress, setQuizProgress] = useState<Record<string, QuizProgress>>({})
  const [assignmentProgress, setAssignmentProgress] = useState<Record<string, AssignmentProgress>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [showAbout, setShowAbout] = useState(false)

  const toggleModule = async (moduleId: string) => {
    const newExpanded = new Set(expandedModules)
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId)
    } else {
      newExpanded.add(moduleId)
      // Set default tab to 'course' for new modules
      if (!activeTab[moduleId]) {
        setActiveTab(prev => ({ ...prev, [moduleId]: 'course' }))
      }
      // Fetch content when expanding
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

    // Fetch quizzes - module level quizzes
    let { data: moduleQuizzes } = await supabase
      .from("quizzes")
      .select("*")
      .eq("module_id", moduleId)
      .order("order_index", { ascending: true })

    // Fetch quizzes linked to lessons
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

    // Combine all quizzes
    const allQuizzes = [...(moduleQuizzes || []), ...lessonQuizzes]

    // Fetch assignments
    const { data: assignmentsData } = await supabase
      .from("assignments")
      .select("*")
      .eq("course_id", courseId)
      .eq("is_published", true)
      .or(`module_id.eq.${moduleId},module_id.is.null`)
      .order("created_at", { ascending: true })

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

    if (allQuizzes.length > 0) {
      setQuizzes(prev => ({ ...prev, [moduleId]: allQuizzes }))
      
      // Fetch quiz progress
      const { data: attemptsData } = await supabase
        .from("quiz_attempts")
        .select("quiz_id, score, passed, created_at")
        .eq("student_id", user.id)
        .in("quiz_id", allQuizzes.map(q => q.id))
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
          if (attempt.score && (!quizProgressMap[attempt.quiz_id].score || attempt.score > quizProgressMap[attempt.quiz_id].score!)) {
            quizProgressMap[attempt.quiz_id].score = attempt.score
            quizProgressMap[attempt.quiz_id].passed = attempt.passed
            quizProgressMap[attempt.quiz_id].completed = attempt.passed || false
          }
        }
      })
      setQuizProgress(prev => ({ ...prev, ...quizProgressMap }))
    }

    if (assignmentsData) {
      setAssignments(prev => ({ ...prev, [moduleId]: assignmentsData }))

      // Fetch assignment submissions
      const { data: submissionsData } = await supabase
        .from("assignment_submissions")
        .select("assignment_id, status, score")
        .eq("student_id", user.id)
        .in("assignment_id", assignmentsData.map(a => a.id))

      const assignmentProgressMap: Record<string, AssignmentProgress> = {}
      submissionsData?.forEach((submission) => {
        assignmentProgressMap[submission.assignment_id] = {
          submitted: true,
          graded: submission.status === 'graded',
          score: submission.score || undefined
        }
      })
      setAssignmentProgress(prev => ({ ...prev, ...assignmentProgressMap }))
    }

    setLoading(prev => ({ ...prev, [moduleId]: false }))
  }

  // Check if an item is locked
  const isItemLocked = (
    moduleId: string,
    item: { type: 'lesson' | 'quiz' | 'assignment', id: string, order_index: number, parentLessonId?: string }
  ): boolean => {
    const moduleLessons = lessons[moduleId] || []
    const moduleQuizzes = quizzes[moduleId]?.filter(q => q.module_id === moduleId && !q.lesson_id) || []
    
    if (item.type === 'lesson') {
      const lessonIndex = moduleLessons.findIndex(l => l.id === item.id)
      if (lessonIndex === 0) return false
      if (lessonIndex > 0) {
        const previousLesson = moduleLessons[lessonIndex - 1]
        return !lessonProgress[previousLesson.id]?.completed
      }
    }
    
    if (item.type === 'quiz' && item.parentLessonId) {
      return !lessonProgress[item.parentLessonId]?.completed
    }
    
    if (item.type === 'quiz' && !item.parentLessonId) {
      const allItems: Array<{ type: 'lesson' | 'quiz', id: string, order_index: number }> = []
      moduleLessons.forEach(l => allItems.push({ type: 'lesson', id: l.id, order_index: l.order_index }))
      moduleQuizzes.forEach(q => allItems.push({ type: 'quiz', id: q.id, order_index: q.order_index }))
      allItems.sort((a, b) => a.order_index - b.order_index)
      
      const itemIndex = allItems.findIndex(i => i.id === item.id)
      if (itemIndex === 0) return false
      const previousItem = allItems[itemIndex - 1]
      if (previousItem.type === 'lesson') {
        return !lessonProgress[previousItem.id]?.completed
      } else if (previousItem.type === 'quiz') {
        return !quizProgress[previousItem.id]?.completed
      }
    }
    
    if (item.type === 'assignment') {
      const allLessonsCompleted = moduleLessons.every(l => lessonProgress[l.id]?.completed)
      const allModuleQuizzesCompleted = moduleQuizzes.every(q => quizProgress[q.id]?.completed)
      return !(allLessonsCompleted && allModuleQuizzesCompleted)
    }
    
    return false
  }

  // Calculate module progress
  const getModuleProgress = (moduleId: string) => {
    const moduleLessons = lessons[moduleId] || []
    const moduleQuizzes = quizzes[moduleId]?.filter(q => q.module_id === moduleId && !q.lesson_id) || []
    const moduleAssignments = assignments[moduleId] || []
    const totalItems = moduleLessons.length + moduleQuizzes.length + moduleAssignments.length
    if (totalItems === 0) return 0

    const completedLessons = moduleLessons.filter(l => lessonProgress[l.id]?.completed).length
    const completedQuizzes = moduleQuizzes.filter(q => quizProgress[q.id]?.completed).length
    const completedAssignments = moduleAssignments.filter(a => assignmentProgress[a.id]?.submitted).length
    const completedItems = completedLessons + completedQuizzes + completedAssignments

    return Math.round((completedItems / totalItems) * 100)
  }

  // Get tab content for a module
  const getTabContent = (moduleId: string) => {
    const moduleLessons = lessons[moduleId] || []
    const moduleQuizzes = quizzes[moduleId] || []
    const moduleAssignments = assignments[moduleId] || []
    const tab = activeTab[moduleId] || 'course'

    if (tab === 'course') {
      const items: Array<{ type: 'lesson' | 'quiz', data: any, parentLessonId?: string, order_index: number }> = []
      
      moduleLessons.forEach(lesson => {
        items.push({ type: 'lesson', data: lesson, order_index: lesson.order_index })
        // Add quizzes for this lesson
        moduleQuizzes.filter(q => q.lesson_id === lesson.id).forEach(quiz => {
          items.push({ type: 'quiz', data: quiz, parentLessonId: lesson.id, order_index: quiz.order_index })
        })
      })
      
      // Add module-level quizzes
      moduleQuizzes.filter(q => q.module_id === moduleId && !q.lesson_id).forEach(quiz => {
        items.push({ type: 'quiz', data: quiz, order_index: quiz.order_index })
      })
      
      return items.sort((a, b) => a.order_index - b.order_index)
    } else if (tab === 'exercise') {
      return moduleAssignments.map(a => ({ type: 'assignment' as const, data: a, order_index: a.order_index || 0 }))
    } else {
      return []
    }
  }

  // Expand first module by default
  useEffect(() => {
    if (modules.length > 0 && expandedModules.size === 0) {
      const firstModuleId = modules[0].id
      setExpandedModules(new Set([firstModuleId]))
      setActiveTab(prev => ({ ...prev, [firstModuleId]: 'course' }))
      fetchModuleContent(firstModuleId)
    }
  }, [modules])

  return (
    <div className="space-y-6">
      {/* Curriculum Header */}
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold mb-2">Course Curriculum</h2>
        <p className="text-muted-foreground">Expand modules to view lessons, quizzes, and assignments</p>
      </div>

      {/* Modules List */}
      <div className="space-y-3">
        {modules.map((module) => {
          const isExpanded = expandedModules.has(module.id)
          const moduleLessons = lessons[module.id] || []
          const moduleQuizzes = quizzes[module.id]?.filter(q => q.module_id === module.id && !q.lesson_id) || []
          const moduleAssignments = assignments[module.id] || []
          const moduleProgress = getModuleProgress(module.id)
          const isLoading = loading[module.id]
          const tab = activeTab[module.id] || 'course'
          const tabContent = getTabContent(module.id)

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
                          {moduleLessons.length + moduleQuizzes.length + moduleAssignments.length} items
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
                    {(moduleLessons.length > 0 || moduleQuizzes.length > 0 || moduleAssignments.length > 0) && (
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <Progress value={moduleProgress} className="w-20 h-2" />
                        <span className="text-sm text-muted-foreground min-w-[35px]">
                          {moduleProgress}%
                        </span>
                      </div>
                    )}
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
                    <div className="space-y-4 pl-11">
                      {/* Tabs */}
                      <div className="flex gap-1 bg-muted p-1 rounded-md">
                        <button
                          onClick={() => setActiveTab(prev => ({ ...prev, [module.id]: 'course' }))}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors",
                            tab === 'course' 
                              ? "bg-background text-foreground shadow-sm" 
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <BookMarked className="h-4 w-4" />
                          Course
                        </button>
                        <button
                          onClick={() => setActiveTab(prev => ({ ...prev, [module.id]: 'exercise' }))}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors",
                            tab === 'exercise' 
                              ? "bg-background text-foreground shadow-sm" 
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Dumbbell className="h-4 w-4" />
                          Exercise
                        </button>
                        <button
                          onClick={() => setActiveTab(prev => ({ ...prev, [module.id]: 'record' }))}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors",
                            tab === 'record' 
                              ? "bg-background text-foreground shadow-sm" 
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Video className="h-4 w-4" />
                          Record
                        </button>
                      </div>

                      {/* Tab Content */}
                      <div className="space-y-2">
                        {tab === 'course' && (
                          <>
                            {tabContent.map((item) => {
                              if (item.type === 'lesson') {
                                const lesson = item.data as Lesson
                                const progress = lessonProgress[lesson.id]
                                const isCompleted = progress?.completed || false
                                const isLocked = isItemLocked(module.id, { type: 'lesson', id: lesson.id, order_index: lesson.order_index })

                                return (
                                  <div key={lesson.id}>
                                    <Link
                                      href={isLocked ? '#' : `${localePrefix}/student/lessons/${lesson.id}`}
                                      className={cn(
                                        "block",
                                        isLocked && "pointer-events-none"
                                      )}
                                      onClick={(e) => isLocked && e.preventDefault()}
                                    >
                                      <div className={cn(
                                        "flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors",
                                        isLocked && "opacity-50"
                                      )}>
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                          {isLocked ? (
                                            <Lock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                          ) : isCompleted ? (
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
                                    {/* Show quizzes under this lesson */}
                                    {moduleQuizzes.filter(q => q.lesson_id === lesson.id).map(quiz => {
                                      const quizProgressData = quizProgress[quiz.id]
                                      const isQuizCompleted = quizProgressData?.completed || false
                                      const isQuizLocked = isItemLocked(module.id, { type: 'quiz', id: quiz.id, order_index: quiz.order_index, parentLessonId: lesson.id })

                                      return (
                                        <Link
                                          key={quiz.id}
                                          href={isQuizLocked ? '#' : `${localePrefix}/student/quizzes/${quiz.id}`}
                                          className={cn(
                                            "block pl-8",
                                            isQuizLocked && "pointer-events-none"
                                          )}
                                          onClick={(e) => isQuizLocked && e.preventDefault()}
                                        >
                                          <div className={cn(
                                            "flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors",
                                            isQuizLocked && "opacity-50"
                                          )}>
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                              {isQuizLocked ? (
                                                <Lock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                              ) : isQuizCompleted ? (
                                                <Award className="h-5 w-5 text-green-600 flex-shrink-0" />
                                              ) : (
                                                <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                              )}
                                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                <span className={cn(
                                                  "font-medium truncate",
                                                  isQuizCompleted && "text-muted-foreground"
                                                )}>
                                                  {quiz.title}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
                                                {quizProgressData?.score !== undefined && (
                                                  <span className={cn(
                                                    "font-medium",
                                                    quizProgressData.passed ? "text-green-600" : "text-red-600"
                                                  )}>
                                                    {quizProgressData.score}%
                                                  </span>
                                                )}
                                                <Badge variant="outline" className="text-xs">
                                                  Quiz
                                                </Badge>
                                              </div>
                                            </div>
                                          </div>
                                        </Link>
                                      )
                                    })}
                                  </div>
                                )
                              } else if (item.type === 'quiz' && !item.parentLessonId) {
                                // Module-level quiz
                                const quiz = item.data as Quiz
                                const progress = quizProgress[quiz.id]
                                const isCompleted = progress?.completed || false
                                const isLocked = isItemLocked(module.id, { type: 'quiz', id: quiz.id, order_index: quiz.order_index })

                                return (
                                  <Link
                                    key={quiz.id}
                                    href={isLocked ? '#' : `${localePrefix}/student/quizzes/${quiz.id}`}
                                    className={cn(
                                      "block",
                                      isLocked && "pointer-events-none"
                                    )}
                                    onClick={(e) => isLocked && e.preventDefault()}
                                  >
                                    <div className={cn(
                                      "flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors",
                                      isLocked && "opacity-50"
                                    )}>
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        {isLocked ? (
                                          <Lock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                        ) : isCompleted ? (
                                          <Award className="h-5 w-5 text-green-600 flex-shrink-0" />
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
                                          <Badge variant="outline" className="text-xs">
                                            Quiz
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                  </Link>
                                )
                              }
                              return null
                            })}

                            {tabContent.length === 0 && (
                              <p className="text-sm text-muted-foreground py-4 text-center">
                                No course content yet
                              </p>
                            )}
                          </>
                        )}

                        {tab === 'exercise' && (
                          <>
                            {tabContent.map((item) => {
                              if (item.type === 'assignment') {
                                const assignment = item.data as Assignment
                                const progress = assignmentProgress[assignment.id]
                                const isSubmitted = progress?.submitted || false
                                const isGraded = progress?.graded || false
                                const isLocked = isItemLocked(module.id, { type: 'assignment', id: assignment.id, order_index: assignment.order_index || 0 })

                                return (
                                  <Link
                                    key={assignment.id}
                                    href={isLocked ? '#' : `${localePrefix}/student/assignments`}
                                    className={cn(
                                      "block",
                                      isLocked && "pointer-events-none"
                                    )}
                                    onClick={(e) => isLocked && e.preventDefault()}
                                  >
                                    <div className={cn(
                                      "flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors",
                                      isLocked && "opacity-50"
                                    )}>
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        {isLocked ? (
                                          <Lock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                        ) : isGraded ? (
                                          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                                        ) : isSubmitted ? (
                                          <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                                        ) : (
                                          <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                        )}
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                          <span className="font-medium truncate">
                                            {assignment.title}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
                                          {progress?.score !== undefined && (
                                            <span className="font-medium text-green-600">
                                              {progress.score}/{assignment.max_points}
                                            </span>
                                          )}
                                          <Badge variant="outline" className="text-xs">
                                            Assignment
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                  </Link>
                                )
                              }
                              return null
                            })}

                            {tabContent.length === 0 && (
                              <p className="text-sm text-muted-foreground py-4 text-center">
                                No assignments yet
                              </p>
                            )}
                          </>
                        )}

                        {tab === 'record' && (
                          <p className="text-sm text-muted-foreground py-4 text-center">
                            No recorded sessions available
                          </p>
                        )}
                      </div>
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
