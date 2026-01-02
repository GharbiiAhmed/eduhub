"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Link } from '@/i18n/routing'
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { 
  PlayCircle, 
  CheckCircle2, 
  Circle,
  FileText,
  HelpCircle,
  Clock,
  Award,
  BookOpen,
  Lock,
  Dumbbell,
  Video,
  BookMarked,
  ClipboardCheck,
  Download,
  GraduationCap
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslations } from 'next-intl'

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

interface ModuleCurriculumSidebarProps {
  moduleId: string
  currentLessonId?: string
  currentQuizId?: string
  currentAssignmentId?: string
  courseId?: string
}

type TabType = 'course' | 'exercise' | 'record'

export default function ModuleCurriculumSidebar({ 
  moduleId, 
  currentLessonId,
  currentQuizId,
  currentAssignmentId,
  courseId 
}: ModuleCurriculumSidebarProps) {
  const t = useTranslations('courses')
  const tCommon = useTranslations('common')
  const params = useParams()
  const locale = params?.locale as string | undefined
  const localePrefix = locale ? `/${locale}` : ''
  
  const [activeTab, setActiveTab] = useState<TabType>('course')
  const [module, setModule] = useState<any>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [lessonProgress, setLessonProgress] = useState<Record<string, LessonProgress>>({})
  const [quizProgress, setQuizProgress] = useState<Record<string, QuizProgress>>({})
  const [assignmentProgress, setAssignmentProgress] = useState<Record<string, AssignmentProgress>>({})
  const [certificate, setCertificate] = useState<any>(null)
  const [course, setCourse] = useState<any>(null)
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

      // Fetch course info if courseId is provided
      if (courseId) {
        const { data: courseData } = await supabase
          .from("courses")
          .select("*")
          .eq("id", courseId)
          .single()
        
        if (courseData) {
          setCourse(courseData)
        }

        // Fetch certificate
        const { data: certificateData } = await supabase
          .from("certificates")
          .select("*")
          .eq("student_id", user.id)
          .eq("course_id", courseId)
          .single()

        setCertificate(certificateData || null)
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
      setQuizzes(allQuizzes)

      // Fetch quiz progress
      if (allQuizzes.length > 0) {
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
        setQuizProgress(quizProgressMap)
      }

      // Fetch assignments
      if (courseId) {
        const { data: assignmentsData } = await supabase
          .from("assignments")
          .select("*")
          .eq("course_id", courseId)
          .eq("is_published", true)
          .or(`module_id.eq.${moduleId},module_id.is.null`)
          .order("created_at", { ascending: true })

        if (assignmentsData) {
          setAssignments(assignmentsData)

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
              score: submission.score
            }
          })
          setAssignmentProgress(assignmentProgressMap)
        }
      }

      setLoading(false)
    }

    if (moduleId) {
      fetchModuleContent()
    }
  }, [moduleId, courseId])

  // Check if an item is locked
  const isItemLocked = (item: { type: 'lesson' | 'quiz' | 'assignment', id: string, order_index: number, parentLessonId?: string }): boolean => {
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
    
    if (item.type === 'quiz' && !item.parentLessonId) {
      const allItems: Array<{ type: 'lesson' | 'quiz', id: string, order_index: number }> = []
      lessons.forEach(l => allItems.push({ type: 'lesson', id: l.id, order_index: l.order_index }))
      quizzes.filter(q => q.module_id === moduleId && !q.lesson_id).forEach(q => 
        allItems.push({ type: 'quiz', id: q.id, order_index: q.order_index })
      )
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
      const allLessonsCompleted = lessons.every(l => lessonProgress[l.id]?.completed)
      const allModuleQuizzesCompleted = quizzes
        .filter(q => q.module_id === moduleId && !q.lesson_id)
        .every(q => quizProgress[q.id]?.completed)
      return !(allLessonsCompleted && allModuleQuizzesCompleted)
    }
    
    return false
  }

  // Calculate module progress
  const totalItems = lessons.length + quizzes.filter(q => q.module_id === moduleId).length + assignments.length
  const completedLessons = lessons.filter(l => lessonProgress[l.id]?.completed).length
  const completedQuizzes = quizzes.filter(q => q.module_id === moduleId && quizProgress[q.id]?.completed).length
  const completedAssignments = assignments.filter(a => assignmentProgress[a.id]?.submitted).length
  const completedItems = completedLessons + completedQuizzes + completedAssignments
  const moduleProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  // Organize content by tab
  const getTabContent = () => {
    if (activeTab === 'course') {
      const items: Array<{ type: 'lesson' | 'quiz' | 'assignment', data: any, parentLessonId?: string, order_index: number }> = []
      
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
    } else if (activeTab === 'exercise') {
      return assignments.map(a => ({ type: 'assignment' as const, data: a, order_index: a.order_index || 0 }))
    } else {
      return []
    }
  }

  const tabContent = getTabContent()

  if (loading) {
    return (
      <div className={cn("w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 h-full")}>
        <div className="p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 h-full overflow-y-auto")}>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {module?.title || t('curriculum')}
            </h2>
          </div>
          {module?.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              {module.description}
            </p>
          )}
          
          {/* Progress */}
          {totalItems > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">{tCommon('progress')}</span>
                <span className="font-semibold text-primary">
                  {moduleProgress}%
                </span>
              </div>
              <Progress value={moduleProgress} className="h-2" />
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-4">
          <div className="flex gap-1 bg-muted p-1 rounded-md">
            <button
              onClick={() => setActiveTab('course')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors",
                activeTab === 'course' 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <BookMarked className="h-4 w-4" />
              {t('course')}
            </button>
            <button
              onClick={() => setActiveTab('exercise')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors",
                activeTab === 'exercise' 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Dumbbell className="h-4 w-4" />
              {t('exercise')}
            </button>
            <button
              onClick={() => setActiveTab('record')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors",
                activeTab === 'record' 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Video className="h-4 w-4" />
              {t('record')}
            </button>
          </div>
        </div>

        {/* Content List */}
        <nav className="space-y-1 mb-6">
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
                          "group flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                          isLocked 
                            ? "opacity-50 cursor-not-allowed text-gray-400" 
                            : isActive 
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                              : "text-gray-700 hover:text-blue-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-gray-800"
                        )}
                        onClick={(e) => isLocked && e.preventDefault()}
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          {isLocked ? (
                            <Lock className="w-4 h-4 flex-shrink-0" />
                          ) : isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                          ) : (
                            <Circle className={cn(
                              "w-4 h-4 flex-shrink-0",
                              isActive ? "text-blue-600" : "text-gray-400"
                            )} />
                          )}
                          <PlayCircle className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{lesson.title}</span>
                        </div>
                        {lesson.duration && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                            {lesson.duration}m
                          </span>
                        )}
                      </Link>
                      {/* Show quizzes under this lesson */}
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
                              "group flex items-center justify-between px-3 py-2 pl-8 text-sm font-medium rounded-lg transition-colors",
                              isQuizLocked 
                                ? "opacity-50 cursor-not-allowed text-gray-400" 
                                : isQuizActive 
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                  : "text-gray-700 hover:text-blue-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-gray-800"
                            )}
                            onClick={(e) => isQuizLocked && e.preventDefault()}
                          >
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              {isQuizLocked ? (
                                <Lock className="w-4 h-4 flex-shrink-0" />
                              ) : isQuizCompleted ? (
                                <Award className="w-4 h-4 text-green-600 flex-shrink-0" />
                              ) : (
                                <Circle className={cn(
                                  "w-4 h-4 flex-shrink-0",
                                  isQuizActive ? "text-blue-600" : "text-gray-400"
                                )} />
                              )}
                              <FileText className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{quiz.title}</span>
                            </div>
                            {quizProgressData?.score !== undefined && (
                              <Badge 
                                variant={quizProgressData.passed ? "default" : "destructive"} 
                                className="text-xs ml-2 flex-shrink-0"
                              >
                                {quizProgressData.score}%
                              </Badge>
                            )}
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
                        "group flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                        isLocked 
                          ? "opacity-50 cursor-not-allowed text-gray-400" 
                          : isActive 
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                            : "text-gray-700 hover:text-blue-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-gray-800"
                      )}
                      onClick={(e) => isLocked && e.preventDefault()}
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {isLocked ? (
                          <Lock className="w-4 h-4 flex-shrink-0" />
                        ) : isCompleted ? (
                          <Award className="w-4 h-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <Circle className={cn(
                            "w-4 h-4 flex-shrink-0",
                            isActive ? "text-blue-600" : "text-gray-400"
                          )} />
                        )}
                        <FileText className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{quiz.title}</span>
                      </div>
                      {progress?.score !== undefined && (
                        <Badge 
                          variant={progress.passed ? "default" : "destructive"} 
                          className="text-xs ml-2 flex-shrink-0"
                        >
                          {progress.score}%
                        </Badge>
                      )}
                    </Link>
                  )
                }
                return null
              })}

              {tabContent.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  {t('noLessonsOrQuizzes')}
                </p>
              )}
            </>
          )}

          {activeTab === 'exercise' && (
            <>
              {tabContent.map((item) => {
                if (item.type === 'assignment') {
                  const assignment = item.data as Assignment
                  const progress = assignmentProgress[assignment.id]
                  const isSubmitted = progress?.submitted || false
                  const isGraded = progress?.graded || false
                  const isActive = currentAssignmentId === assignment.id
                  const isLocked = isItemLocked({ type: 'assignment', id: assignment.id, order_index: assignment.order_index || 0 })

                  return (
                    <Link
                      key={assignment.id}
                      href={isLocked ? '#' : `${localePrefix}/student/assignments/${assignment.id}`}
                      className={cn(
                        "group flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                        isLocked 
                          ? "opacity-50 cursor-not-allowed text-gray-400" 
                          : isActive 
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                            : "text-gray-700 hover:text-blue-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-gray-800"
                      )}
                      onClick={(e) => isLocked && e.preventDefault()}
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {isLocked ? (
                          <Lock className="w-4 h-4 flex-shrink-0" />
                        ) : isGraded ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                        ) : isSubmitted ? (
                          <ClipboardCheck className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                        ) : (
                          <Circle className={cn(
                            "w-4 h-4 flex-shrink-0",
                            isActive ? "text-blue-600" : "text-gray-400"
                          )} />
                        )}
                        <FileText className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{assignment.title}</span>
                      </div>
                      {progress?.score !== undefined && (
                        <Badge variant="default" className="text-xs ml-2 flex-shrink-0">
                          {progress.score}/{assignment.max_points}
                        </Badge>
                      )}
                    </Link>
                  )
                }
                return null
              })}

              {tabContent.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  {t('noAssignmentsYet')}
                </p>
              )}
            </>
          )}

          {activeTab === 'record' && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              {t('noRecordedSessionsYet')}
            </p>
          )}
        </nav>

        {/* Certificate Section */}
        {certificate && course && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Award className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {t('certificateOfCompletion')}
                </h4>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                {t('youHaveSuccessfullyCompletedThisCourse')}
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('certificateNumber')}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {certificate.certificate_number}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('issuedOn')}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {new Date(certificate.issued_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <Link href={`${localePrefix}/certificates/${certificate.certificate_number}`}>
                <Button variant="outline" size="sm" className="w-full mt-3">
                  <Download className="h-3 w-3 mr-2" />
                  {tCommon('downloadCertificate')}
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Back to Course Link */}
        {courseId && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Link href={`${localePrefix}/student/courses/${courseId}`}>
              <Button variant="outline" size="sm" className="w-full">
                <GraduationCap className="h-4 w-4 mr-2" />
                {tCommon('backToCourse')}
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
