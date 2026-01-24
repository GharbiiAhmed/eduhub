"use client"

import React, { useState, useEffect } from 'react'
import { Link, usePathname } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart3, 
  BookOpen, 
  GraduationCap, 
  Home, 
  MessageSquare, 
  Settings, 
  Users, 
  Award, 
  BookMarked, 
  PlayCircle, 
  FileText, 
  HelpCircle,
  ChevronRight,
  TrendingUp,
  Clock,
  Star,
  Video,
  CreditCard,
  Megaphone
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface SidebarProps {
  userType: 'student' | 'instructor' | 'admin'
  className?: string
  onLinkClick?: () => void
}

export function Sidebar({ userType, className, onLinkClick }: SidebarProps) {
  const t = useTranslations('navigation')
  const tCommon = useTranslations('common')
  const tDashboard = useTranslations('dashboard')
  const pathname = usePathname()
  const supabase = createClient()
  const [stats, setStats] = useState({
    courses: 0,
    progress: 0,
    rating: 0,
    coursesBadge: '0',
    booksBadge: '0',
    studentsBadge: '0',
    usersBadge: '0',
    instructorsBadge: '0'
  })
  const [loading, setLoading] = useState(true)

  const getSidebarItems = () => {
    if (userType === 'student') {
      return [
        {
          title: tDashboard('overview'),
          items: [
            { href: '/student/dashboard', label: tCommon('dashboard'), icon: BarChart3 },
            { href: '/student/courses', label: t('myCourses'), icon: PlayCircle, badge: '3' },
            { href: '/student/books', label: t('myBooks'), icon: BookMarked, badge: '5' },
            { href: '/subscriptions', label: t('subscriptions'), icon: CreditCard },
          ]
        },
        {
          title: t('learning'),
          items: [
            { href: '/student/lessons', label: t('recentLessons'), icon: Clock },
            { href: '/student/assignments', label: t('assignments'), icon: FileText },
            { href: '/student/forums', label: t('discussionForums'), icon: MessageSquare },
            { href: '/student/meetings', label: t('liveMeetings'), icon: Video },
            { href: '/student/certificates', label: t('certificates'), icon: Award },
          ]
        },
        {
          title: t('browse'),
          items: [
            { href: '/courses', label: t('allCourses'), icon: GraduationCap },
            { href: '/books', label: t('allBooks'), icon: BookOpen },
          ]
        },
        {
          title: t('support'),
          items: [
            { href: '/subscriptions', label: t('subscriptions'), icon: CreditCard },
            { href: '/announcements', label: t('announcements'), icon: Megaphone },
            { href: '/student/messages', label: t('messages'), icon: MessageSquare },
            { href: '/help', label: t('help'), icon: HelpCircle },
            { href: '/settings', label: tCommon('settings'), icon: Settings },
          ]
        }
      ]
    }

    if (userType === 'instructor') {
      return [
        {
          title: t('overview'),
          items: [
            { href: '/instructor/dashboard', label: tCommon('dashboard'), icon: BarChart3 },
            { href: '/instructor/courses', label: t('myCourses'), icon: GraduationCap, badge: '2' },
            { href: '/instructor/books', label: t('myBooks'), icon: BookOpen, badge: '1' },
          ]
        },
        {
          title: t('contentManagement'),
          items: [
            { href: '/instructor/courses/create', label: t('createCourse'), icon: GraduationCap },
            { href: '/instructor/books/create', label: t('createBook'), icon: BookOpen },
            { href: '/instructor/assignments', label: t('assignments'), icon: FileText },
            { href: '/instructor/meetings', label: t('liveMeetings'), icon: Video },
            { href: '/instructor/quizzes', label: t('quizzes'), icon: FileText },
            { href: '/instructor/lessons', label: t('manageLessons'), icon: FileText },
          ]
        },
        {
          title: t('studentsAnalytics'),
          items: [
            { href: '/instructor/students', label: t('myStudents'), icon: Users, badge: '24' },
            { href: '/instructor/analytics', label: t('analytics'), icon: TrendingUp },
            { href: '/instructor/earnings', label: t('earnings'), icon: Award },
            { href: '/instructor/forums', label: t('courseForums'), icon: MessageSquare },
          ]
        },
        {
          title: t('communication'),
          items: [
            { href: '/instructor/messages', label: t('messages'), icon: MessageSquare },
            { href: '/instructor/announcements', label: t('announcements'), icon: Megaphone },
            { href: '/help', label: t('help'), icon: HelpCircle },
            { href: '/instructor/help-center', label: t('manageHelpCenter'), icon: HelpCircle },
            { href: '/settings', label: tCommon('settings'), icon: Settings },
          ]
        }
      ]
    }

    if (userType === 'admin') {
      return [
        {
          title: t('overview'),
          items: [
            { href: '/admin/dashboard', label: tCommon('dashboard'), icon: BarChart3 },
            { href: '/admin/analytics', label: t('analytics'), icon: TrendingUp },
          ]
        },
        {
          title: t('userManagement'),
          items: [
            { href: '/admin/users', label: t('allUsers'), icon: Users, badge: '156' },
            { href: '/admin/instructors', label: tCommon('instructors'), icon: GraduationCap, badge: '12' },
            { href: '/admin/students', label: t('allStudents'), icon: Users, badge: '144' },
          ]
        },
        {
          title: t('contentManagement'),
          items: [
            { href: '/admin/courses', label: t('allCourses'), icon: GraduationCap, badge: '8' },
            { href: '/admin/books', label: t('allBooks'), icon: BookOpen, badge: '15' },
            { href: '/admin/reports', label: t('reports'), icon: FileText },
          ]
        },
        {
          title: t('system'),
          items: [
            { href: '/admin/announcements', label: t('announcements'), icon: Megaphone },
            { href: '/admin/settings', label: tCommon('settings'), icon: Settings },
            { href: '/help', label: t('help'), icon: HelpCircle },
            { href: '/admin/help-center', label: t('manageHelpCenter'), icon: HelpCircle },
          ]
        }
      ]
    }

    return []
  }

  // Fetch real stats based on user type
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        if (userType === 'student') {
          // Get enrollments with course_id
          const { data: enrollments } = await supabase
            .from("enrollments")
            .select("progress_percentage, course_id")
            .eq("student_id", user.id)

          const coursesCount = enrollments?.length || 0
          const avgProgress = enrollments && enrollments.length > 0
            ? Math.round(enrollments.reduce((sum: number, e: any) => sum + (e.progress_percentage || 0), 0) / enrollments.length)
            : 0

          // Get average rating from courses table (new rating system)
          let avgRating = 0
          if (enrollments && enrollments.length > 0) {
            const courseIds = enrollments.map((e: any) => e.course_id).filter(Boolean)
            if (courseIds.length > 0) {
              const { data: courses } = await supabase
                .from("courses")
                .select("average_rating, total_ratings")
                .in("id", courseIds)

              if (courses && courses.length > 0) {
                // Get average of all course ratings (only courses with ratings)
                const ratings = courses
                  .filter((c: any) => c.average_rating != null && c.average_rating > 0 && c.total_ratings && c.total_ratings > 0)
                  .map((c: any) => Number(c.average_rating))
                
                if (ratings.length > 0) {
                  avgRating = Math.round((ratings.reduce((sum: number, r: number) => sum + r, 0) / ratings.length) * 10) / 10
                } else {
                  avgRating = 0
                }
              }
            }
          }

          // Get books count
          const { count: booksCount } = await supabase
            .from("book_purchases")
            .select("*", { count: "exact", head: true })
            .eq("student_id", user.id)

          setStats({
            courses: coursesCount,
            progress: avgProgress,
            rating: avgRating, // Only use actual ratings, no fallback
            coursesBadge: coursesCount.toString(),
            booksBadge: (booksCount || 0).toString(),
            studentsBadge: '0',
            usersBadge: '0',
            instructorsBadge: '0'
          })
        } else if (userType === 'instructor') {
          // Get courses created
          const { data: courses } = await supabase
            .from("courses")
            .select("id")
            .eq("instructor_id", user.id)

          const coursesCount = courses?.length || 0

          // Get average progress of all students in instructor's courses
          let avgProgress = 0
          if (courses && courses.length > 0) {
            const courseIds = courses.map(c => c.id)
            const { data: enrollments } = await supabase
              .from("enrollments")
              .select("progress_percentage")
              .in("course_id", courseIds)

            if (enrollments && enrollments.length > 0) {
              avgProgress = Math.round(enrollments.reduce((sum: number, e: any) => sum + (e.progress_percentage || 0), 0) / enrollments.length)
            }
          }

          // Get average rating of instructor's courses from courses table (new rating system)
          let avgRating = 0
          if (courses && courses.length > 0) {
            const courseIds = courses.map(c => c.id)
            const { data: coursesData } = await supabase
              .from("courses")
              .select("average_rating, total_ratings")
              .in("id", courseIds)

            if (coursesData && coursesData.length > 0) {
              // Get average of all course ratings (only courses with ratings)
              const ratings = coursesData
                .filter((c: any) => c.average_rating && c.average_rating > 0 && c.total_ratings && c.total_ratings > 0)
                .map((c: any) => c.average_rating)
              
              avgRating = ratings.length > 0
                ? Math.round((ratings.reduce((sum: number, r: number) => sum + r, 0) / ratings.length) * 10) / 10
                : 0
            }
          }

          // Get books count
          const { count: booksCount } = await supabase
            .from("books")
            .select("*", { count: "exact", head: true })
            .eq("instructor_id", user.id)

          // Get students count
          const { count: studentsCount } = await supabase
            .from("enrollments")
            .select("*", { count: "exact", head: true })
            .in("course_id", courses?.map(c => c.id) || [])

          setStats({
            courses: coursesCount,
            progress: avgProgress,
            rating: avgRating, // Only use actual ratings, no fallback
            coursesBadge: coursesCount.toString(),
            booksBadge: (booksCount || 0).toString(),
            studentsBadge: (studentsCount || 0).toString(),
            usersBadge: '0',
            instructorsBadge: '0'
          })
        } else if (userType === 'admin') {
          // Get total courses
          const { count: coursesCount } = await supabase
            .from("courses")
            .select("*", { count: "exact", head: true })

          // Get total books
          const { count: booksCount } = await supabase
            .from("books")
            .select("*", { count: "exact", head: true })

          // Get total users
          const { count: usersCount } = await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })

          // Get instructors count
          const { count: instructorsCount } = await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("role", "instructor")

          // Get students count
          const { count: studentsCount } = await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("role", "student")

          // Get average progress across all enrollments
          const { data: enrollments } = await supabase
            .from("enrollments")
            .select("progress_percentage")

          const avgProgress = enrollments && enrollments.length > 0
            ? Math.round(enrollments.reduce((sum: number, e: any) => sum + (e.progress_percentage || 0), 0) / enrollments.length)
            : 0

          // Get average rating across all courses from courses table (new rating system)
          const { data: allCourses } = await supabase
            .from("courses")
            .select("average_rating, total_ratings")
            .eq("status", "published")

          let avgRating = 0
          if (allCourses && allCourses.length > 0) {
            // Get average of all course ratings (only courses with ratings)
            const ratings = allCourses
              .filter((c: any) => c.average_rating && c.average_rating > 0 && c.total_ratings && c.total_ratings > 0)
              .map((c: any) => c.average_rating)
            
            avgRating = ratings.length > 0
              ? Math.round((ratings.reduce((sum: number, r: number) => sum + r, 0) / ratings.length) * 10) / 10
              : 0
          }

          setStats({
            courses: coursesCount || 0,
            progress: avgProgress,
            rating: avgRating, // Only use actual ratings, no fallback
            coursesBadge: (coursesCount || 0).toString(),
            booksBadge: (booksCount || 0).toString(),
            studentsBadge: (studentsCount || 0).toString(),
            usersBadge: (usersCount || 0).toString(),
            instructorsBadge: (instructorsCount || 0).toString()
          })
        }
      } catch (error) {
        console.error('Error fetching sidebar stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [userType, supabase])

  const sidebarItems = getSidebarItems()

  // Update sidebar items with real badge counts
  const updatedSidebarItems = sidebarItems.map(section => ({
    ...section,
    items: section.items.map(item => {
      if (item.href === '/student/courses' || item.href === '/instructor/courses') {
        return { ...item, badge: stats.coursesBadge }
      }
      if (item.href === '/student/books' || item.href === '/instructor/books') {
        return { ...item, badge: stats.booksBadge }
      }
      if (item.href === '/instructor/students') {
        return { ...item, badge: stats.studentsBadge }
      }
      if (item.href === '/admin/users') {
        return { ...item, badge: stats.usersBadge }
      }
      if (item.href === '/admin/instructors') {
        return { ...item, badge: stats.instructorsBadge }
      }
      if (item.href === '/admin/students') {
        return { ...item, badge: stats.studentsBadge }
      }
      if (item.href === '/admin/courses') {
        return { ...item, badge: stats.coursesBadge }
      }
      if (item.href === '/admin/books') {
        return { ...item, badge: stats.booksBadge }
      }
      return item
    })
  }))

  return (
    <div className={cn("w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 h-full", className)}>
      <div className="p-6">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 mb-8">
          <span className="text-2xl font-bold tracking-tight">
            <span className="text-black dark:text-white">gomy</span>
            <span className="text-blue-400">co</span>
            <span className="text-black dark:text-white">urs</span>
          </span>
        </Link>

        {/* Navigation */}
        <nav className="space-y-6">
          {updatedSidebarItems.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || 
                    (item.href !== '/' && pathname.startsWith(item.href))
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onLinkClick}
                      className={cn(
                        "group flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                        isActive
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                          : "text-gray-700 hover:text-blue-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-gray-800"
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {item.badge}
                        </Badge>
                      )}
                      {isActive && (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Quick Stats */}
        <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            {tDashboard('quickStats')}
          </h4>
          {loading ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{tCommon('loading')}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{tCommon('courses')}</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {stats.courses}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{tDashboard('progress')}</span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {stats.progress}%
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{tDashboard('rating')}</span>
                {stats.rating > 0 ? (
                  <div className="flex items-center space-x-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-current" />
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {stats.rating.toFixed(1)}
                    </span>
                  </div>
                ) : (
                  <span className="font-semibold text-gray-500 dark:text-gray-400 text-xs">
                    {tDashboard('notAvailable')}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

