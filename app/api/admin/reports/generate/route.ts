import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }

    const body = await request.json()
    const { reportType, dateRange, format } = body

    // Use service role client if available to bypass RLS
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAdmin = serviceRoleKey
      ? createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey
        )
      : supabase

    // Calculate date range
    const now = new Date()
    let startDate = new Date()
    
    switch (dateRange) {
      case "last-7-days":
        startDate.setDate(now.getDate() - 7)
        break
      case "last-30-days":
        startDate.setDate(now.getDate() - 30)
        break
      case "last-3-months":
        startDate.setMonth(now.getMonth() - 3)
        break
      case "last-6-months":
        startDate.setMonth(now.getMonth() - 6)
        break
      case "last-year":
        startDate.setFullYear(now.getFullYear() - 1)
        break
      case "all-time":
        startDate = new Date(0) // Beginning of time
        break
      default:
        startDate.setDate(now.getDate() - 30) // Default to 30 days
    }

    // Fetch data based on report type
    let reportData: any = {}

    // Fetch data for all report types
    if (reportType === "summary" || reportType === "all" || !reportType || 
        reportType === "users" || reportType === "courses" || reportType === "books" || 
        reportType === "revenue" || reportType === "activity") {
      const [
        { data: users },
        { data: courses },
        { data: enrollments },
        { data: books },
        { data: bookPurchases }
      ] = await Promise.all([
        supabase.from("profiles").select("id, role, created_at, status, email, full_name"),
        supabaseAdmin.from("courses").select("id, title, price, status, created_at, instructor_id"),
        supabaseAdmin.from("enrollments").select("id, course_id, created_at, student_id"),
        supabase.from("books").select("id, title, price, created_at, instructor_id"),
        supabaseAdmin.from("book_purchases").select("id, book_id, price_paid, purchased_at, created_at, student_id")
      ])

      // Calculate revenue
      const coursePriceMap = new Map<string, number>()
      courses?.forEach(course => {
        if (course.id && course.price != null) {
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

      reportData = {
        totalUsers: users?.length || 0,
        totalCourses: courses?.length || 0,
        totalEnrollments: enrollments?.length || 0,
        totalBooks: books?.length || 0,
        totalBookPurchases: bookPurchases?.length || 0,
        students: users?.filter(u => u.role === 'student').length || 0,
        instructors: users?.filter(u => u.role === 'instructor').length || 0,
        publishedCourses: courses?.filter(c => c.status === 'published').length || 0,
        draftCourses: courses?.filter(c => c.status === 'draft').length || 0,
        totalRevenue: totalRevenue + bookRevenue,
        courseRevenue: totalRevenue,
        bookRevenue: bookRevenue,
        users: users || [],
        courses: courses || [],
        enrollments: enrollments || [],
        books: books || [],
        bookPurchases: bookPurchases || []
      }

      // Calculate recent activity (30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      reportData.recentUsers = users?.filter(u => new Date(u.created_at) >= thirtyDaysAgo).length || 0
      reportData.recentEnrollments = enrollments?.filter(e => new Date(e.created_at) >= thirtyDaysAgo).length || 0
      reportData.recentCourses = courses?.filter(c => new Date(c.created_at) >= thirtyDaysAgo).length || 0
      reportData.recentBookPurchases = bookPurchases?.filter(bp => {
        const date = new Date(bp.purchased_at || bp.created_at)
        return date >= thirtyDaysAgo
      }).length || 0
    }

    // Generate report based on format
    if (format === "csv") {
      return generateCSV(reportData, reportType)
    } else if (format === "excel") {
      return generateCSV(reportData, reportType) // For now, return CSV as Excel
    } else if (format === "pdf") {
      return generateJSON(reportData, reportType) // For now, return JSON as PDF
    }

    return NextResponse.json({ error: "Invalid format" }, { status: 400 })
  } catch (error: any) {
    console.error("Error generating report:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate report" },
      { status: 500 }
    )
  }
}

function generateCSV(data: any, reportType: string): NextResponse {
  let csv = ""
  let filename = "report"

  if (reportType === "summary" || reportType === "all") {
    // Summary CSV
    csv = "Metric,Value\n"
    csv += `Total Users,${data.totalUsers}\n`
    csv += `Total Courses,${data.totalCourses}\n`
    csv += `Total Enrollments,${data.totalEnrollments}\n`
    csv += `Total Books,${data.totalBooks}\n`
    csv += `Total Book Purchases,${data.totalBookPurchases}\n`
    csv += `Students,${data.students}\n`
    csv += `Instructors,${data.instructors}\n`
    csv += `Published Courses,${data.publishedCourses}\n`
    csv += `Draft Courses,${data.draftCourses}\n`
    csv += `Total Revenue,${data.totalRevenue}\n`
    csv += `Course Revenue,${data.courseRevenue}\n`
    csv += `Book Revenue,${data.bookRevenue}\n`
    filename = "platform-summary-report"
    } else if (reportType === "users") {
      csv = "ID,Email,Full Name,Role,Status,Created At\n"
      data.users?.forEach((user: any) => {
        csv += `${user.id},${user.email || ''},${user.full_name || ''},${user.role || ''},${user.status || 'active'},${user.created_at}\n`
      })
      filename = "users-report"
    } else if (reportType === "courses") {
      csv = "ID,Title,Price,Status,Enrollments,Revenue,Created At\n"
      // Calculate enrollments for each course
      const courseEnrollmentMap = new Map<string, number>()
      data.enrollments?.forEach((enrollment: any) => {
        if (enrollment.course_id) {
          courseEnrollmentMap.set(enrollment.course_id, (courseEnrollmentMap.get(enrollment.course_id) || 0) + 1)
        }
      })
      data.courses?.forEach((course: any) => {
        const enrollments = courseEnrollmentMap.get(course.id) || 0
        const revenue = enrollments * (course.price || 0)
        csv += `${course.id},${course.title || ''},${course.price || 0},${course.status || 'draft'},${enrollments},${revenue},${course.created_at}\n`
      })
      filename = "courses-report"
    } else if (reportType === "books") {
      csv = "ID,Title,Price,Purchases,Revenue,Created At\n"
      // Calculate purchases for each book
      const bookPurchaseMap = new Map<string, number>()
      data.bookPurchases?.forEach((purchase: any) => {
        if (purchase.book_id) {
          bookPurchaseMap.set(purchase.book_id, (bookPurchaseMap.get(purchase.book_id) || 0) + 1)
        }
      })
      data.books?.forEach((book: any) => {
        const purchases = bookPurchaseMap.get(book.id) || 0
        const revenue = purchases * (book.price || 0)
        csv += `${book.id},${book.title || ''},${book.price || 0},${purchases},${revenue},${book.created_at}\n`
      })
      filename = "books-report"
    } else if (reportType === "revenue") {
      csv = "Source,Amount\n"
      csv += `Course Revenue,${data.courseRevenue}\n`
      csv += `Book Revenue,${data.bookRevenue}\n`
      csv += `Total Revenue,${data.totalRevenue}\n`
      filename = "revenue-report"
    } else if (reportType === "activity") {
      csv = "Metric,Value\n"
      csv += `New Users (30 days),${data.recentUsers || 0}\n`
      csv += `New Enrollments (30 days),${data.recentEnrollments || 0}\n`
      csv += `New Courses (30 days),${data.recentCourses || 0}\n`
      csv += `New Book Purchases (30 days),${data.recentBookPurchases || 0}\n`
      filename = "activity-report"
    }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}

function generateJSON(data: any, reportType: string): NextResponse {
  const report = {
    reportType,
    generatedAt: new Date().toISOString(),
    data
  }

  return NextResponse.json(report, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="report-${new Date().toISOString().split('T')[0]}.json"`,
    },
  })
}

