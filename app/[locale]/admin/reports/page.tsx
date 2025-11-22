import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { redirect } from '@/i18n/routing'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  FileText, 
  Download, 
  Calendar, 
  TrendingUp, 
  Users,
  GraduationCap,
  BookOpen,
  DollarSign,
  FileSpreadsheet,
  FileDown,
  Printer,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3,
  Filter,
  RefreshCw
} from "lucide-react"
import { Link } from '@/i18n/routing'
import { ReportGenerator } from "./report-generator"
import { ReportDownloadButton } from "./report-download-button"
import { getTranslations } from 'next-intl/server'

export default async function AdminReportsPage() {
  const t = await getTranslations('profile')
  const tCommon = await getTranslations('common')
  const tDashboard = await getTranslations('dashboard')

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

  // Fetch data for reports
  const [
    { data: users },
    { data: courses },
    { data: enrollments },
    { data: books },
    { data: bookPurchases }
  ] = await Promise.all([
    supabase.from("profiles").select("id, role, created_at, status, email, full_name").order("created_at", { ascending: false }),
    supabaseAdmin.from("courses").select("id, title, price, status, created_at, instructor_id").order("created_at", { ascending: false }),
    supabaseAdmin.from("enrollments").select("id, course_id, created_at, student_id").order("created_at", { ascending: false }),
    supabase.from("books").select("id, title, price, created_at, instructor_id").order("created_at", { ascending: false }),
    supabaseAdmin.from("book_purchases").select("id, book_id, price_paid, purchased_at, created_at, student_id")
  ])

  // Calculate statistics
  const totalUsers = users?.length || 0
  const totalCourses = courses?.length || 0
  const totalEnrollments = enrollments?.length || 0
  const totalBooks = books?.length || 0
  const totalBookPurchases = bookPurchases?.length || 0
  
  const students = users?.filter(u => u.role === 'student').length || 0
  const instructors = users?.filter(u => u.role === 'instructor').length || 0
  const activeUsers = users?.filter(u => u.status === 'active').length || 0
  const bannedUsers = users?.filter(u => u.status === 'banned').length || 0
  
  const publishedCourses = courses?.filter(c => c.status === 'published').length || 0
  const draftCourses = courses?.filter(c => c.status === 'draft').length || 0
  
  // Fetch all payments to calculate platform commission (20% of all payments)
  const { data: allPayments } = await supabaseAdmin
    .from("payments")
    .select("amount, platform_commission, creator_earnings, payment_type")
    .eq("status", "completed")

  // Calculate platform commission (20% of all payments) - this is what the admin earns
  const totalPlatformCommission = allPayments?.reduce((sum, payment) => {
    return sum + (payment.platform_commission || 0)
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

  // Platform commission is what admin earns (20% of all payments)
  const totalPlatformRevenue = totalPlatformCommission

  // Get recent activity (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const recentUsers = users?.filter(u => new Date(u.created_at) >= thirtyDaysAgo).length || 0
  const recentEnrollments = enrollments?.filter(e => new Date(e.created_at) >= thirtyDaysAgo).length || 0
  const recentCourses = courses?.filter(c => new Date(c.created_at) >= thirtyDaysAgo).length || 0
  const recentBookPurchases = bookPurchases?.filter(bp => {
    const date = new Date(bp.purchased_at || bp.created_at)
    return date >= thirtyDaysAgo
  }).length || 0

  // Top courses by enrollments
  const courseEnrollmentMap = new Map<string, number>()
  enrollments?.forEach(enrollment => {
    if (enrollment.course_id) {
      courseEnrollmentMap.set(enrollment.course_id, (courseEnrollmentMap.get(enrollment.course_id) || 0) + 1)
    }
  })

  const topCourses = courses
    ?.map(course => ({
      ...course,
      enrollments: courseEnrollmentMap.get(course.id) || 0,
      revenue: (courseEnrollmentMap.get(course.id) || 0) * (course.price || 0)
    }))
    .sort((a, b) => b.enrollments - a.enrollments)
    .slice(0, 10) || []

  // Top books by purchases
  const bookPurchaseMap = new Map<string, number>()
  bookPurchases?.forEach(purchase => {
    if (purchase.book_id) {
      bookPurchaseMap.set(purchase.book_id, (bookPurchaseMap.get(purchase.book_id) || 0) + 1)
    }
  })

  const topBooks = books
    ?.map(book => ({
      ...book,
      purchases: bookPurchaseMap.get(book.id) || 0,
      revenue: (bookPurchaseMap.get(book.id) || 0) * (book.price || 0)
    }))
    .sort((a, b) => b.purchases - a.purchases)
    .slice(0, 10) || []

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('platformReports')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('generateAndDownloadReports')}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <FileText className="w-3 h-3 mr-1" />
            {t('reports')}
          </Badge>
        </div>
      </div>

      {/* Report Generation Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            {t('generateReport')}
          </CardTitle>
          <CardDescription>
            {t('selectReportTypeDateRange')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReportGenerator />
        </CardContent>
      </Card>

      {/* Quick Reports */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('platformSummary')}</CardTitle>
            <FileText className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{t('quickReport')}</div>
            <p className="text-xs text-muted-foreground mb-4">
              {t('overviewOfAllMetrics')}
            </p>
            <ReportDownloadButton
              reportType="summary"
              format="csv"
              label={t('downloadCsv')}
              className="w-full"
            />
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('userReport')}</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{totalUsers}</div>
            <p className="text-xs text-muted-foreground mb-4">
              {t('totalUsersInPlatform')}
            </p>
            <ReportDownloadButton
              reportType="users"
              format="csv"
              label={t('downloadCsv')}
              className="w-full"
            />
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('revenueReport')}</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">${totalPlatformRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mb-4">
              {t('totalPlatformRevenue')}
            </p>
            <ReportDownloadButton
              reportType="revenue"
              format="excel"
              label={t('downloadExcel')}
              className="w-full"
            />
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('activityReport')}</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">30 {t('days')}</div>
            <p className="text-xs text-muted-foreground mb-4">
              {t('recentPlatformActivity')}
            </p>
            <ReportDownloadButton
              reportType="activity"
              format="csv"
              label={t('downloadCsv')}
              className="w-full"
            />
          </CardContent>
        </Card>
      </div>

      {/* Report Summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
        {/* Platform Summary Report */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  {t('platformSummaryReport')}
                </CardTitle>
                <CardDescription className="mt-1">
                  {t('comprehensiveOverview')}
                </CardDescription>
              </div>
              <ReportDownloadButton
                reportType="summary"
                format="csv"
                label={t('exportCsv')}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">{t('totalUsers')}</div>
                  <div className="text-2xl font-bold mt-1">{totalUsers}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {students} {tCommon('students')} • {instructors} {tCommon('instructors')}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">{t('userStatus')}</div>
                  <div className="text-2xl font-bold mt-1">{activeUsers}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {bannedUsers} {tCommon('banned')} • {totalUsers - activeUsers - bannedUsers} {tCommon('inactive')}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">{tDashboard('totalCourses')}</div>
                  <div className="text-2xl font-bold mt-1">{totalCourses}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {publishedCourses} {tCommon('published')} • {draftCourses} {tCommon('draft')}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">{tDashboard('totalBooks')}</div>
                  <div className="text-2xl font-bold mt-1">{totalBooks}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {totalBookPurchases} {t('purchases')}
                  </div>
                </div>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-sm text-gray-600 dark:text-gray-400">{tDashboard('totalRevenue')}</div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">
                  ${totalPlatformRevenue.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  ${totalRevenue.toLocaleString()} {t('fromCourses')} • ${bookRevenue.toLocaleString()} {t('fromBooks')}
                </div>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-sm text-gray-600 dark:text-gray-400">{tDashboard('totalEnrollments')}</div>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                  {totalEnrollments}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity Report */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  {t('recentActivityReport')}
                </CardTitle>
                <CardDescription className="mt-1">
                  {t('activitySummary')}
                </CardDescription>
              </div>
              <ReportDownloadButton
                reportType="activity"
                format="csv"
                label={t('exportCsv')}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="font-semibold">{tDashboard('newUsers')}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t('registeredInLast30Days')}</div>
                  </div>
                </div>
                <div className="text-2xl font-bold">{recentUsers}</div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <GraduationCap className="w-5 h-5 text-purple-600" />
                  <div>
                    <div className="font-semibold">{t('newEnrollments')}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t('courseEnrollmentsInLast30Days')}</div>
                  </div>
                </div>
                <div className="text-2xl font-bold">{recentEnrollments}</div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <BookOpen className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="font-semibold">{tDashboard('newCourses')}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t('coursesCreatedInLast30Days')}</div>
                  </div>
                </div>
                <div className="text-2xl font-bold">{recentCourses}</div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <DollarSign className="w-5 h-5 text-orange-600" />
                  <div>
                    <div className="font-semibold">{tDashboard('bookPurchases')}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{t('booksPurchasedInLast30Days')}</div>
                  </div>
                </div>
                <div className="text-2xl font-bold">{recentBookPurchases}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Courses Report */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
                <CardTitle className="flex items-center">
                  <GraduationCap className="w-5 h-5 mr-2" />
                  {t('topCoursesReport')}
                </CardTitle>
              <CardDescription className="mt-1">
                {t('coursesRankedByEnrollments')}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              {t('exportCsv')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50 dark:bg-gray-800">
                  <th className="p-3 text-left text-sm font-semibold">{t('rank')}</th>
                  <th className="p-3 text-left text-sm font-semibold">{t('courseTitle')}</th>
                  <th className="p-3 text-left text-sm font-semibold">{t('status')}</th>
                  <th className="p-3 text-right text-sm font-semibold">{t('enrollments')}</th>
                  <th className="p-3 text-right text-sm font-semibold">{t('price')}</th>
                  <th className="p-3 text-right text-sm font-semibold">{t('revenue')}</th>
                </tr>
              </thead>
              <tbody>
                {topCourses.length > 0 ? (
                  topCourses.map((course, index) => (
                    <tr key={course.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="p-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">{index + 1}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{course.title}</div>
                      </td>
                      <td className="p-3">
                        <Badge variant={course.status === 'published' ? 'default' : 'secondary'}>
                          {course.status === 'published' ? tCommon('published') : course.status === 'draft' ? tCommon('draft') : course.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-semibold">{course.enrollments}</td>
                      <td className="p-3 text-right">${course.price?.toLocaleString() || 0}</td>
                      <td className="p-3 text-right font-semibold text-green-600">
                        ${course.revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-4 sm:p-6 md:p-8 text-center text-gray-500">
                      {t('noCoursesFound')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Top Books Report */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <BookOpen className="w-5 h-5 mr-2" />
                {t('topBooksReport')}
              </CardTitle>
              <CardDescription className="mt-1">
                  {t('booksRankedByPurchases')}
              </CardDescription>
            </div>
            <ReportDownloadButton
              reportType="books"
              format="csv"
              label={t('exportCsv')}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50 dark:bg-gray-800">
                  <th className="p-3 text-left text-sm font-semibold">{t('rank')}</th>
                  <th className="p-3 text-left text-sm font-semibold">{t('bookTitle')}</th>
                  <th className="p-3 text-right text-sm font-semibold">{t('purchases')}</th>
                  <th className="p-3 text-right text-sm font-semibold">{tCommon('price')}</th>
                  <th className="p-3 text-right text-sm font-semibold">{t('revenue')}</th>
                </tr>
              </thead>
              <tbody>
                {topBooks.length > 0 ? (
                  topBooks.map((book, index) => (
                    <tr key={book.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="p-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">{index + 1}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{book.title}</div>
                      </td>
                      <td className="p-3 text-right font-semibold">{book.purchases}</td>
                      <td className="p-3 text-right">${book.price?.toLocaleString() || 0}</td>
                      <td className="p-3 text-right font-semibold text-green-600">
                        ${book.revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-4 sm:p-6 md:p-8 text-center text-gray-500">
                      {t('noBooksFound')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}





