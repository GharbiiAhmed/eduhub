"use client"

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Edit, 
  Save, 
  Camera, 
  Award, 
  BookOpen, 
  GraduationCap,
  Clock,
  Star,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Globe,
  Users,
  DollarSign,
  BarChart3,
  PlayCircle,
  Target,
  Zap,
  Eye,
  ChevronRight,
  X,
  Sparkles
} from "lucide-react"
import { Link } from '@/i18n/routing'
import Image from "next/image"
import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'

interface UserProfile {
  id: string
  full_name: string
  email: string
  bio: string
  avatar_url: string
  phone: string
  location: string
  website: string
  birthday: string
  role: string
  created_at: string
  last_login_at: string
  status: string
  average_rating?: number
  total_ratings?: number
}

interface StudentStats {
  coursesEnrolled: number
  coursesCompleted: number
  certificatesEarned: number
  totalHours: number
  averageRating: number
  ratingsGiven: number
}

interface InstructorStats {
  coursesCreated: number
  coursesPublished: number
  totalStudents: number
  averageRating: number
  totalRatings: number
  totalEarnings: number
  recentEnrollments: number
}

interface AdminStats {
  totalUsers: number
  totalStudents: number
  totalInstructors: number
  totalCourses: number
  totalEnrollments: number
  totalBooks: number
  totalRevenue: number
}

export function ProfileClient() {
  const t = useTranslations('profile')
  const tCommon = useTranslations('common')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [studentStats, setStudentStats] = useState<StudentStats | null>(null)
  const [instructorStats, setInstructorStats] = useState<InstructorStats | null>(null)
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null)
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([])
  const [instructorCourses, setInstructorCourses] = useState<any[]>([])
  const [ratingsGiven, setRatingsGiven] = useState<any[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userType, setUserType] = useState<'student' | 'instructor' | 'admin' | undefined>()

  const [editData, setEditData] = useState({
    full_name: '',
    bio: '',
    phone: '',
    location: '',
    website: ''
  })

  const supabase = createClient()

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      setProfile(profileData)
      setUserType(profileData.role as 'student' | 'instructor' | 'admin')
      setEditData({
        full_name: profileData.full_name || '',
        bio: profileData.bio || '',
        phone: profileData.phone || '',
        location: profileData.location || '',
        website: profileData.website || ''
      })

      // Fetch role-specific data
      if (profileData.role === 'student') {
        await fetchStudentData(user.id)
      } else if (profileData.role === 'instructor') {
        await fetchInstructorData(user.id)
      } else if (profileData.role === 'admin') {
        await fetchAdminData()
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const fetchStudentData = async (userId: string) => {
    // First, get total enrollments count (more reliable)
    const { count: totalEnrolledCount } = await supabase
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .eq("student_id", userId)

    // Get completed courses count
    const { count: completedCount } = await supabase
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .eq("student_id", userId)
      .eq("progress_percentage", 100)

    // Fetch all enrollments with course details for display
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from("enrollments")
      .select(`
        *,
        courses!inner(id, title, thumbnail_url, duration, average_rating, total_ratings)
      `)
      .eq("student_id", userId)
      .order("created_at", { ascending: false })

    if (enrollmentsError) {
      console.error('Error fetching enrollments:', enrollmentsError)
    }

    // Map enrollments to courses with progress
    const courses = enrollments?.map((e: any) => ({
      ...e.courses,
      progress: e.progress_percentage || 0,
      enrolled_at: e.enrolled_at
    })) || []

    setEnrolledCourses(courses)

    // Use the count queries for accuracy, but fallback to array length if needed
    const totalEnrolled = totalEnrolledCount || enrollments?.length || 0
    const completedCountFinal = completedCount || courses.filter((c: any) => c.progress === 100).length

    // Get certificates count
    const { count: certificatesCount } = await supabase
      .from("certificates")
      .select("*", { count: "exact", head: true })
      .eq("student_id", userId)

    // Calculate total hours from completed courses
    const completedCoursesForHours = courses.filter((c: any) => c.progress === 100)
    const totalHours = completedCoursesForHours.reduce((sum: number, c: any) => {
      return sum + (c.duration || 0)
    }, 0)

    // Get ratings given
    const { data: ratings } = await supabase
      .from("course_ratings")
      .select(`
        *,
        courses!inner(title)
      `)
      .eq("student_id", userId)
      .order("created_at", { ascending: false })

    setRatingsGiven(ratings || [])

    // Calculate average rating from enrolled courses
    const coursesWithRatings = courses.filter((c: any) => c.average_rating && c.average_rating > 0)
    const averageRating = coursesWithRatings.length > 0
      ? coursesWithRatings.reduce((sum: number, c: any) => sum + (c.average_rating || 0), 0) / coursesWithRatings.length
      : 0

    setStudentStats({
      coursesEnrolled: totalEnrolled,
      coursesCompleted: completedCountFinal,
      certificatesEarned: certificatesCount || 0,
      totalHours,
      averageRating,
      ratingsGiven: ratings?.length || 0
    })
  }

  const fetchInstructorData = async (userId: string) => {
    const { data: courses } = await supabase
      .from("courses")
      .select(`
        id,
        title,
        thumbnail_url,
        status,
        price,
        average_rating,
        total_ratings,
        created_at,
        enrollments(count)
      `)
      .eq("instructor_id", userId)
      .order("created_at", { ascending: false })

    setInstructorCourses(courses || [])

    const courseIds = courses?.map(c => c.id) || []
    let totalStudents = 0
    if (courseIds.length > 0) {
      const { count } = await supabase
        .from("enrollments")
        .select("*", { count: "exact", head: true })
        .in("course_id", courseIds)
      totalStudents = count || 0
    }

    // Calculate total earnings from actual payments (creator_earnings is 80% of payment)
    let totalEarnings = 0
    if (courseIds.length > 0) {
      const { data: coursePayments } = await supabase
        .from("payments")
        .select("creator_earnings")
        .in("course_id", courseIds)
        .eq("status", "completed")
        .eq("payment_type", "course")
      
      totalEarnings = coursePayments?.reduce((sum, payment) => {
        return sum + (payment.creator_earnings || 0)
      }, 0) || 0
    }

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const { count: recentEnrollments } = await supabase
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .in("course_id", courseIds)
      .gte("created_at", sevenDaysAgo.toISOString())

    const { data: profileData } = await supabase
      .from("profiles")
      .select("average_rating, total_ratings")
      .eq("id", userId)
      .single()

    setInstructorStats({
      coursesCreated: courses?.length || 0,
      coursesPublished: courses?.filter(c => c.status === 'published').length || 0,
      totalStudents,
      averageRating: profileData?.average_rating || 0,
      totalRatings: profileData?.total_ratings || 0,
      totalEarnings,
      recentEnrollments: recentEnrollments || 0
    })
  }

  const fetchAdminData = async () => {
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })

    const { count: totalStudents } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "student")

    const { count: totalInstructors } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "instructor")

    const { count: totalCourses } = await supabase
      .from("courses")
      .select("*", { count: "exact", head: true })

    const { count: totalEnrollments } = await supabase
      .from("enrollments")
      .select("*", { count: "exact", head: true })

    const { count: totalBooks } = await supabase
      .from("books")
      .select("*", { count: "exact", head: true })

    const { data: courses } = await supabase
      .from("courses")
      .select("id, price")

    const courseIds = courses?.map(c => c.id) || []
    let totalRevenue = 0
    if (courseIds.length > 0) {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("course_id")
        .in("course_id", courseIds)

      totalRevenue = enrollments?.reduce((sum, e) => {
        const course = courses?.find(c => c.id === e.course_id)
        return sum + (course?.price || 0)
      }, 0) || 0
    }

    setAdminStats({
      totalUsers: totalUsers || 0,
      totalStudents: totalStudents || 0,
      totalInstructors: totalInstructors || 0,
      totalCourses: totalCourses || 0,
      totalEnrollments: totalEnrollments || 0,
      totalBooks: totalBooks || 0,
      totalRevenue
    })
  }

  const handleSave = async () => {
    if (!profile) return

    setSaving(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: editData.full_name,
          bio: editData.bio,
          phone: editData.phone,
          location: editData.location,
          website: editData.website
        })
        .eq('id', profile.id)

      if (updateError) throw updateError

      setProfile(prev => prev ? { ...prev, ...editData } : null)
      setIsEditing(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error('Error updating profile:', error)
      setError(t('failedToUpdate'))
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditData({
      full_name: profile?.full_name || '',
      bio: profile?.bio || '',
      phone: profile?.phone || '',
      location: profile?.location || '',
      website: profile?.website || ''
    })
    setIsEditing(false)
    setError(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        <Navigation userType={userType} />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        <Navigation userType={userType} />
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('profileNotFound')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {t('unableToLoad')}
          </p>
          <Button onClick={fetchProfile}>
            {t('tryAgain')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <Navigation userType={userType} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section with Gradient */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 p-8 md:p-12 mb-8 shadow-2xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                {profile.avatar_url ? (
                  <Avatar className="w-32 h-32 border-4 border-white/20 shadow-xl">
                    <AvatarImage src={profile.avatar_url} alt={profile.full_name || 'Profile'} />
                    <AvatarFallback className="bg-white/20 text-white text-3xl font-bold">
                      {profile.full_name?.charAt(0) || profile.email?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/20 shadow-xl flex items-center justify-center">
                    <span className="text-white text-4xl font-bold">
                      {profile.full_name?.charAt(0) || profile.email?.charAt(0)}
                    </span>
                  </div>
                )}
                {isEditing && (
                  <Button
                    size="sm"
                    className="absolute -bottom-2 -right-2 rounded-full w-10 h-10 p-0 bg-white text-blue-600 hover:bg-white/90 shadow-lg"
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                )}
              </div>
              
              <div className="text-white">
                <h1 className="text-4xl font-bold mb-2">{profile.full_name || 'No name'}</h1>
                <p className="text-white/90 text-lg mb-3">{profile.email}</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge 
                    variant="secondary"
                    className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-sm px-3 py-1"
                  >
                    {profile.role}
                  </Badge>
                  {profile.role === 'instructor' && profile.average_rating && profile.average_rating > 0 && (
                    <div className="flex items-center gap-1 text-white">
                      <Star className="w-5 h-5 fill-yellow-300 text-yellow-300" />
                      <span className="font-semibold text-lg">{profile.average_rating.toFixed(1)}</span>
                      {profile.total_ratings && profile.total_ratings > 0 && (
                        <span className="text-white/80 text-sm">
                          ({profile.total_ratings} ratings)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {success && (
                <div className="flex items-center space-x-2 text-green-200 bg-green-500/20 px-4 py-2 rounded-lg backdrop-blur-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">{t('profileUpdated')}</span>
                </div>
              )}
              {!isEditing ? (
                <Button 
                  onClick={() => setIsEditing(true)}
                  className="bg-white text-blue-600 hover:bg-white/90 shadow-lg"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {t('editProfile')}
                </Button>
              ) : (
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={handleCancel}
                    className="bg-white/10 text-white border-white/30 hover:bg-white/20 backdrop-blur-sm"
                  >
                    <X className="w-4 h-4 mr-2" />
                    {tCommon('cancel')}
                  </Button>
                  <Button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="bg-white text-blue-600 hover:bg-white/90 shadow-lg"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? t('saving') : t('saveChanges')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Info Card */}
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  {t('personalInfo')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {t('joined')} {new Date(profile.created_at).toLocaleDateString()}
                  </span>
                </div>
                {profile.location && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700 dark:text-gray-300">{profile.location}</span>
                  </div>
                )}
                {profile.website && (
                  <div className="flex items-center gap-3 text-sm">
                    <Globe className="w-4 h-4 text-gray-500" />
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {profile.website}
                    </a>
                  </div>
                )}
                {profile.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700 dark:text-gray-300">{profile.phone}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-600" />
                  {t('quickActions')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {profile.role === 'student' && (
                  <>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link href="/student/courses">
                        <BookOpen className="w-4 h-4 mr-2" />
                        {t('myCourses')}
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link href="/student/certificates">
                        <Award className="w-4 h-4 mr-2" />
                        {t('certificates')}
                      </Link>
                    </Button>
                  </>
                )}
                {profile.role === 'instructor' && (
                  <>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link href="/instructor/courses">
                        <BookOpen className="w-4 h-4 mr-2" />
                        {t('myCourses')}
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link href="/instructor/students">
                        <Users className="w-4 h-4 mr-2" />
                        {t('myStudents')}
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link href="/instructor/analytics">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        {t('analytics')}
                      </Link>
                    </Button>
                  </>
                )}
                {profile.role === 'admin' && (
                  <>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link href="/admin/dashboard">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        {tCommon('dashboard')}
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link href="/admin/users">
                        <Users className="w-4 h-4 mr-2" />
                        {t('userManagement')}
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link href="/admin/analytics">
                        <TrendingUp className="w-4 h-4 mr-2" />
                        {t('analytics')}
                      </Link>
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Role-Specific Stats */}
            {profile.role === 'student' && studentStats && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-white/90">{t('courses')}</CardTitle>
                      <BookOpen className="h-5 w-5 text-white/80" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{studentStats.coursesEnrolled}</div>
                      <p className="text-xs text-white/80 mt-1">
                        {studentStats.coursesCompleted} {t('completed')}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-white/90">{t('certificates')}</CardTitle>
                      <Award className="h-5 w-5 text-white/80" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{studentStats.certificatesEarned}</div>
                      <p className="text-xs text-white/80 mt-1">
                        {t('achievementsEarned')}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-white/90">{t('hours')}</CardTitle>
                      <Clock className="h-5 w-5 text-white/80" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{studentStats.totalHours}</div>
                      <p className="text-xs text-white/80 mt-1">
                        {t('learningTime')}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-white/90">{t('ratingsGiven')}</CardTitle>
                      <Star className="h-5 w-5 text-white/80" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{studentStats.ratingsGiven}</div>
                      <p className="text-xs text-white/80 mt-1">
                        {t('courseRatings')}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Enrolled Courses */}
                {enrolledCourses.length > 0 && (
                  <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-blue-600" />
                            {t('myCourses')}
                          </CardTitle>
                          <CardDescription>{t('yourEnrolledCourses')}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {enrolledCourses.slice(0, 5).map((course: any) => (
                          <Link key={course.id} href={`/student/courses/${course.id}`}>
                            <div className="flex items-center space-x-4 p-4 border rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all cursor-pointer group">
                              {course.thumbnail_url ? (
                                <Image
                                  src={course.thumbnail_url}
                                  alt={course.title}
                                  width={80}
                                  height={60}
                                  className="rounded-lg object-cover"
                                />
                              ) : (
                                <div className="w-20 h-15 bg-gradient-to-br from-blue-400 to-purple-400 rounded-lg flex items-center justify-center">
                                  <BookOpen className="w-8 h-8 text-white" />
                                </div>
                              )}
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">{course.title}</h3>
                                <div className="mt-2">
                                  <Progress value={course.progress || 0} className="h-2" />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {course.progress || 0}% {tCommon('complete')}
                                  </p>
                                </div>
                              </div>
                              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                            </div>
                          </Link>
                        ))}
                        {enrolledCourses.length > 5 && (
                          <Button variant="outline" className="w-full" asChild>
                            <Link href="/student/courses">{t('viewAllCourses')}</Link>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Ratings Given */}
                {ratingsGiven.length > 0 && (
                  <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-600" />
                        {t('myRatings')}
                      </CardTitle>
                      <CardDescription>{t('coursesYouRated')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {ratingsGiven.slice(0, 5).map((rating: any) => (
                          <div key={rating.id} className="flex items-start justify-between p-4 border rounded-xl bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-white">
                                {rating.courses?.title || t('course')}
                              </p>
                              <div className="flex items-center gap-1 mt-2">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${
                                      i < rating.rating
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              {rating.review && (
                                <p className="text-sm text-muted-foreground mt-2 italic">
                                  "{rating.review}"
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {profile.role === 'instructor' && instructorStats && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-white/90">{t('courses')}</CardTitle>
                      <BookOpen className="h-5 w-5 text-white/80" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{instructorStats.coursesCreated}</div>
                      <p className="text-xs text-white/80 mt-1">
                        {instructorStats.coursesPublished} {t('published')}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-white/90">{t('totalStudents')}</CardTitle>
                      <Users className="h-5 w-5 text-white/80" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{instructorStats.totalStudents}</div>
                      <p className="text-xs text-white/80 mt-1">
                        {instructorStats.recentEnrollments} {t('thisWeek')}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-white/90">{t('rating')}</CardTitle>
                      <Star className="h-5 w-5 text-white/80" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {instructorStats.averageRating > 0 ? instructorStats.averageRating.toFixed(1) : 'N/A'}
                      </div>
                      <p className="text-xs text-white/80 mt-1">
                        {instructorStats.totalRatings} {t('ratings')}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-white/90">{t('totalEarnings')}</CardTitle>
                      <DollarSign className="h-5 w-5 text-white/80" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">${instructorStats.totalEarnings.toLocaleString()}</div>
                      <p className="text-xs text-white/80 mt-1">
                        {t('totalRevenue')}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Instructor Courses */}
                {instructorCourses.length > 0 && (
                  <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                        {t('myCourses')}
                      </CardTitle>
                      <CardDescription>{t('yourCreatedCourses')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {instructorCourses.slice(0, 5).map((course: any) => (
                          <Link key={course.id} href={`/instructor/courses/${course.id}`}>
                            <div className="flex items-center space-x-4 p-4 border rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all cursor-pointer group">
                              {course.thumbnail_url ? (
                                <Image
                                  src={course.thumbnail_url}
                                  alt={course.title}
                                  width={80}
                                  height={60}
                                  className="rounded-lg object-cover"
                                />
                              ) : (
                                <div className="w-20 h-15 bg-gradient-to-br from-blue-400 to-purple-400 rounded-lg flex items-center justify-center">
                                  <BookOpen className="w-8 h-8 text-white" />
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">{course.title}</h3>
                                  <Badge variant={course.status === 'published' ? 'default' : 'secondary'}>
                                    {course.status === 'published' ? tCommon('published') : tCommon('draft')}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                  <span>{course.enrollments?.[0]?.count || 0} {t('students')}</span>
                                  {course.average_rating && course.average_rating > 0 && (
                                    <div className="flex items-center gap-1">
                                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                      <span>{course.average_rating.toFixed(1)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                            </div>
                          </Link>
                        ))}
                        {instructorCourses.length > 5 && (
                          <Button variant="outline" className="w-full" asChild>
                            <Link href="/instructor/courses">{t('viewAllCourses')}</Link>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {profile.role === 'admin' && adminStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-white/90">{t('users')}</CardTitle>
                    <Users className="h-5 w-5 text-white/80" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{adminStats.totalUsers}</div>
                    <p className="text-xs text-white/80 mt-1">
                      {adminStats.totalStudents} {t('students')}, {adminStats.totalInstructors} {t('instructors')}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-white/90">{t('courses')}</CardTitle>
                    <BookOpen className="h-5 w-5 text-white/80" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{adminStats.totalCourses}</div>
                    <p className="text-xs text-white/80 mt-1">
                      {adminStats.totalEnrollments} {t('enrollments')}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-white/90">{t('books')}</CardTitle>
                    <BookOpen className="h-5 w-5 text-white/80" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{adminStats.totalBooks}</div>
                    <p className="text-xs text-white/80 mt-1">
                      {t('digitalLibrary')}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-white/90">{t('revenue')}</CardTitle>
                    <DollarSign className="h-5 w-5 text-white/80" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">${adminStats.totalRevenue.toLocaleString()}</div>
                    <p className="text-xs text-white/80 mt-1">
                      {t('totalPlatformRevenue')}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Profile Information Form */}
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  {t('personalInfo')}
                </CardTitle>
                <CardDescription>
                  {isEditing ? t('editYourPersonalInfo') : t('yourPersonalDetails')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-6">
                    <div className="flex items-center">
                      <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                      <span className="text-red-800 dark:text-red-200">{error}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">{t('fullName')}</Label>
                      {isEditing ? (
                        <Input
                          id="full_name"
                          value={editData.full_name}
                          onChange={(e) => setEditData(prev => ({ ...prev, full_name: e.target.value }))}
                          className="bg-white dark:bg-gray-700"
                        />
                      ) : (
                        <p className="text-sm text-gray-900 dark:text-white py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                          {profile.full_name || t('notProvided')}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">{t('email')}</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400 py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                        {profile.email}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">{t('bio')}</Label>
                    {isEditing ? (
                      <Textarea
                        id="bio"
                        rows={4}
                        value={editData.bio}
                        onChange={(e) => setEditData(prev => ({ ...prev, bio: e.target.value }))}
                        placeholder={t('tellUsAboutYourself')}
                        className="bg-white dark:bg-gray-700"
                      />
                    ) : (
                      <p className="text-sm text-gray-900 dark:text-white py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-md min-h-[100px]">
                        {profile.bio || t('noBioProvided')}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">{t('phone')}</Label>
                      {isEditing ? (
                        <Input
                          id="phone"
                          value={editData.phone}
                          onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))}
                          className="bg-white dark:bg-gray-700"
                        />
                      ) : (
                        <p className="text-sm text-gray-900 dark:text-white py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                          {profile.phone || t('notProvided')}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">{t('location')}</Label>
                      {isEditing ? (
                        <Input
                          id="location"
                          value={editData.location}
                          onChange={(e) => setEditData(prev => ({ ...prev, location: e.target.value }))}
                          className="bg-white dark:bg-gray-700"
                        />
                      ) : (
                        <p className="text-sm text-gray-900 dark:text-white py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                          {profile.location || t('notProvided')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">{t('website')}</Label>
                    {isEditing ? (
                      <Input
                        id="website"
                        value={editData.website}
                        onChange={(e) => setEditData(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="https://yourwebsite.com"
                        className="bg-white dark:bg-gray-700"
                      />
                    ) : (
                      <p className="text-sm text-gray-900 dark:text-white py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                        {profile.website || t('notProvided')}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
