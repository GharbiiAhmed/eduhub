import { createClient } from "@/lib/supabase/server"
import { redirect } from '@/i18n/routing'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  BookOpen, 
  GraduationCap, 
  DollarSign,
  Eye,
  Clock,
  Star,
  Activity,
  Target,
  Zap,
  Calendar,
  Download,
  MessageSquare,
  Award,
  CheckCircle,
  TrendingDown
} from "lucide-react"
import { Link } from '@/i18n/routing'
import { MonthlyEarningsChart } from "@/components/analytics/monthly-earnings-chart"
import { StudentGrowthChart } from "@/components/analytics/student-growth-chart"
import { CourseRevenueChart } from "@/components/analytics/course-revenue-chart"
import { CircularProgress } from "@/components/analytics/circular-progress"
import { getTranslations } from 'next-intl/server'

export default async function InstructorAnalyticsPage() {
  const t = await getTranslations('profile')
  const tCommon = await getTranslations('common')

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check if user is instructor
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  
  if (profile?.role !== "instructor") {
    redirect("/dashboard")
  }

  // Fetch instructor's courses and analytics
  const { data: courses } = await supabase
    .from("courses")
    .select(`
      id,
      title,
      description,
      price,
      status,
      created_at,
      enrollments(count)
    `)
    .eq("instructor_id", user.id)
    .order("created_at", { ascending: false })

  // Fetch enrollments for instructor's courses (for student count)
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(`
      *,
      courses!inner(instructor_id)
    `)
    .eq("courses.instructor_id", user.id)

  // Fetch payments for instructor's courses (for revenue)
  const { data: coursePayments } = await supabase
    .from("payments")
    .select(`
      *,
      courses!inner(instructor_id, id)
    `)
    .eq("courses.instructor_id", user.id)
    .eq("status", "completed")
    .eq("payment_type", "course")

  // Calculate statistics
  const totalCourses = courses?.length || 0
  const publishedCourses = courses?.filter(c => c.status === 'published').length || 0
  const draftCourses = courses?.filter(c => c.status === 'draft').length || 0
  const totalStudents = enrollments?.length || 0
  
  // Calculate total revenue from actual payments (creator_earnings is 80% of payment)
  const totalRevenue = coursePayments?.reduce((sum, payment) => {
    return sum + (payment.creator_earnings || 0)
  }, 0) || 0

  // Calculate average rating from course_analytics
  const { data: courseAnalytics } = await supabase
    .from("course_analytics")
    .select("average_rating, completion_rate")
    .in("course_id", courses?.map(c => c.id) || [])

  const averageRating = courseAnalytics && courseAnalytics.length > 0
    ? courseAnalytics.reduce((sum, analytics) => sum + (analytics.average_rating || 0), 0) / courseAnalytics.length
    : 0

  const completionRate = courseAnalytics && courseAnalytics.length > 0
    ? courseAnalytics.reduce((sum, analytics) => sum + (analytics.completion_rate || 0), 0) / courseAnalytics.length
    : 0

  // Calculate monthly earnings from payments
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  
  const { data: monthlyPayments } = await supabase
    .from("payments")
    .select(`
      created_at,
      creator_earnings,
      courses!inner(id, instructor_id)
    `)
    .eq("courses.instructor_id", user.id)
    .eq("status", "completed")
    .eq("payment_type", "course")
    .gte("created_at", sixMonthsAgo.toISOString())

  // Group payments by month
  const monthlyEarningsMap = new Map<string, { earnings: number; students: number }>()
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  
  monthlyPayments?.forEach(payment => {
    const date = new Date(payment.created_at)
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`
    
    if (!monthlyEarningsMap.has(monthKey)) {
      monthlyEarningsMap.set(monthKey, { earnings: 0, students: 0 })
    }
    
    const data = monthlyEarningsMap.get(monthKey)!
    data.earnings += payment.creator_earnings || 0
    data.students += 1
  })

  // Format monthly earnings for the last 6 months
  const monthlyEarnings = Array.from({ length: 6 }, (_, i) => {
    const date = new Date()
    date.setMonth(date.getMonth() - (5 - i))
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`
    const data = monthlyEarningsMap.get(monthKey) || { earnings: 0, students: 0 }
    
    return {
      month: months[date.getMonth()],
      year: date.getFullYear(),
      earnings: data.earnings,
      students: data.students
    }
  })

  // Calculate top courses with actual payment revenue
  const topCourses = courses?.slice(0, 5).map(course => {
    const coursePaymentsForCourse = coursePayments?.filter(p => {
      const courseData = p.courses as any
      return courseData?.id === course.id
    }) || []
    const courseRevenue = coursePaymentsForCourse.reduce((sum, p) => sum + (p.creator_earnings || 0), 0)
    return {
      ...course,
      enrollments: enrollments?.filter(e => e.course_id === course.id).length || 0,
      revenue: courseRevenue
    }
  }) || []

  // Calculate month-over-month growth
  const currentMonthEarnings = monthlyEarnings[monthlyEarnings.length - 1]?.earnings || 0
  const previousMonthEarnings = monthlyEarnings[monthlyEarnings.length - 2]?.earnings || 0
  const earningsGrowth = previousMonthEarnings > 0 
    ? ((currentMonthEarnings - previousMonthEarnings) / previousMonthEarnings) * 100 
    : 0

  const currentMonthStudents = monthlyEarnings[monthlyEarnings.length - 1]?.students || 0
  const previousMonthStudents = monthlyEarnings[monthlyEarnings.length - 2]?.students || 0
  const studentsGrowth = previousMonthStudents > 0 
    ? ((currentMonthStudents - previousMonthStudents) / previousMonthStudents) * 100 
    : 0

  // Calculate earnings target (average of last 6 months * 1.2 for growth target)
  const averageMonthlyEarnings = monthlyEarnings.length > 0
    ? monthlyEarnings.reduce((sum, m) => sum + m.earnings, 0) / monthlyEarnings.length
    : 0
  const earningsTarget = Math.max(averageMonthlyEarnings * 1.2, 1000) // At least $1000 target
  const earningsProgress = earningsTarget > 0 ? (totalRevenue / earningsTarget) * 100 : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('instructorAnalytics')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('trackTeachingPerformance')}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" className="flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>{t('exportReport')}</span>
          </Button>
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <BarChart3 className="w-3 h-3 mr-1" />
            {t('instructor')}
          </Badge>
        </div>
      </div>

      {/* Key Metrics with Circular Progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalEarnings')}</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center mb-4">
              <CircularProgress 
                value={earningsProgress} 
                max={100}
                color="#10b981"
                label=""
                showValue={false}
                size={100}
                strokeWidth={6}
              />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {earningsTarget > 0 && (
                  <span className="text-gray-500 block mb-1">
                    {Math.round(earningsProgress)}% {t('ofTarget')} ${Math.round(earningsTarget).toLocaleString()}
                  </span>
                )}
                {earningsGrowth !== 0 && (
                  <span className={`${earningsGrowth >= 0 ? 'text-green-600' : 'text-red-600'} flex items-center justify-center`}>
                    {earningsGrowth >= 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {earningsGrowth >= 0 ? '+' : ''}{earningsGrowth.toFixed(1)}% {t('fromLastMonth')}
                  </span>
                )}
                {earningsGrowth === 0 && earningsTarget === 0 && (
                  <span className="text-gray-500">{t('noChangeFromLastMonth')}</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalStudents')}</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center mb-4">
              <CircularProgress 
                value={totalStudents} 
                max={Math.max(totalStudents, 100)}
                color="#3b82f6"
                label=""
                showValue={false}
                size={100}
                strokeWidth={6}
              />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{totalStudents}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {studentsGrowth !== 0 && (
                  <span className={`${studentsGrowth >= 0 ? 'text-green-600' : 'text-red-600'} flex items-center justify-center`}>
                    {studentsGrowth >= 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {studentsGrowth >= 0 ? '+' : ''}{studentsGrowth.toFixed(1)}% {t('fromLastMonth')}
                  </span>
                )}
                {studentsGrowth === 0 && (
                  <span className="text-gray-500">{t('noChangeFromLastMonth')}</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('courseRating')}</CardTitle>
            <Star className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center mb-4">
              <CircularProgress 
                value={averageRating} 
                max={5}
                color="#f59e0b"
                label=""
                showValue={false}
                size={100}
                strokeWidth={6}
              />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{averageRating > 0 ? averageRating.toFixed(1) : 'N/A'}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {averageRating > 0 ? (
                  <span className="text-gray-500">{t('averageAcrossAllCourses')}</span>
                ) : (
                  <span className="text-gray-500">{t('noRatingsYet')}</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('completionRate')}</CardTitle>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center mb-4">
              <CircularProgress 
                value={completionRate} 
                max={100}
                color="#8b5cf6"
                label=""
                showValue={false}
                size={100}
                strokeWidth={6}
              />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{Math.round(completionRate)}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-gray-500">{t('averageCompletionRate')}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Course Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <GraduationCap className="w-5 h-5 mr-2 text-blue-600" />
              {t('topCoursesByRevenue')}
            </CardTitle>
            <CardDescription>
              {t('revenueBreakdownByCourse')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topCourses.length > 0 ? (
              <CourseRevenueChart data={topCourses} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                {t('noCourseDataAvailable')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Student Engagement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2 text-green-600" />
              {t('studentEngagement')}
            </CardTitle>
            <CardDescription>
              {t('keyEngagementMetrics')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <CircularProgress 
                value={completionRate} 
                max={100}
                color="#10b981"
                label={t('completion')}
                showValue={true}
              />
              <CircularProgress 
                value={averageRating} 
                max={5}
                color="#f59e0b"
                label={t('rating')}
                showValue={true}
              />
              <CircularProgress 
                value={totalStudents > 0 ? Math.round((totalStudents / Math.max(totalStudents, 100)) * 100) : 0} 
                max={100}
                color="#3b82f6"
                label={t('students')}
                showValue={false}
              />
            </div>
            <div className="mt-6 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{t('courseCompletion')}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{Math.round(completionRate)}%</span>
                </div>
                <Progress value={Math.round(completionRate)} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{t('studentSatisfaction')}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{averageRating > 0 ? `${averageRating.toFixed(1)}/5` : 'N/A'}</span>
                </div>
                <Progress value={averageRating > 0 ? (averageRating / 5) * 100 : 0} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Earnings & Student Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
              {t('monthlyEarnings')}
            </CardTitle>
            <CardDescription>
              {t('earningsOverLast6Months')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyEarnings.length > 0 ? (
              <MonthlyEarningsChart data={monthlyEarnings} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                {t('noEarningsDataAvailable')}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2 text-blue-600" />
              {t('studentGrowth')}
            </CardTitle>
            <CardDescription>
              {t('newStudentEnrollmentsOverTime')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyEarnings.length > 0 ? (
              <StudentGrowthChart data={monthlyEarnings} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                {t('noStudentDataAvailable')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Course Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="w-5 h-5 mr-2 text-purple-600" />
            {t('courseStatusOverview')}
          </CardTitle>
          <CardDescription>
            {t('summaryOfYourCoursePortfolio')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{publishedCourses}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{t('publishedCourses')}</div>
            </div>
            <div className="text-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{draftCourses}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{t('draftCourses')}</div>
            </div>
            <div className="text-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <Award className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalCourses}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{t('totalCourses')}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


