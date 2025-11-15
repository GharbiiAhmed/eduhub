import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
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
import Link from "next/link"
import { ReportGenerator } from "./report-generator"
import { ReportDownloadButton } from "./report-download-button"

export default async function AdminReportsPage() {
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
  
  // Calculate revenue
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

  const bookRevenue = bookPurchases?.reduce((sum, purchase) => {
    return sum + (purchase.price_paid || 0)
  }, 0) || 0

  const totalPlatformRevenue = totalRevenue + bookRevenue

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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Platform Reports</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Generate and download comprehensive platform reports
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <FileText className="w-3 h-3 mr-1" />
            Reports
          </Badge>
        </div>
      </div>

      {/* Report Generation Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Generate Report
          </CardTitle>
          <CardDescription>
            Select report type, date range, and format to generate a downloadable report
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
            <CardTitle className="text-sm font-medium">Platform Summary</CardTitle>
            <FileText className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">Quick Report</div>
            <p className="text-xs text-muted-foreground mb-4">
              Overview of all platform metrics
            </p>
            <ReportDownloadButton
              reportType="summary"
              format="csv"
              label="Download CSV"
              className="w-full"
            />
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Report</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">{totalUsers}</div>
            <p className="text-xs text-muted-foreground mb-4">
              Total users in the platform
            </p>
            <ReportDownloadButton
              reportType="users"
              format="csv"
              label="Download CSV"
              className="w-full"
            />
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Report</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">${totalPlatformRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mb-4">
              Total platform revenue
            </p>
            <ReportDownloadButton
              reportType="revenue"
              format="excel"
              label="Download Excel"
              className="w-full"
            />
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activity Report</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">30 Days</div>
            <p className="text-xs text-muted-foreground mb-4">
              Recent platform activity
            </p>
            <ReportDownloadButton
              reportType="activity"
              format="csv"
              label="Download CSV"
              className="w-full"
            />
          </CardContent>
        </Card>
      </div>

      {/* Report Summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Platform Summary Report */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Platform Summary Report
                </CardTitle>
                <CardDescription className="mt-1">
                  Comprehensive overview of platform statistics
                </CardDescription>
              </div>
              <ReportDownloadButton
                reportType="summary"
                format="csv"
                label="Export CSV"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Users</div>
                  <div className="text-2xl font-bold mt-1">{totalUsers}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {students} students • {instructors} instructors
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">User Status</div>
                  <div className="text-2xl font-bold mt-1">{activeUsers}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {bannedUsers} banned • {totalUsers - activeUsers - bannedUsers} inactive
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Courses</div>
                  <div className="text-2xl font-bold mt-1">{totalCourses}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {publishedCourses} published • {draftCourses} draft
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Books</div>
                  <div className="text-2xl font-bold mt-1">{totalBooks}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {totalBookPurchases} purchases
                  </div>
                </div>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">
                  ${totalPlatformRevenue.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  ${totalRevenue.toLocaleString()} from courses • ${bookRevenue.toLocaleString()} from books
                </div>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Enrollments</div>
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
                  Recent Activity Report (30 Days)
                </CardTitle>
                <CardDescription className="mt-1">
                  Activity summary for the last 30 days
                </CardDescription>
              </div>
              <ReportDownloadButton
                reportType="activity"
                format="csv"
                label="Export CSV"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="font-semibold">New Users</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Registered in last 30 days</div>
                  </div>
                </div>
                <div className="text-2xl font-bold">{recentUsers}</div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <GraduationCap className="w-5 h-5 text-purple-600" />
                  <div>
                    <div className="font-semibold">New Enrollments</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Course enrollments in last 30 days</div>
                  </div>
                </div>
                <div className="text-2xl font-bold">{recentEnrollments}</div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <BookOpen className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="font-semibold">New Courses</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Courses created in last 30 days</div>
                  </div>
                </div>
                <div className="text-2xl font-bold">{recentCourses}</div>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <DollarSign className="w-5 h-5 text-orange-600" />
                  <div>
                    <div className="font-semibold">Book Purchases</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Books purchased in last 30 days</div>
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
                Top Courses Report
              </CardTitle>
              <CardDescription className="mt-1">
                Courses ranked by enrollments and revenue
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50 dark:bg-gray-800">
                  <th className="p-3 text-left text-sm font-semibold">Rank</th>
                  <th className="p-3 text-left text-sm font-semibold">Course Title</th>
                  <th className="p-3 text-left text-sm font-semibold">Status</th>
                  <th className="p-3 text-right text-sm font-semibold">Enrollments</th>
                  <th className="p-3 text-right text-sm font-semibold">Price</th>
                  <th className="p-3 text-right text-sm font-semibold">Revenue</th>
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
                          {course.status}
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
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      No courses found
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
                Top Books Report
              </CardTitle>
              <CardDescription className="mt-1">
                  Books ranked by purchases and revenue
              </CardDescription>
            </div>
            <ReportDownloadButton
              reportType="books"
              format="csv"
              label="Export CSV"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50 dark:bg-gray-800">
                  <th className="p-3 text-left text-sm font-semibold">Rank</th>
                  <th className="p-3 text-left text-sm font-semibold">Book Title</th>
                  <th className="p-3 text-right text-sm font-semibold">Purchases</th>
                  <th className="p-3 text-right text-sm font-semibold">Price</th>
                  <th className="p-3 text-right text-sm font-semibold">Revenue</th>
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
                    <td colSpan={5} className="p-8 text-center text-gray-500">
                      No books found
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





