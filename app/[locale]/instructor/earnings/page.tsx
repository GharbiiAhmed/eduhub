import { createClient } from "@/lib/supabase/server"
import { redirect } from '@/i18n/routing'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Download,
  CreditCard,
  Banknote,
  PieChart,
  BarChart3,
  Target,
  Award,
  Clock,
  Users
} from "lucide-react"
import { Link } from '@/i18n/routing'
import { MonthlyEarningsChart } from "@/components/analytics/monthly-earnings-chart"
import { CourseRevenueChart } from "@/components/analytics/course-revenue-chart"
import { CircularProgress } from "@/components/analytics/circular-progress"
import { getTranslations } from 'next-intl/server'

export default async function InstructorEarningsPage() {
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

  // Fetch instructor's courses and earnings data
  const { data: courses } = await supabase
    .from("courses")
    .select(`
      id,
      title,
      price,
      status,
      created_at
    `)
    .eq("instructor_id", user.id)
    .order("created_at", { ascending: false })

  // Fetch payments for instructor's courses (using creator_earnings which is 80% of payment)
  const { data: coursePayments } = await supabase
    .from("payments")
    .select(`
      *,
      courses!inner(instructor_id, id, title)
    `)
    .eq("courses.instructor_id", user.id)
    .eq("status", "completed")
    .eq("payment_type", "course")

  // Fetch enrollments for student count
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(`
      *,
      courses!inner(instructor_id, price)
    `)
    .eq("courses.instructor_id", user.id)

  // Calculate earnings from actual payments (creator_earnings is 80% of payment)
  const totalEarnings = coursePayments?.reduce((sum, payment) => {
    return sum + (payment.creator_earnings || 0)
  }, 0) || 0

  const thisMonthEarnings = coursePayments?.filter(p => {
    const paymentDate = new Date(p.created_at)
    const now = new Date()
    return paymentDate.getMonth() === now.getMonth() && 
           paymentDate.getFullYear() === now.getFullYear()
  }).reduce((sum, payment) => {
    return sum + (payment.creator_earnings || 0)
  }, 0) || 0

  const lastMonthEarnings = coursePayments?.filter(p => {
    const paymentDate = new Date(p.created_at)
    const now = new Date()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1)
    return paymentDate.getMonth() === lastMonth.getMonth() && 
           paymentDate.getFullYear() === lastMonth.getFullYear()
  }).reduce((sum, payment) => {
    return sum + (payment.creator_earnings || 0)
  }, 0) || 0

  const monthlyGrowth = lastMonthEarnings > 0 ? 
    ((thisMonthEarnings - lastMonthEarnings) / lastMonthEarnings) * 100 : 0

  // Calculate earnings history from payments for last 6 months
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  
  const { data: historicalPayments } = await supabase
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
  const earningsHistoryMap = new Map<string, { earnings: number; students: number; courses: Set<string> }>()
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  
  historicalPayments?.forEach(payment => {
    const date = new Date(payment.created_at)
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`
    const course = payment.courses as any
    
    if (!earningsHistoryMap.has(monthKey)) {
      earningsHistoryMap.set(monthKey, { earnings: 0, students: 0, courses: new Set() })
    }
    
    const data = earningsHistoryMap.get(monthKey)!
    data.earnings += payment.creator_earnings || 0
    data.students += 1
    data.courses.add(course?.id)
  })

  // Format earnings history for the last 6 months
  const earningsHistory = Array.from({ length: 6 }, (_, i) => {
    const date = new Date()
    date.setMonth(date.getMonth() - (5 - i))
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`
    const data = earningsHistoryMap.get(monthKey) || { earnings: 0, students: 0, courses: new Set<string>() }
    
    return {
      month: months[date.getMonth()],
      year: date.getFullYear(),
      earnings: data.earnings,
      students: data.students,
      courses: data.courses.size
    }
  })

  // Calculate earnings targets and progress
  const averageMonthlyEarnings = earningsHistory.length > 0
    ? earningsHistory.reduce((sum, m) => sum + m.earnings, 0) / earningsHistory.length
    : 0
  const totalEarningsTarget = Math.max(averageMonthlyEarnings * 12, 10000) // Annual target
  const totalEarningsProgress = totalEarningsTarget > 0 ? (totalEarnings / totalEarningsTarget) * 100 : 0
  
  const thisMonthTarget = Math.max(averageMonthlyEarnings * 1.2, 1000)
  const thisMonthProgress = thisMonthTarget > 0 ? (thisMonthEarnings / thisMonthTarget) * 100 : 0

  const totalStudents = enrollments?.length || 0
  const avgCoursePrice = courses?.length ? Math.round(courses.reduce((sum, c) => sum + c.price, 0) / courses.length) : 0

  // Calculate top earning courses from actual payments
  const topEarningCourses = courses?.map(course => {
    const coursePaymentsForCourse = coursePayments?.filter(p => {
      const courseData = p.courses as any
      return courseData?.id === course.id
    }) || []
    const courseEarnings = coursePaymentsForCourse.reduce((sum, p) => sum + (p.creator_earnings || 0), 0)
    const courseEnrollments = enrollments?.filter(e => e.course_id === course.id) || []
    return {
      ...course,
      enrollments: courseEnrollments.length,
      earnings: courseEarnings
    }
  }).sort((a, b) => b.earnings - a.earnings).slice(0, 5) || []

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('earningsDashboard')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('trackCourseEarnings')}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" className="flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>{t('exportEarnings')}</span>
          </Button>
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <DollarSign className="w-3 h-3 mr-1" />
            {t('earnings')}
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
                value={totalEarningsProgress} 
                max={100}
                color="#10b981"
                label=""
                showValue={false}
                size={100}
                strokeWidth={6}
              />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">${totalEarnings.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalEarningsTarget > 0 && (
                  <span className="text-gray-500 block mb-1">
                    {Math.round(totalEarningsProgress)}% {t('ofTarget')} ${Math.round(totalEarningsTarget).toLocaleString()}
                  </span>
                )}
                <span className="text-gray-500">{t('allTimeEarnings')}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('thisMonth')}</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center mb-4">
              <CircularProgress 
                value={thisMonthProgress} 
                max={100}
                color="#3b82f6"
                label=""
                showValue={false}
                size={100}
                strokeWidth={6}
              />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">${thisMonthEarnings.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {thisMonthTarget > 0 && (
                  <span className="text-gray-500 block mb-1">
                    {Math.round(thisMonthProgress)}% {t('ofTarget')} ${Math.round(thisMonthTarget).toLocaleString()}
                  </span>
                )}
                {monthlyGrowth !== 0 && (
                  <span className={`${monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'} flex items-center justify-center`}>
                    {monthlyGrowth >= 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {monthlyGrowth >= 0 ? '+' : ''}{monthlyGrowth.toFixed(1)}% {t('fromLastMonth')}
                  </span>
                )}
                {monthlyGrowth === 0 && (
                  <span className="text-gray-500">{t('noChangeFromLastMonth')}</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalStudents')}</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center mb-4">
              <CircularProgress 
                value={totalStudents} 
                max={Math.max(totalStudents, 100)}
                color="#8b5cf6"
                label=""
                showValue={false}
                size={100}
                strokeWidth={6}
              />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{totalStudents}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-gray-500">{t('studentsEnrolled')}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('avgCoursePrice')}</CardTitle>
            <Banknote className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center mb-4">
              <CircularProgress 
                value={avgCoursePrice} 
                max={Math.max(avgCoursePrice, 100)}
                color="#f59e0b"
                label=""
                showValue={false}
                size={100}
                strokeWidth={6}
              />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">${avgCoursePrice}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-gray-500">{t('averagePricePerCourse')}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
        {/* Top Earning Courses Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="w-5 h-5 mr-2 text-yellow-600" />
              {t('topEarningCourses')}
            </CardTitle>
            <CardDescription>
              {t('revenueBreakdownByCourse')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topEarningCourses.length > 0 ? (
              <CourseRevenueChart data={topEarningCourses} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                {t('noCourseDataAvailable')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Earnings Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="w-5 h-5 mr-2 text-blue-600" />
              {t('earningsBreakdown')}
            </CardTitle>
            <CardDescription>
              {t('revenueDistributionByCourse')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topEarningCourses.map((course) => (
                <div key={course.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {course.title.length > 30 ? course.title.substring(0, 30) + '...' : course.title}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {totalEarnings > 0 ? Math.round((course.earnings / totalEarnings) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: totalEarnings > 0 ? `${(course.earnings / totalEarnings) * 100}%` : '0%' 
                      }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{course.enrollments} {t('students')}</span>
                    <span>${course.earnings.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Earnings History Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-green-600" />
            {t('monthlyEarningsHistory')}
          </CardTitle>
          <CardDescription>
            {t('earningsProgressionOverLast6Months')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {earningsHistory.length > 0 ? (
            <MonthlyEarningsChart data={earningsHistory} />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              {t('noEarningsDataAvailable')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="w-5 h-5 mr-2 text-purple-600" />
            {t('paymentInformation')}
          </CardTitle>
          <CardDescription>
            {t('managePaymentSettings')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{t('payoutMethod')}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {t('bankAccountEnding')}
                </p>
                <Button variant="outline" size="sm">
                  {t('updatePaymentMethod')}
                </Button>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{t('payoutSchedule')}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {t('monthlyPayouts')}
                </p>
                <Button variant="outline" size="sm">
                  {t('changeSchedule')}
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{t('nextPayout')}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  ${thisMonthEarnings.toLocaleString()} {t('onDec152024')}
                </p>
                <Button variant="outline" size="sm">
                  {t('viewDetails')}
                </Button>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{t('taxInformation')}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {t('downloadTaxDocuments')}
                </p>
                <Button variant="outline" size="sm">
                  {t('downloadForms')}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}