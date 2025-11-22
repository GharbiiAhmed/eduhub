import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { redirect } from '@/i18n/routing'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  Users, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Mail, 
  Calendar,
  Eye,
  MessageSquare,
  Award,
  Clock,
  BookOpen,
  TrendingUp,
  UserCheck
} from "lucide-react"
import { Link } from '@/i18n/routing'
import { StudentActions } from "@/components/student-actions"
import { getTranslations } from 'next-intl/server'

export default async function InstructorStudentsPage() {
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

  // Fetch instructor's courses
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .eq("instructor_id", user.id)

  // Fetch enrollments for instructor's courses
  const courseIds = courses?.map(c => c.id) || []
  
  let enrollments: any[] = []
  if (courseIds.length > 0) {
    const { data: enrollmentsData, error: enrollmentsError } = await supabase
      .from("enrollments")
      .select("*")
      .in("course_id", courseIds)
      .order("created_at", { ascending: false })

    if (enrollmentsError) {
      console.error('Error fetching enrollments:', enrollmentsError)
    } else if (enrollmentsData) {
      // Fetch course and student details separately
      enrollments = await Promise.all(
        enrollmentsData.map(async (enrollment) => {
          // Get course details
          const course = courses?.find(c => c.id === enrollment.course_id) || null
          
          // Get student profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, full_name, email, created_at")
            .eq("id", enrollment.student_id)
            .single()

          return {
            ...enrollment,
            courses: course ? { id: course.id, title: course.title } : null,
            profiles: profile || null
          }
        })
      )
    }
  }

  // Calculate statistics
  const totalStudents = enrollments?.length || 0
  const uniqueStudents = new Set(enrollments?.map(e => e.student_id)).size
  const activeStudents = enrollments?.filter(e => {
    const enrollmentDate = new Date(e.created_at)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return enrollmentDate >= thirtyDaysAgo
  }).length || 0

  // Get real progress data for each enrollment
  const studentsWithProgress = await Promise.all(
    (enrollments || []).map(async (enrollment) => {
      // Get enrollment progress
      const progress = enrollment.progress_percentage || 0

      // Get total lessons count for the course
      const { count: totalLessons } = await supabase
        .from("lessons")
        .select("*", { count: "exact", head: true })
        .in("module_id", 
          (await supabase
            .from("modules")
            .select("id")
            .eq("course_id", enrollment.course_id)).data?.map(m => m.id) || []
        )

      // Get completed lessons count - use service role client if available to bypass RLS
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      const supabaseAdmin = serviceRoleKey
        ? createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey
          )
        : supabase

      // Get lesson IDs for this course
      const moduleIds = (await supabase
        .from("modules")
        .select("id")
        .eq("course_id", enrollment.course_id)).data?.map(m => m.id) || []
      
      const lessonIds = (await supabase
        .from("lessons")
        .select("id")
        .in("module_id", moduleIds)).data?.map(l => l.id) || []

      // Get completed lessons count using admin client
      let completedLessons = 0
      if (lessonIds.length > 0) {
        const { count } = await supabaseAdmin
          .from("lesson_progress")
          .select("*", { count: "exact", head: true })
          .eq("student_id", enrollment.student_id)
          .eq("completed", true)
          .in("lesson_id", lessonIds)
        completedLessons = count || 0
      }

      // Get last activity from lesson_progress using admin client
      let lastActivity = null
      if (lessonIds.length > 0) {
        const { data } = await supabaseAdmin
          .from("lesson_progress")
          .select("completed_at")
          .eq("student_id", enrollment.student_id)
          .in("lesson_id", lessonIds)
          .order("completed_at", { ascending: false })
          .limit(1)
        lastActivity = data?.[0] || null
      }

      return {
        ...enrollment,
        progress: progress,
        lastActive: lastActivity?.completed_at 
          ? new Date(lastActivity.completed_at)
          : new Date(enrollment.created_at),
        completedLessons: completedLessons || 0,
        totalLessons: totalLessons || 0
      }
    })
  ) || []

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{t('myStudents')}</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-2">
            {t('manageAndTrackStudents')}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <Users className="w-3 h-3 mr-1" />
            {t('instructor')}
          </Badge>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalEnrollments')}</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              {t('acrossAllCourses')}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('uniqueStudents')}</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueStudents}</div>
            <p className="text-xs text-muted-foreground">
              {t('individualLearners')}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('activeStudents')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeStudents}</div>
            <p className="text-xs text-muted-foreground">
              {t('last30Days')}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('avgProgress')}</CardTitle>
            <Award className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {studentsWithProgress.length ? 
                Math.round(studentsWithProgress.reduce((sum, s) => sum + s.progress, 0) / studentsWithProgress.length) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {t('courseCompletion')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder={t('searchStudentsByNameOrEmail')}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder={t('filterByCourse')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allCourses')}</SelectItem>
                  {courses?.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder={t('filterByProgress')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allProgress')}</SelectItem>
                  <SelectItem value="high">{t('highProgress')}</SelectItem>
                  <SelectItem value="medium">{t('mediumProgress')}</SelectItem>
                  <SelectItem value="low">{t('lowProgress')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">{tCommon('students')}</TableHead>
                  <TableHead className="min-w-[150px]">{tCommon('course')}</TableHead>
                  <TableHead className="min-w-[120px]">{t('completion')}</TableHead>
                  <TableHead className="min-w-[120px] hidden md:table-cell">{t('enrolled')}</TableHead>
                  <TableHead className="min-w-[120px] hidden lg:table-cell">{t('lastActive')}</TableHead>
                  <TableHead className="text-right min-w-[100px]">{tCommon('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentsWithProgress && studentsWithProgress.length > 0 ? (
                  studentsWithProgress.map((enrollment) => (
                  <TableRow key={`${enrollment.student_id}-${enrollment.course_id}`}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {enrollment.profiles?.full_name?.charAt(0) || enrollment.profiles?.email?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {enrollment.profiles?.full_name || t('noName')}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {enrollment.profiles?.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <BookOpen className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium">{enrollment.courses?.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{enrollment.progress}%</span>
                          <span className="text-gray-500">{enrollment.completedLessons}/{enrollment.totalLessons}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              enrollment.progress >= 80 ? 'bg-green-500' :
                              enrollment.progress >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${enrollment.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(enrollment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span>
                          {enrollment.lastActive.toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <StudentActions 
                        studentId={enrollment.student_id}
                        studentEmail={enrollment.profiles?.email || ''}
                        courseId={enrollment.course_id}
                        studentName={enrollment.profiles?.full_name}
                        courseTitle={enrollment.courses?.title}
                        progress={enrollment.progress}
                      />
                    </TableCell>
                  </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {t('noStudentsFound')}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {courses && courses.length > 0 
                          ? t('noStudentsEnrolledYet') 
                          : t('createCoursesToAttractStudents')}
                      </p>
                      {(!courses || courses.length === 0) && (
                        <Link href="/instructor/courses/create">
                          <Button>
                            <BookOpen className="w-4 h-4 mr-2" />
                            {t('createCourse')}
                          </Button>
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Student Performance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
              {t('topPerformingStudents')}
            </CardTitle>
            <CardDescription>
              {t('studentsWithHighestProgress')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {studentsWithProgress && studentsWithProgress.length > 0 ? (
                studentsWithProgress
                  .sort((a, b) => b.progress - a.progress)
                  .slice(0, 5)
                  .map((student, index) => (
                <div key={`${student.student_id}-${student.course_id}`} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {student.profiles?.full_name || student.profiles?.email}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {student.courses?.title}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">{student.progress}%</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('completion')}</p>
                  </div>
                </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('noStudentDataAvailable')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2 text-blue-600" />
              {t('recentEnrollments')}
            </CardTitle>
            <CardDescription>
              {t('latestStudentEnrollments')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {studentsWithProgress && studentsWithProgress.length > 0 ? (
                studentsWithProgress
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .slice(0, 5)
                  .map((student) => (
                <div key={`${student.student_id}-${student.course_id}`} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {student.profiles?.full_name || student.profiles?.email}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {t('enrolledIn')} {student.courses?.title}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {new Date(student.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('noRecentEnrollments')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}