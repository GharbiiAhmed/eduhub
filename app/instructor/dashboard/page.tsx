import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
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
import Link from "next/link"

export default async function InstructorDashboard() {
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

  // Fetch enrollments for instructor's courses
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(`
      *,
      courses!inner(price, instructor_id)
    `)
    .eq("courses.instructor_id", user.id)

  // Calculate real earnings
  const totalEarnings = enrollments?.reduce((sum, enrollment) => {
    const course = enrollment.courses as any
    return sum + (course?.price || 0)
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
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user.user_metadata?.full_name || user.email?.split('@')[0]}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your courses and track your teaching progress
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <Target className="w-3 h-3 mr-1" />
            Instructor
          </Badge>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courses?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {publishedCourses} published, {draftCourses} drafts
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              {studentGrowth >= 0 ? '+' : ''}{Math.round(studentGrowth)}% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalEarnings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {revenueGrowth >= 0 ? '+' : ''}${Math.abs(revenueGrowth).toLocaleString()} from last month
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
            <Star className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageRating > 0 ? averageRating.toFixed(1) : 'N/A'}</div>
            <p className="text-xs text-muted-foreground">
              Based on {totalReviews} enrollments
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* My Courses */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
                    My Courses
                  </CardTitle>
                  <CardDescription>
                    Manage your course content
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/instructor/courses">
                      View All
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href="/instructor/courses/create">
                      <Plus className="w-4 h-4 mr-2" />
                      New Course
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
                          {course.description || 'No description available'}
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-sm">
                          <div className="flex items-center space-x-1">
                            <Users className="w-4 h-4 text-gray-500" />
                            <span>{course.enrollments?.[0]?.count || 0} students</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <DollarSign className="w-4 h-4 text-gray-500" />
                            <span>${course.price}</span>
                          </div>
                          <Badge variant={course.status === 'published' ? 'default' : 'secondary'}>
                            {course.status}
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
                    No Courses Yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Create your first course to start teaching
                  </p>
                  <Button asChild>
                    <Link href="/instructor/courses/create">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Course
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
                Recent Enrollments
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
                          Enrolled in {enrollment.courses?.title}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    No recent enrollments
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
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/instructor/courses/create">
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Course
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/instructor/quizzes">
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Manage Quizzes
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/instructor/students">
                    <Users className="w-4 h-4 mr-2" />
                    View Students
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/instructor/analytics">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Analytics
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/instructor/messages">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Messages
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
                Performance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Course Completion Rate</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{Math.round(completionRate)}%</span>
                  </div>
                  <Progress value={Math.round(completionRate)} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Student Satisfaction</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {averageRating > 0 ? `${averageRating.toFixed(1)}/5` : 'N/A'}
                    </span>
                  </div>
                  <Progress value={averageRating > 0 ? (averageRating / 5) * 100 : 0} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Monthly Growth</span>
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