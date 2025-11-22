import { createClient } from "@/lib/supabase/server"
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
  Edit, 
  Trash2, 
  Shield,
  UserCheck,
  UserX,
  Mail,
  Calendar,
  Eye,
  Ban,
  CheckCircle,
  AlertCircle,
  Star,
  BookOpen,
  GraduationCap,
  TrendingUp,
  Clock
} from "lucide-react"
import { Link } from '@/i18n/routing'
import UserActions from "../users/user-actions"
import { getTranslations } from 'next-intl/server'

export default async function AdminStudentsPage() {
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

  // Fetch all students
  const { data: students, error: studentsError } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "student")
    .order("created_at", { ascending: false })

  if (studentsError) {
    console.error('Error fetching students:', studentsError)
  }

  // Fetch all enrollments
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("student_id")

  // Fetch all book purchases
  const { data: bookPurchases } = await supabase
    .from("book_purchases")
    .select("student_id")

  // Calculate statistics
  const totalStudents = students?.length || 0
  const activeStudents = students?.filter(s => s.status === 'active').length || 0
  const totalEnrollments = enrollments?.length || 0
  const totalBookPurchases = bookPurchases?.length || 0

  // Add counts to each student
  const studentsWithCounts = (students || []).map(student => {
    const enrollmentsCount = enrollments?.filter(e => e.student_id === student.id).length || 0
    const bookPurchasesCount = bookPurchases?.filter(bp => bp.student_id === student.id).length || 0
    
    return {
      ...student,
      enrollmentsCount,
      bookPurchasesCount
    }
  })

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{t('studentManagement')}</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-2">
            {t('managePlatformStudents')}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <Users className="w-3 h-3 mr-1" />
            {tCommon('students')}
          </Badge>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalStudents')}</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              {t('platformStudents')}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('activeStudents')}</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeStudents}</div>
            <p className="text-xs text-muted-foreground">
              {t('currentlyActive')}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('courseEnrollments')}</CardTitle>
            <GraduationCap className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEnrollments}</div>
            <p className="text-xs text-muted-foreground">
              {t('totalEnrollments')}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('bookPurchases')}</CardTitle>
            <BookOpen className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBookPurchases}</div>
            <p className="text-xs text-muted-foreground">
              {t('totalPurchases')}
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
                  <SelectValue placeholder={t('filterByStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allStatus')}</SelectItem>
                  <SelectItem value="active">{tCommon('active')}</SelectItem>
                  <SelectItem value="inactive">{t('inactive')}</SelectItem>
                  <SelectItem value="banned">{t('banned')}</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder={t('sortBy')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t('newestFirst')}</SelectItem>
                  <SelectItem value="oldest">{t('oldestFirst')}</SelectItem>
                  <SelectItem value="enrollments">{t('mostEnrollments')}</SelectItem>
                  <SelectItem value="activity">{t('mostActive')}</SelectItem>
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
                  <TableHead className="min-w-[100px]">{tCommon('status')}</TableHead>
                  <TableHead className="min-w-[100px]">{t('enrollments')}</TableHead>
                  <TableHead className="min-w-[100px]">{tCommon('books')}</TableHead>
                  <TableHead className="min-w-[120px] hidden lg:table-cell">{t('lastActive')}</TableHead>
                  <TableHead className="min-w-[120px] hidden md:table-cell">{t('joined')}</TableHead>
                  <TableHead className="text-right min-w-[100px]">{tCommon('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentsWithCounts?.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {student.full_name?.charAt(0) || student.email?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {student.full_name || t('noName')}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {student.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          student.status === 'active' ? 'default' : 
                          student.status === 'inactive' ? 'secondary' : 
                          'destructive'
                        }
                      >
                        {student.status || 'active'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <GraduationCap className="w-4 h-4 text-purple-500" />
                        <span className="font-semibold">{(student as any).enrollmentsCount || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <BookOpen className="w-4 h-4 text-orange-500" />
                        <span className="font-semibold">{(student as any).bookPurchasesCount || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span>
                          {student.last_login_at ? 
                            new Date(student.last_login_at).toLocaleDateString() : 
                            t('never')
                          }
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(student.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <UserActions 
                        userId={student.id} 
                        userRole={student.role} 
                        userStatus={student.status || 'active'} 
                        userEmail={student.email}
                        viewLink={`/admin/users/${student.id}`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Student Activity Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
              {t('mostActiveStudents')}
            </CardTitle>
            <CardDescription>
              {t('studentsWithHighestEngagement')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {studentsWithCounts?.slice(0, 5).map((student, index) => (
                <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {student.full_name || student.email}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {((student as any).enrollmentsCount || 0) + ((student as any).bookPurchasesCount || 0)} {t('totalActivities')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      {((student as any).enrollmentsCount || 0) + ((student as any).bookPurchasesCount || 0)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('activities')}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-blue-600" />
              {t('recentRegistrations')}
            </CardTitle>
            <CardDescription>
              {t('newestStudentsWhoJoined')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {studentsWithCounts?.slice(0, 5).map((student) => (
                <div key={student.id} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {student.full_name || student.email}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {t('joined')} {new Date(student.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {(student as any).enrollmentsCount || 0} {t('enrollments')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


