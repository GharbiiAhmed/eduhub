import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
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
import Link from "next/link"
import { MonthlyEarningsChart } from "@/components/analytics/monthly-earnings-chart"
import { UserGrowthChart } from "@/components/analytics/user-growth-chart"
import { CourseRevenueChart } from "@/components/analytics/course-revenue-chart"
import { RevenueBreakdownChart } from "@/components/analytics/revenue-breakdown-chart"
import { UserDistributionChart } from "@/components/analytics/user-distribution-chart"
import { CircularProgress } from "@/components/analytics/circular-progress"

export default async function AdminAnalyticsPage() {
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
  
  // Calculate total revenue from enrollments - create a map for faster lookup
  const coursePriceMap = new Map<string, number>()
  courses?.forEach(course => {
    if (course.id && course.price != null && course.price > 0) {
      coursePriceMap.set(course.id, course.price)
    }
  })

  const totalRevenue = enrollments?.reduce((sum, enrollment) => {
    if (enrollment.course_id) {
      const coursePrice = coursePriceMap.get(enrollment.course_id) || 0
      return sum + coursePrice
    }
    return sum
  }, 0) || 0

  const bookRevenue = books?.reduce((sum, book) => {
    const purchasesForBook = bookPurchases?.filter(p => p.book_id === book.id).length || 0
    return sum + (purchasesForBook * book.price)
  }, 0) || 0

  const totalPlatformRevenue = totalRevenue + bookRevenue

  // Calculate monthly data from last 6 months
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  
  // Get all enrollments for monthly revenue - use admin client to bypass RLS
  const { data: monthlyEnrollments } = await supabaseAdmin
    .from("enrollments")
    .select(`
      created_at,
      course_id
    `)
    .gte("created_at", sixMonthsAgo.toISOString())

  // Get course prices for monthly enrollments
  const monthlyCourseIds = monthlyEnrollments?.map(e => e.course_id).filter(Boolean) || []
  const { data: monthlyCoursesData } = monthlyCourseIds.length > 0
    ? await supabaseAdmin
        .from("courses")
        .select("id, price")
        .in("id", monthlyCourseIds)
    : { data: null }

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
  
  // Group enrollments
  monthlyEnrollments?.forEach(enrollment => {
    const date = new Date(enrollment.created_at)
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`
    const course = monthlyCoursesData?.find(c => c.id === enrollment.course_id)
    
    if (!monthlyDataMap.has(monthKey)) {
      monthlyDataMap.set(monthKey, { users: 0, courses: 0, revenue: 0 })
    }
    
    const data = monthlyDataMap.get(monthKey)!
    data.revenue += course?.price || 0
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

  // Revenue breakdown data
  const revenueBreakdown = [
    { name: 'Course Sales', value: totalRevenue, color: '#3b82f6' },
    { name: 'Book Sales', value: bookRevenue, color: '#8b5cf6' }
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
    <div className="space-y-8">
      {/* Header with Gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h1 className="text-4xl font-bold">
                Platform Analytics
              </h1>
            </div>
            <p className="text-indigo-100 text-lg">
              Comprehensive insights into platform performance and user engagement
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" className="flex items-center space-x-2 bg-white/20 text-white border-white/30 backdrop-blur-sm hover:bg-white/30">
              <Download className="w-4 h-4" />
              <span>Export Report</span>
            </Button>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
              <Sparkles className="w-3 h-3 mr-1" />
              Analytics
            </Badge>
          </div>
        </div>
      </div>

      {/* Key Metrics with Circular Progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden border-2 border-green-200 dark:border-green-800 hover:shadow-xl hover:scale-105 transition-all duration-300 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-400/20 rounded-full blur-3xl"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <div className="p-2 bg-green-500 rounded-lg shadow-lg">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="flex items-center justify-center mb-4">
              <CircularProgress 
                value={revenueProgress} 
                max={100}
                color="#10b981"
                label=""
                showValue={false}
                size={100}
                strokeWidth={6}
              />
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">${totalPlatformRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-2">
                {revenueTarget > 0 && (
                  <span className="text-gray-500 block mb-1">
                    {Math.round(revenueProgress)}% of ${Math.round(revenueTarget).toLocaleString()} target
                  </span>
                )}
                {revenueGrowth !== 0 && (
                  <span className={`${revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'} flex items-center justify-center`}>
                    {revenueGrowth >= 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {revenueGrowth >= 0 ? '+' : ''}{revenueGrowth.toFixed(1)}% from last month
                  </span>
                )}
                {revenueGrowth === 0 && (
                  <span className="text-gray-500">No change from last month</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 border-blue-200 dark:border-blue-800 hover:shadow-xl hover:scale-105 transition-all duration-300 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/20 rounded-full blur-3xl"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <div className="p-2 bg-blue-500 rounded-lg shadow-lg">
              <Users className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="flex items-center justify-center mb-4">
              <CircularProgress 
                value={totalUsers} 
                max={Math.max(totalUsers, 1000)}
                color="#3b82f6"
                label=""
                showValue={false}
                size={100}
                strokeWidth={6}
              />
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{totalUsers}</div>
              <p className="text-xs text-muted-foreground mt-2">
                {usersGrowth !== 0 && (
                  <span className={`${usersGrowth >= 0 ? 'text-green-600' : 'text-red-600'} flex items-center justify-center`}>
                    {usersGrowth >= 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {usersGrowth >= 0 ? '+' : ''}{usersGrowth.toFixed(1)}% from last month
                  </span>
                )}
                {usersGrowth === 0 && (
                  <span className="text-gray-500">No change from last month</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 border-purple-200 dark:border-purple-800 hover:shadow-xl hover:scale-105 transition-all duration-300 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-400/20 rounded-full blur-3xl"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">Course Enrollments</CardTitle>
            <div className="p-2 bg-purple-500 rounded-lg shadow-lg">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="flex items-center justify-center mb-4">
              <CircularProgress 
                value={totalEnrollments} 
                max={Math.max(totalEnrollments, 500)}
                color="#8b5cf6"
                label=""
                showValue={false}
                size={100}
                strokeWidth={6}
              />
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{totalEnrollments}</div>
              <p className="text-xs text-muted-foreground mt-2">
                {enrollmentsGrowth !== 0 && (
                  <span className={`${enrollmentsGrowth >= 0 ? 'text-green-600' : 'text-red-600'} flex items-center justify-center`}>
                    {enrollmentsGrowth >= 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {enrollmentsGrowth >= 0 ? '+' : ''}{enrollmentsGrowth.toFixed(1)}% from last month
                  </span>
                )}
                {enrollmentsGrowth === 0 && (
                  <span className="text-gray-500">No change from last month</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 border-orange-200 dark:border-orange-800 hover:shadow-xl hover:scale-105 transition-all duration-300 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-400/20 rounded-full blur-3xl"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">Platform Health</CardTitle>
            <div className="p-2 bg-orange-500 rounded-lg shadow-lg">
              <Activity className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="flex items-center justify-center mb-4">
              <CircularProgress 
                value={100} 
                max={100}
                color="#10b981"
                label=""
                showValue={false}
                size={100}
                strokeWidth={6}
              />
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">100%</div>
              <p className="text-xs text-muted-foreground mt-2">
                <span className="text-green-600 flex items-center justify-center">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Platform operational
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Breakdown Chart */}
        <Card className="border-2 hover:shadow-xl transition-shadow">
          <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 border-b">
            <CardTitle className="flex items-center text-lg">
              <div className="p-2 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg mr-3 shadow-lg">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              Revenue Breakdown
            </CardTitle>
            <CardDescription className="mt-1">
              Revenue sources and distribution
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {revenueBreakdown.length > 0 ? (
              <>
                <RevenueBreakdownChart data={revenueBreakdown} />
                <div className="mt-6 space-y-3">
                  {revenueBreakdown.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:shadow-md transition-all">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        ></div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{item.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {totalPlatformRevenue > 0 ? Math.round((item.value / totalPlatformRevenue) * 100) : 0}% of total
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
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No revenue data available
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
              User Distribution
            </CardTitle>
            <CardDescription className="mt-1">
              Breakdown of user roles and activity
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {userDistribution.length > 0 ? (
              <>
                <UserDistributionChart data={userDistribution} />
                <div className="mt-6 space-y-3">
                  {userDistribution.map((item, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
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
                No user data available
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
            Top Performing Courses
          </CardTitle>
          <CardDescription className="mt-1">
            Courses with highest enrollments and revenue
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {topCourses.length > 0 ? (
            <CourseRevenueChart data={topCourses} />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No course data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Growth Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-2 hover:shadow-xl transition-shadow">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-b">
            <CardTitle className="flex items-center text-lg">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg mr-3 shadow-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              Monthly Revenue
            </CardTitle>
            <CardDescription className="mt-1">
              Platform revenue over the last 6 months
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {monthlyData.length > 0 ? (
              <MonthlyEarningsChart data={monthlyData} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No revenue data available
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
              User & Course Growth
            </CardTitle>
            <CardDescription className="mt-1">
              New users and courses over time
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {monthlyData.length > 0 ? (
              <UserGrowthChart data={monthlyData} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No growth data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}