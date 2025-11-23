"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useEffect, useState, use } from "react"
import { useRouter } from '@/i18n/routing'
import { 
  BookOpen, 
  Users, 
  Clock, 
  Star, 
  ArrowRight, 
  PlayCircle, 
  CheckCircle, 
  Lock,
  Download,
  MessageSquare,
  Award,
  Target,
  Zap,
  ChevronDown,
  ChevronRight
} from "lucide-react"
import { ErrorBoundary } from "@/components/error-boundary"
import { LoadingSpinner } from "@/components/loading-spinner"
import { ApiErrorHandler } from "@/components/api-error-handler"
import { Navigation } from "@/components/navigation"
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

export default function CourseDetailPage({
  params
}: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params)
  const t = useTranslations('courses')
  const tCommon = useTranslations('common')
  const [course, setCourse] = useState<any>(null)
  const [modules, setModules] = useState<any[]>([])
  const [instructor, setInstructor] = useState<any>(null)
  const [enrollmentCount, setEnrollmentCount] = useState(0)
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [paymentType, setPaymentType] = useState<'one_time' | 'monthly' | 'yearly'>('one_time')
  const router = useRouter()

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        if (!isValidUUID(courseId)) {
          throw new Error("Invalid course ID format")
        }

        const supabase = createClient()

        const { data: courseData, error: courseError } = await supabase
          .from("courses")
          .select("*, average_rating, total_ratings, subscription_enabled, subscription_type, monthly_price, yearly_price")
          .eq("id", courseId)
          .single()

        if (courseError) throw courseError
        if (!courseData) throw new Error("Course not found")

        setCourse(courseData)

        // Set default payment type based on subscription settings
        if (courseData.subscription_enabled) {
          if (courseData.subscription_type === 'subscription') {
            // If subscription only, default to monthly if available, otherwise yearly
            setPaymentType(courseData.monthly_price && courseData.monthly_price > 0 ? 'monthly' : 'yearly')
          } else if (courseData.subscription_type === 'both') {
            // If both options available, default to one-time
            setPaymentType('one_time')
          }
        }

        // Fetch modules and lessons
        const { data: modulesData, error: modulesError } = await supabase
          .from("modules")
          .select(`
            *,
            lessons(*)
          `)
          .eq("course_id", courseId)
          .order("order_index")

        if (modulesError) throw modulesError
        setModules(modulesData || [])

        // Fetch instructor profile
        if (courseData.instructor_id) {
          const { data: instructorData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", courseData.instructor_id)
            .single()

          if (instructorData) {
            // Fetch instructor's published course count
            const { count: courseCount } = await supabase
              .from("courses")
              .select("*", { count: "exact", head: true })
              .eq("instructor_id", courseData.instructor_id)
              .eq("status", "published")

            setInstructor({
              ...instructorData,
              courseCount: courseCount || 0
            })
          }
        }

        // Fetch enrollment count
        // Use a public API endpoint to get enrollment count to bypass RLS
        try {
          const response = await fetch(`/api/courses/${courseId}/enrollment-count`)
          if (response.ok) {
            const data = await response.json()
            setEnrollmentCount(data.count || 0)
          } else {
            // Fallback: try direct query (might fail due to RLS)
            const { count: enrollmentCountData } = await supabase
              .from("enrollments")
              .select("*", { count: "exact", head: true })
              .eq("course_id", courseId)
            setEnrollmentCount(enrollmentCountData || 0)
          }
        } catch (error) {
          console.error("Error fetching enrollment count:", error)
          // Fallback: try direct query
          const { count: enrollmentCountData } = await supabase
            .from("enrollments")
            .select("*", { count: "exact", head: true })
            .eq("course_id", courseId)
          setEnrollmentCount(enrollmentCountData || 0)
        }

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
          const { data: enrollmentData, error: enrollmentError } = await supabase
            .from("enrollments")
            .select("*")
            .eq("student_id", user.id)
            .eq("course_id", courseId)
            .single()

          // If there's an error, it might be due to RLS policies, so we'll treat it as not enrolled
          if (enrollmentData && !enrollmentError) {
            setIsEnrolled(true)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load course"))
      } finally {
        setIsLoading(false)
      }
    }

    fetchCourse()
  }, [courseId])

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

  const totalLessons = modules.reduce((sum, module) => sum + (module.lessons?.length || 0), 0)
  const totalDuration = modules.reduce((sum, module) => sum + (module.lessons?.reduce((lessonSum: number, lesson: any) => lessonSum + (lesson.duration || 0), 0) || 0), 0)

  const handleEnroll = async () => {
    setIsEnrolling(true)
    setError(null)

    try {
      const response = await fetch("/api/checkout/paymee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: courseId,
          type: "digital",
          paymentType: paymentType || "one_time",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.error || data.message || data.details || `Failed to process enrollment (${response.status})`
        console.error("Checkout error - Full details:", {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
          message: data.message,
          details: data.details,
          fullData: JSON.stringify(data, null, 2)
        })
        throw new Error(errorMsg)
      }

      if (data.error) {
        console.error("Checkout error in response:", data)
        throw new Error(data.error)
      }

      if (data.free) {
        router.push(`/student/courses/${courseId}`)
        return
      }

      // Redirect to Paymee payment page
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl
      } else {
        throw new Error("Payment URL not received")
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Enrollment failed"))
    } finally {
      setIsEnrolling(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="space-y-6">
          <div className="h-64 bg-muted rounded-lg animate-pulse" />
          <div className="h-32 bg-muted rounded-lg animate-pulse" />
        </div>
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="max-w-4xl mx-auto">
        <ApiErrorHandler error={error || new Error("Course not found")} onRetry={() => window.location.reload()} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      <ErrorBoundary>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Hero Section */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 p-4 sm:p-6 md:p-8 lg:p-12 mb-4 sm:mb-6 md:mb-8">
            <div className="absolute inset-0 bg-black/20"></div>
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold text-white">
                    {course.title}
                  </h1>
                  <p className="text-white/90 text-lg mt-2">
                    {course.description}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <Star className="w-6 h-6 text-white" />
                    <div>
                      <div className="text-2xl font-bold text-white">
                        {course.average_rating != null && Number(course.average_rating) > 0 && course.total_ratings && Number(course.total_ratings) > 0
                          ? Number(course.average_rating).toFixed(1) 
                          : "N/A"}
                      </div>
                      <div className="text-white/80 text-sm">
                        {t('averageRating')} {course.total_ratings && course.total_ratings > 0 ? `(${course.total_ratings})` : ""}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <Users className="w-6 h-6 text-white" />
                    <div>
                      <div className="text-2xl font-bold text-white">
                        {enrollmentCount >= 1000 ? `${(enrollmentCount / 1000).toFixed(1)}K` : enrollmentCount}
                      </div>
                      <div className="text-white/80 text-sm">{tCommon('students')}</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <PlayCircle className="w-6 h-6 text-white" />
                    <div>
                      <div className="text-2xl font-bold text-white">{totalLessons}</div>
                      <div className="text-white/80 text-sm">{t('lessons')}</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <Clock className="w-6 h-6 text-white" />
                    <div>
                      <div className="text-2xl font-bold text-white">{Math.round(totalDuration / 60)}h</div>
                      <div className="text-white/80 text-sm">{t('duration')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Course Curriculum */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="w-5 h-5 mr-2 text-blue-600" />
                    {t('courseCurriculum')}
                  </CardTitle>
                  <CardDescription>
                    {modules.length} {t('modules')} • {totalLessons} {t('lessons')} • {Math.round(totalDuration / 60)} {t('hours')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {modules.map((module, moduleIndex) => (
                      <div key={module.id} className="border rounded-lg">
                        <div 
                          className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                          onClick={() => toggleModule(module.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {expandedModules.has(module.id) ? (
                                <ChevronDown className="w-5 h-5 text-gray-500" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-gray-500" />
                              )}
                              <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                  {t('module')} {moduleIndex + 1}: {module.title}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {module.lessons?.length || 0} {t('lessons')} • {Math.round((module.lessons?.reduce((sum: number, lesson: any) => sum + (lesson.duration || 0), 0) || 0) / 60)} {t('minutes')}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline">
                              {module.lessons?.length || 0} {t('lessons')}
                            </Badge>
                          </div>
                        </div>
                        
                        {expandedModules.has(module.id) && (
                          <div className="border-t bg-gray-50 dark:bg-gray-800">
                            <div className="p-4 space-y-3">
                              {module.lessons?.map((lesson: any, lessonIndex: number) => (
                                <div key={lesson.id} className="flex items-center space-x-3 p-2 rounded hover:bg-white dark:hover:bg-gray-700 transition-colors">
                                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                                    <PlayCircle className="w-3 h-3 text-blue-600" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                      {lessonIndex + 1}. {lesson.title}
                                    </p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                      {lesson.duration || 0} {t('minutes')}
                                    </p>
                                  </div>
                                  {lesson.is_preview && (
                                    <Badge variant="secondary" className="text-xs">
                                      {t('preview')}
                                    </Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Instructor Card */}
              {instructor && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="w-5 h-5 mr-2 text-green-600" />
                      {t('aboutInstructor')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                        {instructor.avatar_url ? (
                          <img src={instructor.avatar_url} alt={instructor.full_name || t('instructor')} className="w-16 h-16 rounded-full object-cover" />
                        ) : (
                          <span className="text-white text-xl font-bold">
                            {(instructor.full_name || instructor.email || "I")[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{instructor.full_name || instructor.email || t('instructor')}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{instructor.bio || t('professionalEducator')}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm">
                          {instructor.average_rating && instructor.average_rating > 0 && (
                            <div className="flex items-center space-x-1">
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                              <span>{instructor.average_rating.toFixed(1)} {t('rating')}</span>
                            </div>
                          )}
                          {instructor.total_ratings && instructor.total_ratings > 0 && (
                            <div className="flex items-center space-x-1">
                              <Users className="w-4 h-4 text-gray-500" />
                              <span>
                                {instructor.total_ratings >= 1000 
                                  ? `${(instructor.total_ratings / 1000).toFixed(1)}K` 
                                  : instructor.total_ratings} {tCommon('students')}
                              </span>
                            </div>
                          )}
                          {instructor.courseCount !== undefined && (
                            <div className="flex items-center space-x-1">
                              <Award className="w-4 h-4 text-gray-500" />
                              <span>{instructor.courseCount} {instructor.courseCount === 1 ? t('course') : tCommon('courses')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {instructor.bio ? (
                      <p className="text-gray-600 dark:text-gray-400">{instructor.bio}</p>
                    ) : (
                      <p className="text-gray-600 dark:text-gray-400">
                        {t('instructorDescription')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Course Features */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="w-5 h-5 mr-2 text-purple-600" />
                    {t('whatYoullLearn')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      t('learnItem1'),
                      t('learnItem2'),
                      t('learnItem3'),
                      t('learnItem4'),
                      t('learnItem5'),
                      t('learnItem6')
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <CheckCircle className="w-3 h-3 text-purple-600" />
                        </div>
                        <span className="text-gray-700 dark:text-gray-300 text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Award className="w-5 h-5 mr-2 text-orange-600" />
                    {t('enrollInThisCourse')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Pricing Options */}
                  {course.subscription_enabled && (course.subscription_type === 'both' || course.subscription_type === 'subscription') ? (
                    <div className="space-y-4">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('choosePaymentPlan')}</p>
                      <div className="space-y-3">
                        {(course.subscription_type === 'both' || course.subscription_type === 'one_time') && course.price !== null && (
                          <div 
                            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              paymentType === 'one_time' 
                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' 
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                            onClick={() => setPaymentType('one_time')}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-semibold text-gray-900 dark:text-white">{t('oneTimePayment')}</div>
                                <div className="text-2xl font-bold text-blue-600 mt-1">
                                  {course.price === 0 ? t('free') : `$${course.price}`}
                                </div>
                              </div>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                paymentType === 'one_time' ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                              }`}>
                                {paymentType === 'one_time' && <div className="w-3 h-3 rounded-full bg-white"></div>}
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{t('payOnceLifetimeAccess')}</p>
                          </div>
                        )}
                        
                        {course.monthly_price && course.monthly_price > 0 && (
                          <div 
                            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              paymentType === 'monthly' 
                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' 
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                            onClick={() => setPaymentType('monthly')}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                  {t('monthlySubscription')}
                                  <Badge variant="secondary" className="text-xs">{t('recurring')}</Badge>
                                </div>
                                <div className="text-2xl font-bold text-blue-600 mt-1">
                                  ${course.monthly_price}
                                  <span className="text-sm font-normal text-gray-500">/{t('month')}</span>
                                </div>
                              </div>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                paymentType === 'monthly' ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                              }`}>
                                {paymentType === 'monthly' && <div className="w-3 h-3 rounded-full bg-white"></div>}
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{t('billedMonthlyCancelAnytime')}</p>
                          </div>
                        )}
                        
                        {course.yearly_price && course.yearly_price > 0 && (
                          <div 
                            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              paymentType === 'yearly' 
                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' 
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                            onClick={() => setPaymentType('yearly')}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                  {t('yearlySubscription')}
                                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">{t('save17')}</Badge>
                                </div>
                                <div className="text-2xl font-bold text-blue-600 mt-1">
                                  ${course.yearly_price}
                                  <span className="text-sm font-normal text-gray-500">/{t('year')}</span>
                                </div>
                              </div>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                paymentType === 'yearly' ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                              }`}>
                                {paymentType === 'yearly' && <div className="w-3 h-3 rounded-full bg-white"></div>}
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{t('billedYearlyCancelAnytime')}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t('price')}</p>
                      <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {course.price === 0 ? t('free') : `$${course.price}`}
                      </div>
                    </div>
                  )}

                  {error && <ApiErrorHandler error={error} />}

                  {isEnrolled ? (
                    <Button
                      className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg hover:shadow-blue-600/30 text-white font-semibold group"
                      onClick={() => router.push(`/student/courses/${courseId}`)}
                    >
                      {t('goToCourse')}
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  ) : (
                    <Button
                      className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg hover:shadow-blue-600/30 text-white font-semibold group"
                      onClick={handleEnroll}
                      disabled={isEnrolling}
                    >
                      {isEnrolling ? (
                        <>
                          <LoadingSpinner />
                          <span className="ml-2">{t('processing')}</span>
                        </>
                      ) : (
                        <>
                          {t('enrollNow')}
                          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </Button>
                  )}

                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center space-x-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>{t('moneyBackGuarantee')}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Download className="w-4 h-4 text-blue-600" />
                      <span>{t('lifetimeAccess')}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Award className="w-4 h-4 text-purple-600" />
                      <span>{t('certificateOfCompletion')}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <MessageSquare className="w-4 h-4 text-orange-600" />
                      <span>{t('communitySupport')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    </div>
  )
}
