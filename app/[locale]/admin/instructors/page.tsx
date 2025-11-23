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
  GraduationCap, 
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
  DollarSign,
  BookOpen,
  Users
} from "lucide-react"
import { Link } from '@/i18n/routing'
import UserActions from "../users/user-actions"
import { getTranslations } from 'next-intl/server'

export default async function AdminInstructorsPage() {
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

  // Fetch all instructors
  const { data: instructors, error: instructorsError } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "instructor")
    .order("created_at", { ascending: false })

  if (instructorsError) {
    console.error('Error fetching instructors:', instructorsError)
  }

  // Fetch all courses to calculate counts and ratings
  const { data: courses } = await supabase
    .from("courses")
    .select("id, instructor_id")

  // Fetch all books
  const { data: books } = await supabase
    .from("books")
    .select("id, instructor_id")

  // Fetch course analytics for ratings
  const { data: courseAnalytics } = await supabase
    .from("course_analytics")
    .select("course_id, average_rating")

  // Calculate statistics
  const totalInstructors = instructors?.length || 0
  const activeInstructors = instructors?.filter(i => i.status === 'active').length || 0
  const totalCourses = courses?.length || 0
  const totalBooks = books?.length || 0

  // Calculate instructor ratings and counts
  const instructorsWithRatings = await Promise.all(
    (instructors || []).map(async (instructor) => {
      const instructorCourseIds = courses?.filter(c => c.instructor_id === instructor.id).map(c => c.id) || []
      const instructorAnalytics = courseAnalytics?.filter(a => instructorCourseIds.includes(a.course_id)) || []
      
      const avgRating = instructorAnalytics.length > 0
        ? instructorAnalytics.reduce((sum, a) => sum + (a.average_rating || 0), 0) / instructorAnalytics.length
        : 0

      const coursesCount = instructorCourseIds.length
      const booksCount = books?.filter(b => b.instructor_id === instructor.id).length || 0

      return {
        ...instructor,
        rating: avgRating,
        coursesCount,
        booksCount
      }
    })
  )

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{t('instructorManagement')}</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-2">
            {t('managePlatformInstructors')}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
            <GraduationCap className="w-3 h-3 mr-1" />
            {tCommon('instructors')}
          </Badge>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalInstructors')}</CardTitle>
            <GraduationCap className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInstructors}</div>
            <p className="text-xs text-muted-foreground">
              {t('platformInstructors')}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('activeInstructors')}</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeInstructors}</div>
            <p className="text-xs text-muted-foreground">
              {t('currentlyActive')}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalCourses')}</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCourses}</div>
            <p className="text-xs text-muted-foreground">
              {t('createdByInstructors')}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalBooks')}</CardTitle>
            <BookOpen className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBooks}</div>
            <p className="text-xs text-muted-foreground">
              {t('publishedBooks')}
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
                  placeholder={t('searchInstructorsByNameOrEmail')}
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
                  <SelectItem value="pending">{t('pendingApproval')}</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder={t('sortBy')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t('newestFirst')}</SelectItem>
                  <SelectItem value="oldest">{t('oldestFirst')}</SelectItem>
                  <SelectItem value="courses">{t('mostCourses')}</SelectItem>
                  <SelectItem value="rating">{t('highestRating')}</SelectItem>
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
                  <TableHead className="min-w-[200px]">{tCommon('instructors')}</TableHead>
                  <TableHead className="min-w-[100px]">{tCommon('status')}</TableHead>
                  <TableHead className="min-w-[100px]">{tCommon('courses')}</TableHead>
                  <TableHead className="min-w-[100px]">{tCommon('books')}</TableHead>
                  <TableHead className="min-w-[100px]">{t('rating')}</TableHead>
                  <TableHead className="min-w-[120px] hidden md:table-cell">{t('joined')}</TableHead>
                  <TableHead className="text-right min-w-[100px]">{tCommon('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instructorsWithRatings?.map((instructor) => (
                  <TableRow key={instructor.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {instructor.full_name?.charAt(0) || instructor.email?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {instructor.full_name || t('noName')}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {instructor.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          instructor.status === 'active' ? 'default' : 
                          instructor.status === 'inactive' ? 'secondary' : 
                          'destructive'
                        }
                      >
                        {instructor.status === 'pending' ? (t('pendingApproval') || tCommon('pending')) :
                         instructor.status === 'active' ? (t('active') || tCommon('active')) :
                         instructor.status === 'inactive' ? (t('inactive') || tCommon('inactive')) :
                         instructor.status || (t('active') || tCommon('active'))}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <BookOpen className="w-4 h-4 text-blue-500" />
                        <span className="font-semibold">{(instructor as any).coursesCount || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <BookOpen className="w-4 h-4 text-orange-500" />
                        <span className="font-semibold">{(instructor as any).booksCount || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="font-semibold">
                          {(instructor as any).rating > 0 ? (instructor as any).rating.toFixed(1) : 'N/A'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(instructor.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <UserActions 
                        userId={instructor.id} 
                        userRole={instructor.role} 
                        userStatus={instructor.status || 'active'} 
                        userEmail={instructor.email}
                        viewLink={`/admin/users/${instructor.id}`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Top Performing Instructors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Star className="w-5 h-5 mr-2 text-yellow-600" />
            {t('topPerformingInstructors')}
          </CardTitle>
          <CardDescription>
            {t('instructorsWithHighestRatings')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {instructorsWithRatings
              ?.sort((a, b) => ((b as any).rating || 0) - ((a as any).rating || 0))
              .slice(0, 5)
              .map((instructor, index) => (
              <div key={instructor.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">{index + 1}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {instructor.full_name || instructor.email}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {((instructor as any).coursesCount || 0) + ((instructor as any).booksCount || 0)} {t('totalContent')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-yellow-600">
                    {(instructor as any).rating > 0 ? (instructor as any).rating.toFixed(1) : 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('rating')}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


