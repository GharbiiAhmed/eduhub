import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  BookOpen, 
  Clock, 
  Award, 
  TrendingUp, 
  PlayCircle, 
  Calendar,
  Star,
  Users,
  MessageSquare,
  ChevronRight,
  Target,
  Zap
} from "lucide-react"
import Link from "next/link"

export default async function StudentDashboard() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch user's enrollments and progress
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(`
      *,
      courses (
        id,
        title,
        description,
        thumbnail_url,
        price,
        instructor_id,
        created_at
      )
    `)
    .eq("student_id", user.id)

  // Fetch recent lesson progress
  const { data: recentProgress } = await supabase
    .from("lesson_progress")
    .select(`
      *,
      lessons (
        id,
        title,
        modules (
          course_id,
          courses (
            title
          )
        )
      )
    `)
    .eq("student_id", user.id)
    .eq("completed", true)
    .order("completed_at", { ascending: false })
    .limit(5)

  // Calculate overall stats
  const totalCourses = enrollments?.length || 0
  const completedCourses = enrollments?.filter(e => e.progress_percentage >= 100).length || 0
  const averageProgress = enrollments?.length > 0 
    ? Math.round(enrollments.reduce((sum, e) => sum + (e.progress_percentage || 0), 0) / enrollments.length)
    : 0

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

  const coursesGrowth = lastMonthEnrollments > 0
    ? ((thisMonthEnrollments - lastMonthEnrollments) / lastMonthEnrollments) * 100
    : (thisMonthEnrollments > 0 ? 100 : 0)

  // Calculate study streak from lesson_progress
  const { data: allProgress } = await supabase
    .from("lesson_progress")
    .select("completed_at")
    .eq("student_id", user.id)
    .eq("completed", true)
    .order("completed_at", { ascending: false })

  // Calculate consecutive days with activity
  let studyStreak = 0
  if (allProgress && allProgress.length > 0) {
    const dates = allProgress.map(p => new Date(p.completed_at).toDateString())
    const uniqueDates = [...new Set(dates)]
    uniqueDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    
    let currentStreak = 0
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString()
    
    // Check if there's activity today or yesterday
    if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
      currentStreak = 1
      for (let i = 1; i < uniqueDates.length; i++) {
        const prevDate = new Date(uniqueDates[i - 1])
        const currDate = new Date(uniqueDates[i])
        const diffDays = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24))
        
        if (diffDays === 1) {
          currentStreak++
        } else {
          break
        }
      }
    }
    studyStreak = currentStreak
  }

  // Get certificates count
  const { count: certificatesCount } = await supabase
    .from("certificates")
    .select("*", { count: "exact", head: true })
    .eq("student_id", user.id)

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user.user_metadata?.full_name || user.email?.split('@')[0]}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Continue your learning journey and track your progress
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <Target className="w-3 h-3 mr-1" />
            Active Learner
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
            <div className="text-2xl font-bold">{totalCourses}</div>
            <p className="text-xs text-muted-foreground">
              {coursesGrowth > 0 ? `+${thisMonthEnrollments} from last month` : totalCourses > 0 ? 'No change' : 'Start your first course'}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Award className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCourses}</div>
            <p className="text-xs text-muted-foreground">
              {completedCourses > 0 ? 'Great progress!' : 'Keep learning'}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageProgress}%</div>
            <p className="text-xs text-muted-foreground">
              {averageProgress > 50 ? 'Excellent!' : 'Keep going!'}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Streak</CardTitle>
            <Zap className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studyStreak} {studyStreak === 1 ? 'day' : 'days'}</div>
            <p className="text-xs text-muted-foreground">
              {studyStreak > 0 ? 'Keep it up!' : 'Start your streak today!'}
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
                    <PlayCircle className="w-5 h-5 mr-2 text-blue-600" />
                    My Courses
                  </CardTitle>
                  <CardDescription>
                    Continue where you left off
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/student/courses">
                    View All
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {enrollments && enrollments.length > 0 ? (
                <div className="space-y-4">
                  {enrollments.slice(0, 3).map((enrollment: any) => (
                    <div key={enrollment.id} className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <BookOpen className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {enrollment.courses?.title || 'Untitled Course'}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {enrollment.courses?.description || 'No description available'}
                        </p>
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Progress</span>
                            <span className="font-medium">{enrollment.progress_percentage || 0}%</span>
                          </div>
                          <Progress value={enrollment.progress_percentage || 0} className="mt-1" />
                        </div>
                      </div>
                      <Button size="sm" asChild>
                        <Link href={`/student/courses/${enrollment.courses?.id}`}>
                          Continue
                        </Link>
                      </Button>
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
                    Start your learning journey by exploring our course catalog
                  </p>
                  <Button asChild>
                    <Link href="/courses">
                      Browse Courses
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity & Quick Actions */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2 text-green-600" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentProgress && recentProgress.length > 0 ? (
                <div className="space-y-3">
                  {recentProgress.slice(0, 4).map((progress: any) => (
                    <div key={progress.id} className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                        <Award className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          Completed: {progress.lessons?.title}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          {progress.lessons?.modules?.courses?.title}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    No recent activity
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
                  <Link href="/courses">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Browse Courses
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/books">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Browse Books
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/student/forums">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Discussion Forums
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/student/messages">
                    <Users className="w-4 h-4 mr-2" />
                    Messages
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Learning Goals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="w-5 h-5 mr-2 text-orange-600" />
                Learning Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Complete 1 course this month</span>
                  <Badge variant={completedCourses >= 1 ? 'default' : 'secondary'}>
                    {completedCourses >= 1 ? 'Completed' : 'In Progress'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Study daily</span>
                  <Badge variant={studyStreak >= 7 ? 'default' : 'secondary'}>
                    {studyStreak} day streak
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Earn 3 certificates</span>
                  <Badge variant={certificatesCount && certificatesCount >= 3 ? 'default' : 'outline'}>
                    {certificatesCount || 0}/3
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}


