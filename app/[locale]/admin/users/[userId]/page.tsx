import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { redirect, notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Mail,
  Calendar,
  Shield,
  UserCheck,
  UserX,
  BookOpen,
  GraduationCap,
  DollarSign,
  Clock,
  Eye,
  Edit,
  MoreHorizontal,
  Ban,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Users,
  Activity
} from "lucide-react"
import { Link } from '@/i18n/routing'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getTranslations } from 'next-intl/server'

interface PageProps {
  params: Promise<{
    userId: string
  }>
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  const t = await getTranslations('dashboard')
  const tCommon = await getTranslations('common')
  const { userId } = await params
  const supabase = await createClient()

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  if (!currentUser) {
    redirect("/auth/login")
  }

  // Check if current user is admin
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", currentUser.id)
    .single()
  
  if (currentProfile?.role !== "admin") {
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

  // Fetch user profile
  const { data: userProfile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single()

  if (profileError || !userProfile) {
    notFound()
  }

  // Fetch user enrollments - use admin client to bypass RLS
  const { data: enrollments } = await supabaseAdmin
    .from("enrollments")
    .select(`
      *,
      course_id
    `)
    .eq("student_id", userId)
    .order("created_at", { ascending: false })

  // Get course details for enrollments
  const courseIds = enrollments?.map(e => e.course_id).filter(Boolean) || []
  const { data: coursesData } = courseIds.length > 0
    ? await supabaseAdmin
        .from("courses")
        .select("id, title, price, created_at")
        .in("id", courseIds)
    : { data: null }

  // Map enrollments with course data
  const enrollmentsWithCourses = enrollments?.map(enrollment => ({
    ...enrollment,
    courses: coursesData?.find(c => c.id === enrollment.course_id) || null
  })) || []

  // Fetch book purchases - use admin client to bypass RLS
  const { data: bookPurchases } = await supabaseAdmin
    .from("book_purchases")
    .select(`
      *,
      book_id
    `)
    .eq("student_id", userId)
    .order("purchased_at", { ascending: false })

  // Get book details for purchases
  const bookIds = bookPurchases?.map(p => p.book_id).filter(Boolean) || []
  const { data: booksData } = bookIds.length > 0
    ? await supabaseAdmin
        .from("books")
        .select("id, title, price, created_at")
        .in("id", bookIds)
    : { data: null }

  // Map book purchases with book data
  const bookPurchasesWithBooks = bookPurchases?.map(purchase => ({
    ...purchase,
    books: booksData?.find(b => b.id === purchase.book_id) || null
  })) || []

  // Fetch courses if instructor
  const { data: instructorCourses } = userProfile.role === "instructor"
    ? await supabase
        .from("courses")
        .select(`
          *,
          enrollments(count)
        `)
        .eq("instructor_id", userId)
        .order("created_at", { ascending: false })
    : { data: null }

  // Fetch books if instructor
  const { data: instructorBooks } = userProfile.role === "instructor"
    ? await supabase
        .from("books")
        .select("*")
        .eq("instructor_id", userId)
        .order("created_at", { ascending: false })
    : { data: null }

  // Calculate statistics
  const totalEnrollments = enrollmentsWithCourses?.length || 0
  const completedEnrollments = enrollmentsWithCourses?.filter(e => e.progress_percentage >= 100).length || 0
  const totalSpent = (enrollmentsWithCourses?.reduce((sum, e) => {
    const course = e.courses as any
    return sum + (course?.price || 0)
  }, 0) || 0) + (bookPurchasesWithBooks?.reduce((sum, p) => {
    const book = p.books as any
    return sum + (book?.price || 0)
  }, 0) || 0)

  const totalCourses = instructorCourses?.length || 0
  const totalStudents = instructorCourses?.reduce((sum, course) => {
    const enrollments = course.enrollments as any
    return sum + (enrollments?.[0]?.count || enrollments?.length || 0)
  }, 0) || 0

  const totalBooks = instructorBooks?.length || 0

  // Calculate earnings for instructor
  const totalEarnings = instructorCourses?.reduce((sum, course) => {
    const enrollments = course.enrollments as any
    const enrollmentCount = enrollments?.[0]?.count || enrollments?.length || 0
    return sum + (enrollmentCount * course.price)
  }, 0) || 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/users">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('backToUsers')}
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {userProfile.full_name || userProfile.email?.split('@')[0] || t('userDetails')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {userProfile.email}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge 
            variant={
              userProfile.role === 'admin' ? 'destructive' : 
              userProfile.role === 'instructor' ? 'default' : 
              'secondary'
            }
          >
            {userProfile.role}
          </Badge>
          <Badge 
            variant={
              userProfile.status === 'active' ? 'default' : 
              userProfile.status === 'inactive' ? 'secondary' : 
              'destructive'
            }
          >
            {userProfile.status || 'active'}
          </Badge>
        </div>
      </div>

      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2 text-blue-600" />
            {t('userInformation')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">{tCommon('fullName')}</label>
              <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                {userProfile.full_name || userProfile.email?.split('@')[0] || t('notSet')}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">{tCommon('email')}</label>
              <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                {userProfile.email}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('role')}</label>
              <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                {userProfile.role}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">{tCommon('status')}</label>
              <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                {userProfile.status || t('active')}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('joined')}</label>
              <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                {new Date(userProfile.created_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('lastActive')}</label>
              <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                {userProfile.last_login_at 
                  ? new Date(userProfile.last_login_at).toLocaleDateString() 
                  : t('never')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {userProfile.role === 'student' && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('enrollments')}</CardTitle>
                <GraduationCap className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalEnrollments}</div>
                <p className="text-xs text-muted-foreground">
                  {completedEnrollments} {t('completed')}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('booksPurchased')}</CardTitle>
                <BookOpen className="h-4 w-4 text-purple-600" />
              </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookPurchasesWithBooks?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                {t('totalPurchases')}
              </p>
            </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('totalSpent')}</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalSpent.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {t('allPurchases')}
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {userProfile.role === 'instructor' && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{tCommon('courses')}</CardTitle>
                <GraduationCap className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCourses}</div>
                <p className="text-xs text-muted-foreground">
                  {t('publishedCourses')}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{tCommon('students')}</CardTitle>
                <Users className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStudents}</div>
                <p className="text-xs text-muted-foreground">
                  {t('totalEnrollments')}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{tCommon('books')}</CardTitle>
                <BookOpen className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalBooks}</div>
                <p className="text-xs text-muted-foreground">
                  {t('publishedBooks')}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('earnings')}</CardTitle>
                <DollarSign className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalEarnings.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {t('totalRevenue')}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Student Content */}
      {userProfile.role === 'student' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Enrollments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <GraduationCap className="w-5 h-5 mr-2 text-blue-600" />
                {t('courseEnrollments')}
              </CardTitle>
              <CardDescription>
                {t('coursesThisStudentIsEnrolledIn')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {enrollmentsWithCourses && enrollmentsWithCourses.length > 0 ? (
                <div className="space-y-4">
                  {enrollmentsWithCourses.slice(0, 5).map((enrollment: any) => {
                    const course = enrollment.courses as any
                    return (
                      <div key={enrollment.id} className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {course?.title || t('untitledCourse')}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {t('progress')}: {enrollment.progress_percentage || 0}%
                            </p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                              <span>${course?.price || 0}</span>
                              <span>{new Date(enrollment.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <Badge variant={enrollment.progress_percentage >= 100 ? 'default' : 'secondary'}>
                            {enrollment.progress_percentage >= 100 ? t('completed') : t('inProgress')}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                  {enrollmentsWithCourses.length > 5 && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                      +{enrollmentsWithCourses.length - 5} {t('moreEnrollments')}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 dark:text-gray-400">{t('noEnrollmentsYet')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Book Purchases */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-purple-600" />
                {t('bookPurchases')}
              </CardTitle>
              <CardDescription>
                {t('booksThisStudentHasPurchased')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bookPurchasesWithBooks && bookPurchasesWithBooks.length > 0 ? (
                <div className="space-y-4">
                  {bookPurchasesWithBooks.slice(0, 5).map((purchase: any) => {
                    const book = purchase.books as any
                    return (
                      <div key={purchase.id} className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {book?.title || t('untitledBook')}
                            </h3>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                              <span>${book?.price || purchase.price_paid || 0}</span>
                              <span>{new Date(purchase.purchased_at || purchase.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <Badge variant="default">
                            {t('purchased')}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                  {bookPurchasesWithBooks.length > 5 && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                      +{bookPurchasesWithBooks.length - 5} {t('morePurchases')}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 dark:text-gray-400">{t('noBookPurchasesYet')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Instructor Content */}
      {userProfile.role === 'instructor' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Courses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <GraduationCap className="w-5 h-5 mr-2 text-blue-600" />
                {t('publishedCourses')}
              </CardTitle>
              <CardDescription>
                {t('coursesCreatedByThisInstructor')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {instructorCourses && instructorCourses.length > 0 ? (
                <div className="space-y-4">
                  {instructorCourses.slice(0, 5).map((course: any) => {
                    const enrollments = course.enrollments as any
                    const enrollmentCount = enrollments?.[0]?.count || enrollments?.length || 0
                    return (
                      <div key={course.id} className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {course.title}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {enrollmentCount} {t('enrollments')}
                            </p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                              <span>${course.price}</span>
                              <span>{new Date(course.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <Badge variant={course.status === 'published' ? 'default' : 'secondary'}>
                            {course.status}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                  {instructorCourses.length > 5 && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                      +{instructorCourses.length - 5} {t('moreCourses')}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 dark:text-gray-400">{t('noCoursesCreatedYet')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Books */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-purple-600" />
                {t('publishedBooks')}
              </CardTitle>
              <CardDescription>
                {t('booksCreatedByThisInstructor')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {instructorBooks && instructorBooks.length > 0 ? (
                <div className="space-y-4">
                  {instructorBooks.slice(0, 5).map((book: any) => (
                    <div key={book.id} className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {book.title}
                          </h3>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>${book.price}</span>
                            <span>{new Date(book.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <Badge variant="default">
                          {t('published')}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {instructorBooks.length > 5 && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                      +{instructorBooks.length - 5} {t('moreBooks')}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 dark:text-gray-400">{t('noBooksCreatedYet')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
