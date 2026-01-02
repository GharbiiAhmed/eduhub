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
      <div className={cn("w-96 bg-white border-r border-gray-200 h-full")}>
        <div className="p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("w-[420px] bg-white border-r border-gray-200 h-full flex flex-col shadow-lg")}>
      <div className="p-6 flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <div className="mb-4">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              {t('curriculum').toUpperCase()}
            </h2>
            {module?.title && (
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {module.title}
              </h3>
            )}
            {module?.description && (
              <p className="text-sm text-gray-600 leading-relaxed">
                {module.description}
              </p>
            )}
          </div>
          
          {/* Progress */}
          {totalItems > 0 && (
            <div className="space-y-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">{tCommon('progress')}</span>
                <span className="text-2xl font-bold text-blue-600">
                  {moduleProgress}%
                </span>
              </div>
              <Progress value={moduleProgress} className="h-3 bg-blue-100" />
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span className="font-medium">{completedItems} {tCommon('complete')}</span>
                <span className="font-medium">{totalItems} {t('total')} {t('items')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex gap-2 bg-gray-100 p-1.5 rounded-lg">
            <button
              onClick={() => setActiveTab('course')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-semibold transition-all",
                activeTab === 'course' 
                  ? "bg-white text-gray-900 shadow-md" 
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              <BookMarked className="h-4 w-4" />
              {t('course')}
            </button>
            <button
              onClick={() => setActiveTab('exercise')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-semibold transition-all",
                activeTab === 'exercise' 
                  ? "bg-white text-gray-900 shadow-md" 
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              <Dumbbell className="h-4 w-4" />
              {t('exercise')}
            </button>
            <button
              onClick={() => setActiveTab('record')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-semibold transition-all",
                activeTab === 'record' 
                  ? "bg-white text-gray-900 shadow-md" 
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              <Video className="h-4 w-4" />
              {t('record')}
            </button>
          </div>
        </div>

        {/* Content List */}
        <nav className="space-y-3 mb-6 flex-1 overflow-y-auto min-h-0 pr-2">
          {activeTab === 'course' && (
            <>
              {tabContent.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <BookMarked className="w-4 h-4" />
                    {t('courseContent')}
                  </h4>
                </div>
              )}
              {tabContent.map((item, index) => {
                if (item.type === 'lesson') {
                  const lesson = item.data as Lesson
                  const progress = lessonProgress[lesson.id]
                  const isCompleted = progress?.completed || false
                  const isActive = currentLessonId === lesson.id
                  const isLocked = isItemLocked({ type: 'lesson', id: lesson.id, order_index: lesson.order_index })

                  return (
                    <div key={lesson.id}>
                      <div className="relative">
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-200" />
                        <Link
                          href={isLocked ? '#' : `/student/lessons/${lesson.id}`}
                          className={cn(
                            "group relative flex items-start px-5 py-4 rounded-xl transition-all border-2",
                            isLocked 
                              ? "opacity-60 cursor-not-allowed border-gray-200 bg-gray-50" 
                              : isActive 
                                ? "bg-blue-600 text-white shadow-xl border-blue-700 transform scale-[1.02]"
                                : "border-gray-200 bg-white hover:border-blue-400 hover:shadow-lg hover:bg-blue-50/50"
                          )}
                          onClick={(e) => isLocked && e.preventDefault()}
                        >
                          <div className="flex items-start space-x-4 flex-1 min-w-0">
                            <div className="flex-shrink-0 mt-1">
                              <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center",
                                isActive ? "bg-white/20" : isCompleted ? "bg-green-100" : "bg-gray-100"
                              )}>
                                {isLocked ? (
                                  <Lock className="w-5 h-5 text-gray-400" />
                                ) : isCompleted ? (
                                  <CheckCircle2 className={cn(
                                    "w-5 h-5",
                                    isActive ? "text-white" : "text-green-600"
                                  )} />
                                ) : (
                                  <Circle className={cn(
                                    "w-5 h-5",
                                    isActive ? "text-white" : "text-gray-400"
                                  )} />
                                )}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-2 mb-2">
                                <PlayCircle className={cn(
                                  "w-5 h-5 flex-shrink-0 mt-0.5",
                                  isActive ? "text-white" : "text-blue-600"
                                )} />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={cn(
                                      "text-xs font-bold px-2 py-0.5 rounded",
                                      isActive ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"
                                    )}>
                                      {index + 1}
                                    </span>
                                    <span className={cn(
                                      "font-bold text-lg",
                                      isActive ? "text-white" : "text-gray-900"
                                    )}>{lesson.title}</span>
                                  </div>
                                  {lesson.description && (
                                    <p className={cn(
                                      "text-sm mt-1 leading-relaxed",
                                      isActive ? "text-white/95" : "text-gray-600"
                                    )}>
                                      {lesson.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-4 mt-3 flex-wrap">
                                {lesson.duration && (
                                  <span className={cn(
                                    "text-sm font-medium flex items-center gap-1.5",
                                    isActive ? "text-white/90" : "text-gray-600"
                                  )}>
                                    <Clock className="w-4 h-4" />
                                    {lesson.duration} {t('minutes')}
                                  </span>
                                )}
                                {lesson.content_type && (
                                  <span className={cn(
                                    "text-xs font-semibold px-3 py-1 rounded-full",
                                    isActive ? "bg-white/25 text-white border border-white/30" : "bg-gray-100 text-gray-700 border border-gray-200"
                                  )}>
                                    {lesson.content_type.toUpperCase()}
                                  </span>
                                )}
                                {isCompleted && !isActive && (
                                  <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">
                                    {tCommon('completed')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      </div>
                      {/* Show quizzes under this lesson */}
                      {quizzes.filter(q => q.lesson_id === lesson.id).map(quiz => {
                        const quizProgressData = quizProgress[quiz.id]
                        const isQuizCompleted = quizProgressData?.completed || false
                        const isQuizActive = currentQuizId === quiz.id
                        const isQuizLocked = isItemLocked({ type: 'quiz', id: quiz.id, order_index: quiz.order_index, parentLessonId: lesson.id })

                        return (
                          <div className="relative ml-8">
                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-200" />
                            <Link
                              key={quiz.id}
                              href={isQuizLocked ? '#' : `/student/quizzes/${quiz.id}`}
                              className={cn(
                                "group relative flex items-start px-5 py-4 rounded-xl transition-all border-2 ml-4",
                                isQuizLocked 
                                  ? "opacity-60 cursor-not-allowed border-gray-200 bg-gray-50" 
                                  : isQuizActive 
                                    ? "bg-blue-600 text-white shadow-xl border-blue-700 transform scale-[1.02]"
                                    : "border-gray-200 bg-white hover:border-blue-400 hover:shadow-lg hover:bg-blue-50/50"
                              )}
                              onClick={(e) => isQuizLocked && e.preventDefault()}
                            >
                              <div className="flex items-start space-x-4 flex-1 min-w-0">
                                <div className="flex-shrink-0 mt-1">
                                  <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center",
                                    isQuizActive ? "bg-white/20" : isQuizCompleted ? "bg-green-100" : "bg-gray-100"
                                  )}>
                                    {isQuizLocked ? (
                                      <Lock className="w-5 h-5 text-gray-400" />
                                    ) : isQuizCompleted ? (
                                      <Award className={cn(
                                        "w-5 h-5",
                                        isQuizActive ? "text-white" : "text-green-600"
                                      )} />
                                    ) : (
                                      <Circle className={cn(
                                        "w-5 h-5",
                                        isQuizActive ? "text-white" : "text-gray-400"
                                      )} />
                                    )}
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start gap-2 mb-2">
                                    <FileText className={cn(
                                      "w-5 h-5 flex-shrink-0 mt-0.5",
                                      isQuizActive ? "text-white" : "text-purple-600"
                                    )} />
                                    <div className="flex-1">
                                      <span className={cn(
                                        "font-bold text-lg",
                                        isQuizActive ? "text-white" : "text-gray-900"
                                      )}>{quiz.title}</span>
                                    </div>
                                  </div>
                                  {quiz.description && (
                                    <p className={cn(
                                      "text-sm mt-1 leading-relaxed",
                                      isQuizActive ? "text-white/95" : "text-gray-600"
                                    )}>
                                      {quiz.description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-4 mt-3 flex-wrap">
                                    {quizProgressData?.score !== undefined && (
                                      <span className={cn(
                                        "text-sm font-bold px-3 py-1 rounded-lg",
                                        isQuizActive 
                                          ? quizProgressData.passed 
                                            ? "bg-green-500/30 text-white border border-green-400/50" 
                                            : "bg-red-500/30 text-white border border-red-400/50"
                                          : quizProgressData.passed 
                                            ? "bg-green-100 text-green-700 border border-green-200" 
                                            : "bg-red-100 text-red-700 border border-red-200"
                                      )}>
                                        {quizProgressData.score}%
                                      </span>
                                    )}
                                    {quiz.passing_score && (
                                      <span className={cn(
                                        "text-sm font-medium",
                                        isQuizActive ? "text-white/90" : "text-gray-600"
                                      )}>
                                        {t('passingScore')}: {quiz.passing_score}%
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </Link>
                          </div>
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
                    <div className="relative">
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-200" />
                      <Link
                        key={quiz.id}
                        href={isLocked ? '#' : `/student/quizzes/${quiz.id}`}
                        className={cn(
                          "group relative flex items-start px-5 py-4 rounded-xl transition-all border-2",
                          isLocked 
                            ? "opacity-60 cursor-not-allowed border-gray-200 bg-gray-50" 
                            : isActive 
                              ? "bg-blue-600 text-white shadow-xl border-blue-700 transform scale-[1.02]"
                              : "border-gray-200 bg-white hover:border-blue-400 hover:shadow-lg hover:bg-blue-50/50"
                        )}
                        onClick={(e) => isLocked && e.preventDefault()}
                      >
                        <div className="flex items-start space-x-4 flex-1 min-w-0">
                          <div className="flex-shrink-0 mt-1">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center",
                              isActive ? "bg-white/20" : isCompleted ? "bg-green-100" : "bg-gray-100"
                            )}>
                              {isLocked ? (
                                <Lock className="w-5 h-5 text-gray-400" />
                              ) : isCompleted ? (
                                <Award className={cn(
                                  "w-5 h-5",
                                  isActive ? "text-white" : "text-green-600"
                                )} />
                              ) : (
                                <Circle className={cn(
                                  "w-5 h-5",
                                  isActive ? "text-white" : "text-gray-400"
                                )} />
                              )}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2 mb-2">
                              <FileText className={cn(
                                "w-5 h-5 flex-shrink-0 mt-0.5",
                                isActive ? "text-white" : "text-purple-600"
                              )} />
                              <div className="flex-1">
                                <span className={cn(
                                  "font-bold text-lg",
                                  isActive ? "text-white" : "text-gray-900"
                                )}>{quiz.title}</span>
                              </div>
                            </div>
                            {quiz.description && (
                              <p className={cn(
                                "text-sm mt-1 leading-relaxed",
                                isActive ? "text-white/95" : "text-gray-600"
                              )}>
                                {quiz.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-3 flex-wrap">
                              {progress?.score !== undefined && (
                                <span className={cn(
                                  "text-sm font-bold px-3 py-1 rounded-lg",
                                  isActive 
                                    ? progress.passed 
                                      ? "bg-green-500/30 text-white border border-green-400/50" 
                                      : "bg-red-500/30 text-white border border-red-400/50"
                                    : progress.passed 
                                      ? "bg-green-100 text-green-700 border border-green-200" 
                                      : "bg-red-100 text-red-700 border border-red-200"
                                )}>
                                  {progress.score}%
                                </span>
                              )}
                              {quiz.passing_score && (
                                <span className={cn(
                                  "text-sm font-medium",
                                  isActive ? "text-white/90" : "text-gray-600"
                                )}>
                                  {t('passingScore')}: {quiz.passing_score}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  )
                }
                return null
              })}

              {tabContent.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
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
                      href={isLocked ? '#' : `/student/assignments/${assignment.id}`}
                      className={cn(
                        "group flex items-start justify-between px-4 py-3 rounded-lg transition-all mb-2 border",
                        isLocked 
                          ? "opacity-50 cursor-not-allowed border-gray-200 bg-gray-50" 
                          : isActive 
                            ? "bg-blue-600 text-white shadow-lg border-blue-700"
                            : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-md"
                      )}
                      onClick={(e) => isLocked && e.preventDefault()}
                    >
                      <div className="flex items-start space-x-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 mt-0.5">
                          {isLocked ? (
                            <Lock className="w-5 h-5 text-gray-400" />
                          ) : isGraded ? (
                            <CheckCircle2 className={cn(
                              "w-5 h-5",
                              isActive ? "text-white" : "text-green-600"
                            )} />
                          ) : isSubmitted ? (
                            <ClipboardCheck className={cn(
                              "w-5 h-5",
                              isActive ? "text-white" : "text-yellow-600"
                            )} />
                          ) : (
                            <Circle className={cn(
                              "w-5 h-5",
                              isActive ? "text-white" : "text-gray-400"
                            )} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className={cn(
                              "w-4 h-4 flex-shrink-0",
                              isActive ? "text-white" : "text-gray-500"
                            )} />
                            <span className={cn(
                              "font-semibold text-base",
                              isActive ? "text-white" : "text-gray-900"
                            )}>{assignment.title}</span>
                          </div>
                          {assignment.description && (
                            <p className={cn(
                              "text-sm mt-1 line-clamp-2",
                              isActive ? "text-white/90" : "text-gray-600"
                            )}>
                              {assignment.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            {progress?.score !== undefined && (
                              <span className={cn(
                                "text-xs font-semibold px-2 py-0.5 rounded",
                                isActive ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"
                              )}>
                                {progress.score}/{assignment.max_points} {t('points')}
                              </span>
                            )}
                            {assignment.due_date && (
                              <span className={cn(
                                "text-xs flex items-center gap-1",
                                isActive ? "text-white/80" : "text-gray-500"
                              )}>
                                <Clock className="w-3 h-3" />
                                {new Date(assignment.due_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                }
                return null
              })}

              {tabContent.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  {t('noAssignmentsYet')}
                </p>
              )}
            </>
          )}

          {activeTab === 'record' && (
            <p className="text-sm text-gray-500 text-center py-4">
              {t('noRecordedSessionsYet')}
            </p>
          )}
        </nav>

        {/* Certificate Section */}
        {certificate && course && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2 mb-3">
                <Award className="h-5 w-5 text-blue-600" />
                <h4 className="text-sm font-semibold text-gray-900">
                  {t('certificateOfCompletion')}
                </h4>
              </div>
              <p className="text-xs text-gray-600 mb-3">
                {t('youHaveSuccessfullyCompletedThisCourse')}
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{t('certificateNumber')}</span>
                  <span className="font-semibold text-gray-900">
                    {certificate.certificate_number}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{t('issuedOn')}</span>
                  <span className="font-semibold text-gray-900">
                    {new Date(certificate.issued_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <Link href={`/certificates/${certificate.certificate_number}`}>
                <Button variant="outline" size="sm" className="w-full mt-3 bg-white hover:bg-gray-50">
                  <Download className="h-3 w-3 mr-2" />
                  {tCommon('downloadCertificate')}
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Back to Course Link */}
        {courseId && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Link href={`/student/courses/${courseId}`}>
              <Button variant="outline" size="sm" className="w-full bg-white hover:bg-gray-50">
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
