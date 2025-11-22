import { createClient } from "@/lib/supabase/server"
import { redirect } from '@/i18n/routing'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  BookOpen, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Award, 
  PlayCircle, 
  BarChart3, 
  Clock,
  Star,
  MessageSquare,
  Plus,
  Eye,
  Edit,
  ChevronRight,
  Target,
  Zap
} from "lucide-react"
import { Link } from '@/i18n/routing'
import { getTranslations } from 'next-intl/server'

export default async function InstructorDashboard() {
  const t = await getTranslations('dashboard')
  const tCommon = await getTranslations('common')

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch instructor's courses
  const { data: courses } = await supabase
    .from("courses")
    .select(`
      id,
      title,
      description,
      thumbnail_url,
      price,
      status,
      created_at,
      enrollments(count)
    `)
    .eq("instructor_id", user.id)
    .order("created_at", { ascending: false })

  // Fetch recent enrollments
  const { data: recentEnrollments } = await supabase
    .from("enrollments")
    .select(`
      *,
      courses(title),
      profiles(full_name, email)
    `)
    .eq("courses.instructor_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5)

  // Fetch enrollments for instructor's courses (for student count)
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(`
      *,
      courses!inner(instructor_id)
    `)
    .eq("courses.instructor_id", user.id)

  // Fetch payments for instructor's courses (for earnings)
  const { data: coursePayments } = await supabase
    .from("payments")
    .select(`
      *,
      courses!inner(instructor_id)
    `)
    .eq("courses.instructor_id", user.id)
    .eq("status", "completed")
    .eq("payment_type", "course")

  // Calculate real earnings from actual payments (creator_earnings is 80% of payment)
  const totalEarnings = coursePayments?.reduce((sum, payment) => {
    return sum + (payment.creator_earnings || 0)
  }, 0) || 0

  const totalStudents = enrollments?.length || 0

  // Calculate month-over-month growth
  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const lastMonthEnrollments = enrollments?.filter(e => {
    const date = new Date(e.created_at)
    return date >= lastMonth && date < thisMonthStart
  }).length || 0

  const thisMonthEnrollments = enrollments?.filter(e => {
    const date = new Date(e.created_at)
    return date >= thisMonthStart
  }).length || 0

  const studentGrowth = lastMonthEnrollments > 0
    ? ((thisMonthEnrollments - lastMonthEnrollments) / lastMonthEnrollments) * 100
    : 0

  const lastMonthRevenue = enrollments?.filter(e => {
    const date = new Date(e.created_at)
    return date >= lastMonth && date < thisMonthStart
  }).reduce((sum, enrollment) => {
    const course = enrollment.courses as any
    return sum + (course?.price || 0)
  }, 0) || 0

  const thisMonthRevenue = enrollments?.filter(e => {
    const date = new Date(e.created_at)
    return date >= thisMonthStart
  }).reduce((sum, enrollment) => {
    const course = enrollment.courses as any
    return sum + (course?.price || 0)
  }, 0) || 0

  const revenueGrowth = lastMonthRevenue > 0
    ? thisMonthRevenue - lastMonthRevenue
    : 0

  // Get average rating from course_analytics
  const { data: courseAnalytics } = await supabase
    .from("course_analytics")
    .select("average_rating, total_enrollments")
    .in("course_id", courses?.map(c => c.id) || [])

  const averageRating = courseAnalytics && courseAnalytics.length > 0
    ? courseAnalytics.reduce((sum, analytics) => sum + (analytics.average_rating || 0), 0) / courseAnalytics.length
    : 0

  const totalReviews = courseAnalytics?.reduce((sum, analytics) => sum + (analytics.total_enrollments || 0), 0) || 0

  // Calculate completion rate
  const { data: allEnrollments } = await supabase
    .from("enrollments")
    .select("progress_percentage, courses!inner(instructor_id)")
    .eq("courses.instructor_id", user.id)

  const completionRate = allEnrollments && allEnrollments.length > 0
    ? (allEnrollments.filter(e => e.progress_percentage >= 100).length / allEnrollments.length) * 100
    : 0

  // Calculate monthly growth percentage
  const monthlyGrowth = lastMonthEnrollments > 0
    ? ((thisMonthEnrollments - lastMonthEnrollments) / lastMonthEnrollments) * 100
    : 0

  const publishedCourses = courses?.filter(course => course.status === 'published').length || 0
  const draftCourses = courses?.filter(course => course.status === 'draft').length || 0

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {t('welcomeBack')}, {user.user_metadata?.full_name || user.email?.split('@')[0]}!
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-2">
            {t('manageCourses')}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <Target className="w-3 h-3 mr-1" />
            {tCommon('instructors')}
          </Badge>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalCourses')}</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courses?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {publishedCourses} {t('published')}, {draftCourses} {t('drafts')}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalStudents')}</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              {studentGrowth >= 0 ? '+' : ''}{Math.round(studentGrowth)}% {t('fromLastMonth')}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalEarnings')}</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalEarnings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {revenueGrowth >= 0 ? '+' : ''}${Math.abs(revenueGrowth).toLocaleString()} {t('fromLastMonth')}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('averageRating')}</CardTitle>
            <Star className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageRating > 0 ? averageRating.toFixed(1) : t('notAvailable')}</div>
            <p className="text-xs text-muted-foreground">
              {t('basedOnEnrollments', { count: totalReviews })}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
        {/* My Courses */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center">
                    <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
                    {t('myCourses')}
                  </CardTitle>
                  <CardDescription>
                    {t('manageCourseContent')}
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/instructor/courses">
                      {t('viewAll')}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href="/instructor/courses/create">
                      <Plus className="w-4 h-4 mr-2" />
                      {t('createNewCourse')}
                    </Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {courses && courses.length > 0 ? (
                <div className="space-y-4">
                  {courses.slice(0, 3).map((course: any) => (
                    <div key={course.id} className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <BookOpen className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {course.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {course.description || t('noDescriptionAvailable')}
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-sm">
                          <div className="flex items-center space-x-1">
                            <Users className="w-4 h-4 text-gray-500" />
                            <span>{course.enrollments?.[0]?.count || 0} {tCommon('students')}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <DollarSign className="w-4 h-4 text-gray-500" />
                            <span>${course.price}</span>
                          </div>
                          <Badge variant={course.status === 'published' ? 'default' : 'secondary'}>
                            {course.status === 'published' ? tCommon('published') : tCommon('draft')}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/instructor/courses/${course.id}`}>
                            <Edit className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/courses/${course.id}`}>
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {t('noCoursesYet')}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {t('createFirstCourse')}
                  </p>
                  <Button asChild>
                    <Link href="/instructor/courses/create">
                      <Plus className="w-4 h-4 mr-2" />
                      {tCommon('create')} {tCommon('courses')}
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity & Quick Actions */}
        <div className="space-y-6">
          {/* Recent Enrollments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                {t('recentEnrollments')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentEnrollments && recentEnrollments.length > 0 ? (
                <div className="space-y-3">
                  {recentEnrollments.map((enrollment: any) => (
                    <div key={enrollment.id} className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {enrollment.profiles?.full_name || enrollment.profiles?.email}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          {t('enrolledIn')} {enrollment.courses?.title}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('noEnrollmentsYet')}
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
                  <Link href="/instructor/courses/create">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('createNewCourse')}
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/instructor/quizzes">
                    <PlayCircle className="w-4 h-4 mr-2" />
                    {tCommon('manage')} {tCommon('quizzes')}
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/instructor/students">
                    <Users className="w-4 h-4 mr-2" />
                    {t('viewDetails')} {tCommon('students')}
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/instructor/analytics">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    {t('viewDetails')} {t('analytics')}
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/instructor/messages">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    {t('messages')}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Performance Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="w-5 h-5 mr-2 text-orange-600" />
                {t('performanceOverview')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{t('completionRate')}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{Math.round(completionRate)}%</span>
                  </div>
                  <Progress value={Math.round(completionRate)} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{t('studentSatisfaction')}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {averageRating > 0 ? `${averageRating.toFixed(1)}/5` : t('notAvailable')}
                    </span>
                  </div>
                  <Progress value={averageRating > 0 ? (averageRating / 5) * 100 : 0} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{t('monthlyGrowth')}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {monthlyGrowth >= 0 ? '+' : ''}{Math.round(monthlyGrowth)}%
                    </span>
                  </div>
                  <Progress value={Math.min(Math.abs(monthlyGrowth), 100)} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}