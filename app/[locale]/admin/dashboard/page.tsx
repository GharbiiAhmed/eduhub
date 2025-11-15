import { createClient } from "@/lib/supabase/server"
import { redirect } from '@/i18n/routing'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  Users, 
  BookOpen, 
  GraduationCap, 
  DollarSign, 
  TrendingUp, 
  BarChart3, 
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Star,
  MessageSquare,
  Eye,
  Edit,
  Trash2,
  Plus,
  ChevronRight,
  Activity,
  Zap,
  Target
} from "lucide-react"
import { Link } from '@/i18n/routing'
import { getTranslations } from 'next-intl/server'

export default async function AdminDashboard() {
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

  // Fetch system statistics
  const [
    { data: users },
    { data: courses },
    { data: books },
    { data: enrollments },
    { data: recentUsers },
    { data: recentCourses },
    { data: pendingCourses }
  ] = await Promise.all([
    supabase.from("profiles").select("id, role, created_at").order("created_at", { ascending: false }),
    supabase.from("courses").select("id, title, status, price, instructor_id, created_at").order("created_at", { ascending: false }),
    supabase.from("books").select("id, title, price, created_at").order("created_at", { ascending: false }),
    supabase.from("enrollments").select("id, created_at"),
    supabase.from("profiles").select("id, full_name, email, role, created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("courses").select("id, title, status, instructor_id, created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("courses").select("id, title, instructor_id, created_at").eq("status", "draft").limit(5)
  ])

  // Calculate statistics
  const totalUsers = users?.length || 0
  const totalCourses = courses?.length || 0
  const totalBooks = books?.length || 0
  const totalEnrollments = enrollments?.length || 0
  
  const students = users?.filter(u => u.role === 'student').length || 0
  const instructors = users?.filter(u => u.role === 'instructor').length || 0
  const admins = users?.filter(u => u.role === 'admin').length || 0
  
  const publishedCourses = courses?.filter(c => c.status === 'published').length || 0
  const draftCourses = courses?.filter(c => c.status === 'draft').length || 0
  
  const totalRevenue = courses?.reduce((sum, course) => {
    const courseEnrollments = enrollments?.filter(e => e.id.includes(course.id)).length || 0
    return sum + (courseEnrollments * course.price)
  }, 0) || 0

  // Calculate monthly growth
  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  // Get enrollments for last month
  const { data: lastMonthEnrollments } = await supabase
    .from("enrollments")
    .select(`
      created_at,
      courses!inner(price)
    `)
    .gte("created_at", lastMonth.toISOString())
    .lt("created_at", thisMonthStart.toISOString())

  const lastMonthRevenue = lastMonthEnrollments?.reduce((sum, enrollment) => {
    const course = enrollment.courses as any
    return sum + (course?.price || 0)
  }, 0) || 0

  // Get enrollments for this month
  const { data: thisMonthEnrollments } = await supabase
    .from("enrollments")
    .select(`
      created_at,
      courses!inner(price)
    `)
    .gte("created_at", thisMonthStart.toISOString())

  const thisMonthRevenue = thisMonthEnrollments?.reduce((sum, enrollment) => {
    const course = enrollment.courses as any
    return sum + (course?.price || 0)
  }, 0) || 0

  const monthlyGrowth = lastMonthRevenue > 0
    ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    : 0

  // Calculate month-over-month growth for different metrics
  const lastMonthUsers = users?.filter(u => {
    const date = new Date(u.created_at)
    return date >= lastMonth && date < thisMonthStart
  }).length || 0

  const thisMonthUsers = users?.filter(u => {
    const date = new Date(u.created_at)
    return date >= thisMonthStart
  }).length || 0

  const usersGrowth = lastMonthUsers > 0
    ? ((thisMonthUsers - lastMonthUsers) / lastMonthUsers) * 100
    : (thisMonthUsers > 0 ? 100 : 0)

  const lastMonthCourses = courses?.filter(c => {
    const date = new Date(c.created_at)
    return date >= lastMonth && date < thisMonthStart
  }).length || 0

  const thisMonthCourses = courses?.filter(c => {
    const date = new Date(c.created_at)
    return date >= thisMonthStart
  }).length || 0

  const coursesGrowth = lastMonthCourses > 0
    ? ((thisMonthCourses - lastMonthCourses) / lastMonthCourses) * 100
    : (thisMonthCourses > 0 ? 100 : 0)

  const lastMonthEnrollmentsCount = enrollments?.filter(e => {
    const date = new Date(e.created_at)
    return date >= lastMonth && date < thisMonthStart
  }).length || 0

  const thisMonthEnrollmentsCount = enrollments?.filter(e => {
    const date = new Date(e.created_at)
    return date >= thisMonthStart
  }).length || 0

  const enrollmentsGrowth = lastMonthEnrollmentsCount > 0
    ? ((thisMonthEnrollmentsCount - lastMonthEnrollmentsCount) / lastMonthEnrollmentsCount) * 100
    : (thisMonthEnrollmentsCount > 0 ? 100 : 0)

  // Get average rating from course_analytics
  const { data: courseAnalytics } = await supabase
    .from("course_analytics")
    .select("average_rating")
    .in("course_id", courses?.map(c => c.id) || [])

  const averageRating = courseAnalytics && courseAnalytics.length > 0
    ? courseAnalytics.reduce((sum, analytics) => sum + (analytics.average_rating || 0), 0) / courseAnalytics.length
    : 0

  // Calculate platform health (uptime - simplified as 100% for now, would need uptime tracking)
  // Platform health would typically come from monitoring service
  const platformHealth = 100 // This would be calculated from actual uptime metrics if available

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {tCommon('dashboard')} - {t('admin')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('manageSystem')}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            <Shield className="w-3 h-3 mr-1" />
            {t('admin')}
          </Badge>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalUsers')}</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {students} {tCommon('students')}, {instructors} {tCommon('instructors')}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalCourses')}</CardTitle>
            <GraduationCap className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCourses}</div>
            <p className="text-xs text-muted-foreground">
              {publishedCourses} {t('published')}, {draftCourses} {tCommon('pending')}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalRevenue')}</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue}</div>
            <p className="text-xs text-muted-foreground">
              +{monthlyGrowth}% {t('fromLastMonth')}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('systemHealth')}</CardTitle>
            <Activity className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformHealth.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {t('systemHealth')}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-blue-600" />
                    {t('recentActivity')}
                  </CardTitle>
                  <CardDescription>
                    {t('recentActivity')}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/admin/analytics">
                    {t('viewAll')}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Recent Users */}
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">{t('recentUsers')}</h4>
                  <div className="space-y-2">
                    {recentUsers?.slice(0, 3).map((user: any) => (
                      <div key={user.id} className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <Users className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {user.full_name || user.email}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {t('joinedAs')} {user.role}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {user.role}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Courses */}
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">{t('recentCourses')}</h4>
                  <div className="space-y-2">
                    {recentCourses?.slice(0, 3).map((course: any) => (
                      <div key={course.id} className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                        <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                          <GraduationCap className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {course.title}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {t('status')}: {course.status === 'published' ? tCommon('published') : tCommon('draft')}
                          </p>
                        </div>
                        <Badge variant={course.status === 'published' ? 'default' : 'secondary'} className="text-xs">
                          {course.status === 'published' ? tCommon('published') : tCommon('draft')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Alerts */}
        <div className="space-y-6">
          {/* Pending Approvals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-orange-600" />
                {t('pendingApprovals')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingCourses && pendingCourses.length > 0 ? (
                <div className="space-y-3">
                  {pendingCourses.slice(0, 3).map((course: any) => (
                    <div key={course.id} className="flex items-center justify-between p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {course.title}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {t('awaitingReview')}
                        </p>
                      </div>
                      <div className="flex space-x-1">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/admin/courses/${course.id}/review`}>
                            <Eye className="w-3 h-3" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link href="/admin/courses">
                      {t('viewAllPending')}
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('noPendingApprovals')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="w-5 h-5 mr-2 text-purple-600" />
                {t('quickActions')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/admin/users">
                    <Users className="w-4 h-4 mr-2" />
                    {t('manageUsers')}
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/admin/courses">
                    <GraduationCap className="w-4 h-4 mr-2" />
                    {t('manageCourses')}
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/admin/books">
                    <BookOpen className="w-4 h-4 mr-2" />
                    {t('manageBooks')}
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/admin/analytics">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    {t('viewAnalytics')}
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/admin/settings">
                    <Shield className="w-4 h-4 mr-2" />
                    {t('systemSettings')}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="w-5 h-5 mr-2 text-green-600" />
                {t('systemStatus')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{t('database')}</span>
                    <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {t('online')}
                    </Badge>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{t('storage')}</span>
                    <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {t('healthy')}
                    </Badge>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{t('api')}</span>
                    <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {t('operational')}
                    </Badge>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{t('cdn')}</span>
                    <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {t('active')}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Platform Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
            {t('platformOverview')}
          </CardTitle>
          <CardDescription>
            {t('keyMetricsAndGrowth')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{totalUsers}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{t('totalUsers')}</div>
              <div className="text-xs text-green-600 mt-1">
                {usersGrowth >= 0 ? '+' : ''}{Math.round(usersGrowth)}% {t('thisMonth')}
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{totalCourses}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{t('totalCourses')}</div>
              <div className="text-xs text-green-600 mt-1">
                {coursesGrowth >= 0 ? '+' : ''}{Math.round(coursesGrowth)}% {t('thisMonth')}
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{totalEnrollments}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{t('totalEnrollments')}</div>
              <div className="text-xs text-green-600 mt-1">
                {enrollmentsGrowth >= 0 ? '+' : ''}{Math.round(enrollmentsGrowth)}% {t('thisMonth')}
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {averageRating > 0 ? averageRating.toFixed(1) : t('notAvailable')}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{t('avgRating')}</div>
              <div className="text-xs text-green-600 mt-1">
                {averageRating > 0 ? `${courseAnalytics?.length || 0} ${tCommon('courses')}` : t('noRatingsYet')}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}