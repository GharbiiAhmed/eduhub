"use client"

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  PlayCircle, 
  Clock, 
  CheckCircle, 
  BookOpen, 
  Calendar, 
  Star,
  Eye,
  Download,
  BookMarked,
  Target,
  TrendingUp
} from "lucide-react"
import Link from "next/link"

interface Lesson {
  id: string
  title: string
  description: string
  duration: number
  course_id: string
  course_title: string
  module_title: string
  is_completed: boolean
  completion_date?: string
  progress_percentage: number
  video_url?: string
  materials_url?: string
  is_preview: boolean
}

export default function StudentLessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'recent' | 'completed' | 'in-progress'>('recent')

  const supabase = createClient()

  useEffect(() => {
    fetchLessons()
  }, [])

  const fetchLessons = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get all enrollments for the student
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from("enrollments")
        .select(`
          course_id,
          courses!inner(id, title)
        `)
        .eq("student_id", user.id)

      if (enrollmentsError) throw enrollmentsError
      if (!enrollments || enrollments.length === 0) {
        setLessons([])
        setLoading(false)
        return
      }

      // Get all lessons from enrolled courses with progress
      const courseIds = enrollments.map(e => e.course_id)
      
      const { data: lessons, error: lessonsError } = await supabase
        .from("lessons")
        .select(`
          id,
          title,
          description,
          duration_minutes,
          video_url,
          pdf_url,
          modules!inner(id, title, course_id, courses!inner(id, title))
        `)
        .in("modules.course_id", courseIds)
        .order("modules.order_index", { ascending: true })
        .order("order_index", { ascending: true })

      if (lessonsError) throw lessonsError

      // Get lesson progress for each lesson
      const lessonIds = lessons?.map(l => l.id) || []
      
      const { data: lessonProgress, error: progressError } = await supabase
        .from("lesson_progress")
        .select("*")
        .eq("student_id", user.id)
        .in("lesson_id", lessonIds)

      if (progressError) throw progressError

      // Combine lessons with progress data
      const lessonsWithProgress: Lesson[] = (lessons || []).map(lesson => {
        const progress = lessonProgress?.find(p => p.lesson_id === lesson.id)
        const module = lesson.modules as any
        const course = module?.courses as any

        return {
          id: lesson.id,
          title: lesson.title,
          description: lesson.description || '',
          duration: lesson.duration_minutes || 0,
          course_id: course?.id || '',
          course_title: course?.title || '',
          module_title: module?.title || '',
          is_completed: progress?.completed || false,
          completion_date: progress?.completed_at || undefined,
          progress_percentage: progress?.completed ? 100 : 0,
          video_url: lesson.video_url || undefined,
          materials_url: lesson.pdf_url || undefined,
          is_preview: false // Preview lessons would need to be determined by course settings
        }
      })

      setLessons(lessonsWithProgress)
    } catch (error) {
      console.error('Error fetching lessons:', error)
    } finally {
      setLoading(false)
    }
  }

  const getFilteredLessons = () => {
    switch (filter) {
      case 'recent':
        return lessons.slice(0, 5) // Most recent 5 lessons
      case 'completed':
        return lessons.filter(lesson => lesson.is_completed)
      case 'in-progress':
        return lessons.filter(lesson => !lesson.is_completed && lesson.progress_percentage > 0)
      default:
        return lessons
    }
  }

  const getFilterStats = () => {
    const total = lessons.length
    const completed = lessons.filter(l => l.is_completed).length
    const inProgress = lessons.filter(l => !l.is_completed && l.progress_percentage > 0).length
    const notStarted = lessons.filter(l => !l.is_completed && l.progress_percentage === 0).length

    return { total, completed, inProgress, notStarted }
  }

  const stats = getFilterStats()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Recent Lessons</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Continue your learning journey with these lessons
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <PlayCircle className="w-3 h-3 mr-1" />
            {stats.total} Lessons
          </Badge>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Lessons</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              All lessons
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">
              Finished lessons
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">
              Currently learning
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Not Started</CardTitle>
            <Target className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.notStarted}</div>
            <p className="text-xs text-muted-foreground">
              Ready to start
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <BookMarked className="w-5 h-5 mr-2 text-purple-600" />
              Lesson Library
            </CardTitle>
            <div className="flex space-x-2">
              {(['all', 'recent', 'completed', 'in-progress'] as const).map((filterType) => (
                <Button
                  key={filterType}
                  variant={filter === filterType ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(filterType)}
                  className="capitalize"
                >
                  {filterType.replace('-', ' ')}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {getFilteredLessons().length === 0 ? (
            <div className="text-center py-12">
              <PlayCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Lessons Found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {filter === 'completed' ? 'Complete some lessons to see them here' : 
                 filter === 'in-progress' ? 'Start a lesson to see it here' : 
                 'No lessons available'}
              </p>
              <Button asChild>
                <Link href="/courses">
                  Browse Courses
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {getFilteredLessons().map((lesson) => (
                <div key={lesson.id} className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {lesson.title}
                        </h3>
                        {lesson.is_preview && (
                          <Badge variant="secondary" className="text-xs">
                            Preview
                          </Badge>
                        )}
                        {lesson.is_completed && (
                          <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">
                            Completed
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                        {lesson.description}
                      </p>

                      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                        <div className="flex items-center space-x-1">
                          <BookOpen className="w-4 h-4" />
                          <span>{lesson.course_title}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{lesson.duration} min</span>
                        </div>
                        {lesson.completion_date && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>
                              Completed {new Date(lesson.completion_date).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Progress Bar */}
                      {!lesson.is_completed && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Progress</span>
                            <span className="font-semibold">{lesson.progress_percentage}%</span>
                          </div>
                          <Progress value={lesson.progress_percentage} className="h-2" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/student/lessons/${lesson.id}`}>
                          <PlayCircle className="w-4 h-4 mr-2" />
                          {lesson.is_completed ? 'Review' : 'Continue'}
                        </Link>
                      </Button>
                      {lesson.materials_url && (
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="w-5 h-5 mr-2 text-green-600" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-20 flex-col space-y-2" asChild>
              <Link href="/courses">
                <BookOpen className="w-6 h-6" />
                <span>Browse All Courses</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-20 flex-col space-y-2" asChild>
              <Link href="/student/courses">
                <PlayCircle className="w-6 h-6" />
                <span>My Courses</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-20 flex-col space-y-2" asChild>
              <Link href="/student/certificates">
                <Star className="w-6 h-6" />
                <span>My Certificates</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


