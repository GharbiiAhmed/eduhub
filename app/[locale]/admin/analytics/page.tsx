import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { redirect } from '@/i18n/routing'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
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
  CheckCircle,
  Rocket,
  Sparkles
} from "lucide-react"
import { Link } from '@/i18n/routing'
import { MonthlyEarningsChart } from "@/components/analytics/monthly-earnings-chart"
import { UserGrowthChart } from "@/components/analytics/user-growth-chart"
import { CourseRevenueChart } from "@/components/analytics/course-revenue-chart"
import { RevenueBreakdownChart } from "@/components/analytics/revenue-breakdown-chart"
import { UserDistributionChart } from "@/components/analytics/user-distribution-chart"
import { CircularProgress } from "@/components/analytics/circular-progress"
import { getTranslations } from 'next-intl/server'

export default async function AdminAnalyticsPage() {
  const t = await getTranslations('dashboard')
  const tCommon = await getTranslations('common')

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check if user is admin
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  
  if (profile?.role !== "admin") {
    redirect("/dashboard")
  }

  // Use service role client if available to bypass RLS for admin queries
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseAdmin = serviceRoleKey
    ? createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey
      )
    : supabase

  // Fetch analytics data
  const [
    { data: users },
    { data: courses },
    { data: enrollments },
    { data: books },
    { data: bookPurchases }
  ] = await Promise.all([
    supabase.from("profiles").select("id, role, created_at").order("created_at", { ascending: false }),
    supabaseAdmin.from("courses").select("id, title, price, status, created_at").order("created_at", { ascending: false }), // Use admin client to bypass RLS
    supabaseAdmin.from("enrollments").select("id, course_id, created_at"), // Use admin client to bypass RLS
    supabase.from("books").select("id, title, price, created_at").order("created_at", { ascending: false }),
    supabase.from("book_purchases").select("id, book_id, created_at")
  ])

  // Calculate statistics
  const totalUsers = users?.length || 0
  const totalCourses = courses?.length || 0
  const totalEnrollments = enrollments?.length || 0
  const totalBooks = books?.length || 0
  const totalBookPurchases = bookPurchases?.length || 0
  
  const students = users?.filter(u => u.role === 'student').length || 0
  const instructors = users?.filter(u => u.role === 'instructor').length || 0
  
  const publishedCourses = courses?.filter(c => c.status === 'published').length || 0
  const draftCourses = courses?.filter(c => c.status === 'draft').length || 0
  
  // Fetch all payments to calculate platform commission (20% of all payments)
  const { data: allPayments } = await supabaseAdmin
    .from("payments")
    .select("amount, platform_commission, creator_earnings, payment_type, created_at")
    .eq("status", "completed")

  // Calculate platform commission (20% of all payments) - this is what the admin earns
  const totalPlatformCommission = allPayments?.reduce((sum, payment) => {
    return sum + (payment.platform_commission || 0)
  }, 0) || 0

  // Calculate total creator earnings (80% of all payments)
  const totalCreatorEarnings = allPayments?.reduce((sum, payment) => {
    return sum + (payment.creator_earnings || 0)
  }, 0) || 0

  // Calculate total revenue (for reference - this is the sum of all payments)
  const totalRevenue = allPayments?.reduce((sum, payment) => {
    return sum + (payment.amount || 0)
  }, 0) || 0

  // Breakdown by payment type
  const coursePayments = allPayments?.filter(p => p.payment_type === 'course') || []
  const bookPayments = allPayments?.filter(p => p.payment_type === 'book') || []
  
  const courseRevenue = coursePayments.reduce((sum, p) => sum + (p.amount || 0), 0)
  const bookRevenue = bookPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
  
  const courseCommission = coursePayments.reduce((sum, p) => sum + (p.platform_commission || 0), 0)
  const bookCommission = bookPayments.reduce((sum, p) => sum + (p.platform_commission || 0), 0)

  // For backward compatibility, use platform commission as totalPlatformRevenue
  const totalPlatformRevenue = totalPlatformCommission

  // Calculate monthly data from last 6 months
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  
  // Get monthly payments for platform commission calculation
  const { data: monthlyPayments } = await supabaseAdmin
    .from("payments")
    .select("created_at, platform_commission, amount")
    .eq("status", "completed")
    .gte("created_at", sixMonthsAgo.toISOString())

  // Get all users created in last 6 months with roles
  const { data: monthlyUsers } = await supabase
    .from("profiles")
    .select("created_at, role")
    .gte("created_at", sixMonthsAgo.toISOString())

  // Get all courses created in last 6 months
  const { data: monthlyCourses } = await supabase
    .from("courses")
    .select("created_at")
    .gte("created_at", sixMonthsAgo.toISOString())

  // Group data by month
  const monthlyDataMap = new Map<string, { users: number; courses: number; revenue: number }>()
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  
  // Group payments by month (platform commission is what admin earns)
  monthlyPayments?.forEach(payment => {
    const date = new Date(payment.created_at)
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`
    
    if (!monthlyDataMap.has(monthKey)) {
      monthlyDataMap.set(monthKey, { users: 0, courses: 0, revenue: 0 })
    }
    
    const data = monthlyDataMap.get(monthKey)!
    // Use platform_commission (20% of payment) as revenue for admin
    data.revenue += payment.platform_commission || 0
  })

  // Group users
  monthlyUsers?.forEach(user => {
    const date = new Date(user.created_at)
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`
    
    if (!monthlyDataMap.has(monthKey)) {
      monthlyDataMap.set(monthKey, { users: 0, courses: 0, revenue: 0 })
    }
    
    monthlyDataMap.get(monthKey)!.users += 1
  })

  // Group courses
  monthlyCourses?.forEach(course => {
    const date = new Date(course.created_at)
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`
    
    if (!monthlyDataMap.has(monthKey)) {
      monthlyDataMap.set(monthKey, { users: 0, courses: 0, revenue: 0 })
    }
    
    monthlyDataMap.get(monthKey)!.courses += 1
  })

  // Format monthly data for the last 6 months
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = new Date()
    date.setMonth(date.getMonth() - (5 - i))
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`
    const data = monthlyDataMap.get(monthKey) || { users: 0, courses: 0, revenue: 0 }
    
    // Count students from monthly users
    const monthStudents = monthlyUsers?.filter(u => {
      const userDate = new Date(u.created_at)
      return userDate.getFullYear() === date.getFullYear() && 
             userDate.getMonth() === date.getMonth() &&
             u.role === 'student'
    }).length || 0
    
    return {
      month: months[date.getMonth()],
      year: date.getFullYear(),
      users: data.users,
      courses: data.courses,
      revenue: data.revenue,
      earnings: data.revenue, // For compatibility with MonthlyEarningsChart
      students: monthStudents
    }
  })

  // Calculate month-over-month growth
  const currentMonthRevenue = monthlyData[monthlyData.length - 1]?.revenue || 0
  const previousMonthRevenue = monthlyData[monthlyData.length - 2]?.revenue || 0
  const revenueGrowth = previousMonthRevenue > 0 
    ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 
    : (currentMonthRevenue > 0 ? 100 : 0)

  const currentMonthUsers = monthlyData[monthlyData.length - 1]?.users || 0
  const previousMonthUsers = monthlyData[monthlyData.length - 2]?.users || 0
  const usersGrowth = previousMonthUsers > 0 
    ? ((currentMonthUsers - previousMonthUsers) / previousMonthUsers) * 100 
    : (currentMonthUsers > 0 ? 100 : 0)

  const currentMonthEnrollments = monthlyData[monthlyData.length - 1]?.courses || 0
  const previousMonthEnrollments = monthlyData[monthlyData.length - 2]?.courses || 0
  const enrollmentsGrowth = previousMonthEnrollments > 0 
    ? ((currentMonthEnrollments - previousMonthEnrollments) / previousMonthEnrollments) * 100 
    : (currentMonthEnrollments > 0 ? 100 : 0)

  // Calculate targets and progress
  const averageMonthlyRevenue = monthlyData.length > 0
    ? monthlyData.reduce((sum, m) => sum + m.revenue, 0) / monthlyData.length
    : 0
  const revenueTarget = Math.max(averageMonthlyRevenue * 12, 100000) // Annual target
  const revenueProgress = revenueTarget > 0 ? (totalPlatformRevenue / revenueTarget) * 100 : 0

  // User distribution data
  const admins = users?.filter(u => u.role === 'admin').length || 0
  const userDistribution = [
    { role: 'Students', count: students, percentage: totalUsers > 0 ? Math.round((students / totalUsers) * 100) : 0 },
    { role: 'Instructors', count: instructors, percentage: totalUsers > 0 ? Math.round((instructors / totalUsers) * 100) : 0 },
    { role: 'Admins', count: admins, percentage: totalUsers > 0 ? Math.round((admins / totalUsers) * 100) : 0 }
  ]

  // Revenue breakdown data - show platform commission by type
  const revenueBreakdown = [
    { name: t('courseSales'), value: courseCommission, color: '#3b82f6' },
    { name: t('bookSales'), value: bookCommission, color: '#8b5cf6' }
  ]

  // Calculate top courses with real enrollments and revenue - use admin client to bypass RLS
  const allCoursesWithRevenue = await Promise.all(
    (courses || []).map(async (course) => {
      const { count: enrollmentCount } = await supabaseAdmin
        .from("enrollments")
        .select("*", { count: "exact", head: true })
        .eq("course_id", course.id)

      return {
        ...course,
        enrollments: enrollmentCount || 0,
        revenue: (enrollmentCount || 0) * course.price
      }
    })
  ) || []

  // Sort by revenue and take top 5
  const topCourses = allCoursesWithRevenue
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      {/* Header with Gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-4 sm:p-6 md:p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                {t('platformAnalytics')}
              </h1>
            </div>
            <p className="text-indigo-100 text-sm sm:text-base md:text-lg">
              {t('comprehensiveInsightsIntoPlatform')}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" className="flex items-center space-x-2 bg-white/20 text-white border-white/30 backdrop-blur-sm hover:bg-white/30">
              <Download className="w-4 h-4" />
              <span>{t('exportReport')}</span>
            </Button>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
              <Sparkles className="w-3 h-3 mr-1" />
              {t('analytics')}
            </Badge>
          </div>
        </div>
      </div>

      {/* Key Metrics with Circular Progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="relative overflow-hidden border-2 border-green-200 dark:border-green-800 hover:shadow-xl hover:scale-105 transition-all duration-300 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-400/20 rounded-full blur-3xl"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">{t('platformCommission')}</CardTitle>
            <div className="p-2 bg-green-500 rounded-lg shadow-lg">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="flex items-center justify-center mb-2 sm:mb-4">
              <div className="w-20 h-20 sm:w-[100px] sm:h-[100px]">
                <CircularProgress 
                  value={revenueProgress} 
                  max={100}
                  color="#10b981"
                  label=""
                  showValue={false}
                  size={80}
                  strokeWidth={6}
                />
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">${totalPlatformRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-2">
                {revenueTarget > 0 && (
                  <span className="text-gray-500 block mb-1">
                    {Math.round(revenueProgress)}% {t('ofTarget')} ${Math.round(revenueTarget).toLocaleString()}
                  </span>
                )}
                {revenueGrowth !== 0 && (
                  <span className={`${revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'} flex items-center justify-center`}>
                    {revenueGrowth >= 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {revenueGrowth >= 0 ? '+' : ''}{revenueGrowth.toFixed(1)}% {t('fromLastMonth')}
                  </span>
                )}
                {revenueGrowth === 0 && (
                  <span className="text-gray-500">{t('noChangeFromLastMonth')}</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 border-blue-200 dark:border-blue-800 hover:shadow-xl hover:scale-105 transition-all duration-300 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/20 rounded-full blur-3xl"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">{t('totalUsers')}</CardTitle>
            <div className="p-2 bg-blue-500 rounded-lg shadow-lg">
              <Users className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="flex items-center justify-center mb-2 sm:mb-4">
              <div className="w-20 h-20 sm:w-[100px] sm:h-[100px]">
                <CircularProgress 
                  value={totalUsers} 
                  max={Math.max(totalUsers, 1000)}
                  color="#3b82f6"
                  label=""
                  showValue={false}
                  size={80}
                  strokeWidth={6}
                />
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">{totalUsers}</div>
              <p className="text-xs text-muted-foreground mt-2">
                {usersGrowth !== 0 && (
                  <span className={`${usersGrowth >= 0 ? 'text-green-600' : 'text-red-600'} flex items-center justify-center`}>
                    {usersGrowth >= 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {usersGrowth >= 0 ? '+' : ''}{usersGrowth.toFixed(1)}% {t('fromLastMonth')}
                  </span>
                )}
                {usersGrowth === 0 && (
                  <span className="text-gray-500">{t('noChangeFromLastMonth')}</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 border-purple-200 dark:border-purple-800 hover:shadow-xl hover:scale-105 transition-all duration-300 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-400/20 rounded-full blur-3xl"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">{t('courseEnrollments')}</CardTitle>
            <div className="p-2 bg-purple-500 rounded-lg shadow-lg">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="flex items-center justify-center mb-2 sm:mb-4">
              <div className="w-20 h-20 sm:w-[100px] sm:h-[100px]">
                <CircularProgress 
                  value={totalEnrollments} 
                  max={Math.max(totalEnrollments, 500)}
                  color="#8b5cf6"
                  label=""
                  showValue={false}
                  size={80}
                  strokeWidth={6}
                />
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">{totalEnrollments}</div>
              <p className="text-xs text-muted-foreground mt-2">
                {enrollmentsGrowth !== 0 && (
                  <span className={`${enrollmentsGrowth >= 0 ? 'text-green-600' : 'text-red-600'} flex items-center justify-center`}>
                    {enrollmentsGrowth >= 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {enrollmentsGrowth >= 0 ? '+' : ''}{enrollmentsGrowth.toFixed(1)}% {t('fromLastMonth')}
                  </span>
                )}
                {enrollmentsGrowth === 0 && (
                  <span className="text-gray-500">{t('noChangeFromLastMonth')}</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 border-orange-200 dark:border-orange-800 hover:shadow-xl hover:scale-105 transition-all duration-300 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-400/20 rounded-full blur-3xl"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">{t('platformHealth')}</CardTitle>
            <div className="p-2 bg-orange-500 rounded-lg shadow-lg">
              <Activity className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="flex items-center justify-center mb-2 sm:mb-4">
              <div className="w-20 h-20 sm:w-[100px] sm:h-[100px]">
                <CircularProgress 
                  value={100} 
                  max={100}
                  color="#10b981"
                  label=""
                  showValue={false}
                  size={80}
                  strokeWidth={6}
                />
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">100%</div>
              <p className="text-xs text-muted-foreground mt-2">
                <span className="text-green-600 flex items-center justify-center">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {t('platformOperational')}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
        {/* Commission Breakdown */}
        <Card className="border-2 border-blue-200 dark:border-blue-800 hover:shadow-xl transition-shadow bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center text-lg">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg mr-3 shadow-lg">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              {t('commissionBreakdown')}
            </CardTitle>
            <CardDescription className="mt-1">
              {t('commissionBreakdownDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 sm:pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <div className="p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('totalRevenue')}</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">${totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">{t('allPaymentsReceived')}</p>
              </div>
              <div className="p-3 sm:p-4 bg-green-50 dark:bg-green-950 rounded-lg border-2 border-green-200 dark:border-green-800">
                <p className="text-sm text-green-700 dark:text-green-300 mb-1">{t('platformCommissionYou')}</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">${totalPlatformCommission.toLocaleString()}</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">{t('twentyPercentOfAllPayments')}</p>
              </div>
              <div className="p-3 sm:p-4 bg-purple-50 dark:bg-purple-950 rounded-lg border-2 border-purple-200 dark:border-purple-800">
                <p className="text-sm text-purple-700 dark:text-purple-300 mb-1">{t('creatorEarnings')}</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">${totalCreatorEarnings.toLocaleString()}</p>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">{t('eightyPercentToInstructors')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Breakdown Chart */}
        <Card className="border-2 hover:shadow-xl transition-shadow">
          <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 border-b">
            <CardTitle className="flex items-center text-lg">
              <div className="p-2 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg mr-3 shadow-lg">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              {t('commissionByType')}
            </CardTitle>
            <CardDescription className="mt-1">
              {t('commissionBreakdownByType')}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 sm:pt-6">
            {revenueBreakdown.length > 0 ? (
              <>
                <RevenueBreakdownChart 
                  data={revenueBreakdown} 
                  noRevenueText={t('noRevenueGeneratedYet')}
                  revenueWillAppearText={t('revenueWillAppearHere')}
                />
                <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3">
                  {revenueBreakdown.map((item, index) => (
                    <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:shadow-md transition-all">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        ></div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{item.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {totalPlatformRevenue > 0 ? Math.round((item.value / totalPlatformRevenue) * 100) : 0}% {t('ofTotal')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">${item.value.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-gray-500">
                <p>{t('noRevenueGeneratedYet')}</p>
                <p className="text-sm mt-2">{t('revenueWillAppearHere')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Distribution Chart */}
        <Card className="border-2 hover:shadow-xl transition-shadow">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-b">
            <CardTitle className="flex items-center text-lg">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg mr-3 shadow-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              {t('userDistribution')}
            </CardTitle>
            <CardDescription className="mt-1">
              {t('breakdownOfUserRolesAndActivity')}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 sm:pt-6">
            {userDistribution.length > 0 ? (
              <>
                <UserDistributionChart data={userDistribution} />
                <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3">
                  {userDistribution.map((item, index) => (
                    <div key={index}>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                        <span className="text-sm font-medium">{item.role}</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {item.count} ({item.percentage}%)
                        </span>
                      </div>
                      <Progress value={item.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                {t('noUserDataAvailable')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Courses Chart */}
      <Card className="border-2 hover:shadow-xl transition-shadow">
        <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950 border-b">
          <CardTitle className="flex items-center text-lg">
            <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg mr-3 shadow-lg">
              <Star className="w-5 h-5 text-white" />
            </div>
            {t('topPerformingCourses')}
          </CardTitle>
          <CardDescription className="mt-1">
            {t('coursesWithHighestEnrollmentsAndRevenue')}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 sm:pt-6">
          {topCourses.length > 0 ? (
            <CourseRevenueChart data={topCourses} />
          ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                {t('noCourseDataAvailable')}
              </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Growth Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
        <Card className="border-2 hover:shadow-xl transition-shadow">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-b">
            <CardTitle className="flex items-center text-lg">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg mr-3 shadow-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              {t('monthlyRevenue')}
            </CardTitle>
            <CardDescription className="mt-1">
              {t('platformRevenueOverLast6Months')}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 sm:pt-6">
            {monthlyData.length > 0 ? (
              <MonthlyEarningsChart data={monthlyData} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                {t('noRevenueDataAvailable')}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 hover:shadow-xl transition-shadow">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-b">
            <CardTitle className="flex items-center text-lg">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg mr-3 shadow-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              {t('userCourseGrowth')}
            </CardTitle>
            <CardDescription className="mt-1">
              {t('newUsersAndCoursesOverTime')}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 sm:pt-6">
            {monthlyData.length > 0 ? (
              <UserGrowthChart data={monthlyData} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                {t('noGrowthDataAvailable')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}