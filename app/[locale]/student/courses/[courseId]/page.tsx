"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter, Link } from '@/i18n/routing'
import { useLocale } from 'next-intl'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState, use } from "react"
import { RatingDisplay } from "@/components/course/rating-display"
import { CourseRatingSection } from "@/components/student/course-rating-section"
import { 
  BookOpen, 
  Info, 
  Star, 
  Award,
  ArrowLeft,
  GraduationCap,
  PlayCircle,
  FileText,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  Clock,
  Lock
} from "lucide-react"
import { cn } from "@/lib/utils"

type TabType = 'curriculum' | 'about' | 'reviews'

export default function StudentCourseDetailPage({
  params
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = use(params)
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('curriculum')
  const [course, setCourse] = useState<any>(null)
  const [modules, setModules] = useState<any[]>([])
  const [enrollment, setEnrollment] = useState<any>(null)
  const [certificate, setCertificate] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set())
  const [moduleContent, setModuleContent] = useState<Record<string, {
    lessons: any[]
    quizzes: any[]
    lessonProgress: Record<string, any>
    quizProgress: Record<string, any>
  }>>({})
  const locale = useLocale()
  const isRTL = locale === 'ar'

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
        router.push("/auth/login")
        return
  }

      // Fetch course
      const { data: courseData } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single()

      // Fetch enrollment
      const { data: enrollmentData } = await supabase
    .from("enrollments")
    .select("*")
    .eq("student_id", user.id)
    .eq("course_id", courseId)
    .single()

      // Fetch modules
      const { data: modulesData } = await supabase
    .from("modules")
    .select("*")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true })

      // Fetch certificate
      const { data: certificateData } = await supabase
    .from("certificates")
    .select("*")
    .eq("student_id", user.id)
    .eq("course_id", courseId)
    .single()

      setCourse(courseData)
      setEnrollment(enrollmentData)
      setModules(modulesData || [])
      setCertificate(certificateData || null)
      
      // Fetch content for all modules
      if (modulesData && modulesData.length > 0) {
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
        }

        setModuleContent(contentMap)
        // Expand first module by default
        if (modulesData.length > 0) {
          setExpandedModules(new Set([modulesData[0].id]))
        }
      }

      setLoading(false)
    }

    fetchData()
  }, [courseId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading course...</p>
        </div>
      </div>
    )
  }

  if (!course || !enrollment) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p className="text-lg font-medium">Course not found</p>
          <Link href="/student/courses">
            <Button>Go Back</Button>
          </Link>
        </div>
      </div>
    )
  }

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

  return (
    <div className="min-h-screen">
      {/* Main Content */}
      <div className="h-full overflow-y-auto p-6">
        {/* Header */}
        <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <GraduationCap className="h-3 w-3" />
                Course
              </Badge>
            </div>
            <h1 className="text-4xl font-bold tracking-tight">{course.title}</h1>
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Progress:</span>
                <div className="flex items-center gap-2 min-w-[200px]">
                  <Progress value={enrollment.progress_percentage} className="flex-1 h-2" />
                  <span className="text-sm font-medium min-w-[45px]">
                    {enrollment.progress_percentage}%
                  </span>
                </div>
              </div>
              {course.average_rating && course.average_rating > 0 && (
              <RatingDisplay
                rating={course.average_rating}
                totalRatings={course.total_ratings || 0}
              />
            )}
          </div>
        </div>
          <Button variant="outline" onClick={() => router.push("/student/courses")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('curriculum')}
          className={cn(
            "px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2",
            activeTab === 'curriculum' 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <BookOpen className="h-4 w-4" />
          Curriculum
        </button>
        <button
          onClick={() => setActiveTab('about')}
          className={cn(
            "px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2",
            activeTab === 'about' 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Info className="h-4 w-4" />
          About
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={cn(
            "px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2",
            activeTab === 'reviews' 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Star className="h-4 w-4" />
          Reviews
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'curriculum' && (
          <div className="space-y-4">
            {modules.length > 0 ? (
              <div className="space-y-4">
                {modules.map((module) => {
                  const content = moduleContent[module.id]
                  const isExpanded = expandedModules.has(module.id)
                  const moduleLessons = content?.lessons || []
                  const moduleQuizzes = content?.quizzes || []
                  const lessonProgress = content?.lessonProgress || {}
                  const quizProgress = content?.quizProgress || {}

                  // Calculate module progress
                  const totalItems = moduleLessons.length + moduleQuizzes.length
                  const completedLessons = moduleLessons.filter((l: any) => lessonProgress[l.id]?.completed).length
                  const completedQuizzes = moduleQuizzes.filter((q: any) => quizProgress[q.id]?.completed).length
                  const moduleProgress = totalItems > 0 ? Math.round(((completedLessons + completedQuizzes) / totalItems) * 100) : 0

                  return (
                    <Card key={module.id} className="overflow-hidden">
                      <CardHeader 
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleModule(module.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown className="w-5 h-5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                              )}
                              <CardTitle className="text-xl">
                                {module.order_index}. {module.title}
                              </CardTitle>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              Module {module.order_index}
                            </Badge>
                          </div>
                          {totalItems > 0 && (
                            <div className="flex items-center gap-3">
                              <Progress value={moduleProgress} className="w-24 h-2" />
                              <span className="text-sm font-medium min-w-[45px]">
                                {moduleProgress}%
                              </span>
                            </div>
                          )}
                        </div>
                        {module.description && (
                          <CardDescription className="mt-2 ml-7">
                            {module.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      
                      {isExpanded && content && (
                        <CardContent className="pt-0">
                          <div className="space-y-3 ml-7">
                            {/* Module-level Quizzes */}
                            {moduleQuizzes.length > 0 && (
                              <div className="space-y-2 mb-4">
                                {moduleQuizzes.map((quiz: any) => {
                                  const progress = quizProgress[quiz.id]
                                  const isCompleted = progress?.completed || false
                                  
                                  return (
                                    <Link
                                      key={quiz.id}
                                      href={`/student/quizzes/${quiz.id}`}
                                      className="block"
                                    >
                                      <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 hover:border-primary/50 transition-all group">
                                        <div className={cn(
                                          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                                          isCompleted ? "bg-green-500/20" : "bg-muted"
                                        )}>
                                          {isCompleted ? (
                                            <Award className="w-5 h-5 text-green-600 dark:text-green-400" />
                                          ) : (
                                            <FileText className="w-5 h-5 text-muted-foreground" />
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-base">{quiz.title}</span>
                                            {progress?.score !== undefined && (
                                              <Badge variant={progress.passed ? "default" : "destructive"} className="text-xs">
                                                {progress.score}%
                                              </Badge>
                                            )}
                                          </div>
                                          {quiz.description && (
                                            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                                              {quiz.description}
                                            </p>
                                          )}
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                      </div>
                                    </Link>
                                  )
                                })}
                              </div>
                            )}

                            {/* Lessons */}
                            {moduleLessons.map((lesson: any) => {
                              const progress = lessonProgress[lesson.id]
                              const isCompleted = progress?.completed || false
                              const isLessonExpanded = expandedLessons.has(lesson.id)
                              const lessonQuizzes = content.lessonQuizzes?.filter((q: any) => q.lesson_id === lesson.id) || []

                              return (
                                <div key={lesson.id} className="space-y-2">
                                  <div className="flex items-center gap-3">
                                    <Link
                                      href={`/student/lessons/${lesson.id}`}
                                      className="flex-1"
                                    >
                                      <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 hover:border-primary/50 transition-all group">
                                        <div className={cn(
                                          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                                          isCompleted ? "bg-green-500/20" : "bg-muted"
                                        )}>
                                          {isCompleted ? (
                                            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                                          ) : (
                                            <PlayCircle className="w-5 h-5 text-primary" />
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-base">{lesson.title}</span>
                                            {isCompleted && (
                                              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-700 dark:text-green-400">
                                                Completed
                                              </Badge>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-3 mt-1">
                                            {lesson.duration && (
                                              <span className="text-sm text-muted-foreground flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                {lesson.duration} min
                                              </span>
                                            )}
                                            {lesson.content_type && (
                                              <Badge variant="outline" className="text-xs">
                                                {lesson.content_type}
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                        {lessonQuizzes.length > 0 && (
                                          <button
                                            onClick={(e) => {
                                              e.preventDefault()
                                              e.stopPropagation()
                                              toggleLesson(lesson.id)
                                            }}
                                            className="p-1 hover:bg-muted rounded"
                                          >
                                            {isLessonExpanded ? (
                                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                            ) : (
                                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                            )}
                                          </button>
                                        )}
                                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                      </div>
                                    </Link>
                                  </div>

                                  {/* Lesson Quizzes */}
                                  {isLessonExpanded && lessonQuizzes.length > 0 && (
                                    <div className="ml-11 space-y-2">
                                      {lessonQuizzes.map((quiz: any) => {
                                        const progress = quizProgress[quiz.id]
                                        const isCompleted = progress?.completed || false
                                        
                                        return (
                                          <Link
                                            key={quiz.id}
                                            href={`/student/quizzes/${quiz.id}`}
                                            className="block"
                                          >
                                            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 hover:bg-accent/50 hover:border-primary/50 transition-all group">
                                              <div className={cn(
                                                "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                                                isCompleted ? "bg-green-500/20" : "bg-muted"
                                              )}>
                                                {isCompleted ? (
                                                  <Award className="w-4 h-4 text-green-600 dark:text-green-400" />
                                                ) : (
                                                  <FileText className="w-4 h-4 text-muted-foreground" />
                                                )}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                  <span className="font-medium text-sm">{quiz.title}</span>
                                                  {progress?.score !== undefined && (
                                                    <Badge variant={progress.passed ? "default" : "destructive"} className="text-xs">
                                                      {progress.score}%
                                                    </Badge>
                                                  )}
                                                </div>
                                                {quiz.description && (
                                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                                    {quiz.description}
                                                  </p>
                                                )}
                                              </div>
                                              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                            </div>
                                          </Link>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  )
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No modules available yet
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'about' && (
          <Card>
            <CardHeader>
              <CardTitle>About This Course</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-lg dark:prose-invert max-w-none">
                <p className="text-muted-foreground whitespace-pre-line">
                  {course.description || "No description available."}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'reviews' && (
          <Card>
            <CardHeader>
              <CardTitle>Course Reviews</CardTitle>
            </CardHeader>
            <CardContent>
          <CourseRatingSection
            courseId={courseId}
                courseTitle={course.title || ""}
            enrollmentProgress={enrollment.progress_percentage}
                averageRating={course.average_rating || 0}
                totalRatings={course.total_ratings || 0}
          />
            </CardContent>
          </Card>
        )}
      </div>

      </div>
    </div>
  )
}
