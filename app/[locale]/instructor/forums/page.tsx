"use client"

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  MessageSquare, 
  Search, 
  Filter, 
  Clock, 
  Users, 
  BookOpen,
  ChevronRight
} from "lucide-react"
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

interface Forum {
  id: string
  title: string
  description: string
  course_id: string
  course_title: string
  posts_count: number
  last_activity: string
  created_at: string
}

export default function InstructorForumsPage() {
  const t = useTranslations('forums')
  const tCommon = useTranslations('common')

  const [forums, setForums] = useState<Forum[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCourse, setFilterCourse] = useState('all')

  const supabase = createClient()

  useEffect(() => {
    fetchForums()
  }, [])

  const fetchForums = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Get courses taught by the instructor
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('id, title')
        .eq('instructor_id', user.id)

      if (coursesError) {
        console.error('Error fetching courses:', coursesError)
        setLoading(false)
        return
      }

      if (!courses || courses.length === 0) {
        setForums([])
        setLoading(false)
        return
      }

      const courseIds = courses.map(c => c.id).filter(Boolean)

      // Get forums for instructor's courses
      const { data, error } = await supabase
        .from('forums')
        .select(`
          *,
          courses!inner(
            id,
            title
          )
        `)
        .in('course_id', courseIds)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching forums:', error)
        setLoading(false)
        return
      }

      if (!data || data.length === 0) {
        setForums([])
        setLoading(false)
        return
      }

      // Get post counts for each forum
      const forumsWithCounts = await Promise.all(
        (data || []).map(async (forum: any) => {
          const { count } = await supabase
            .from('forum_posts')
            .select('*', { count: 'exact', head: true })
            .eq('forum_id', forum.id)
          
          // Get last activity
          const { data: lastPost } = await supabase
            .from('forum_posts')
            .select('created_at')
            .eq('forum_id', forum.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          
          return {
            id: forum.id,
            title: forum.title,
            description: forum.description || '',
            course_id: forum.course_id,
            course_title: (forum.courses as any)?.title || t('unknownCourse'),
            posts_count: count || 0,
            last_activity: lastPost?.created_at || forum.created_at,
            created_at: forum.created_at
          }
        })
      )

      setForums(forumsWithCounts)
    } catch (error) {
      console.error('Error fetching forums:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredForums = forums.filter(forum => {
    const matchesSearch = forum.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         forum.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCourse = filterCourse === 'all' || forum.course_id === filterCourse
    return matchesSearch && matchesCourse
  })

  const courses = [...new Set(forums.map(f => ({ id: f.course_id, title: f.course_title })))]

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('courseForums')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('manageDiscussionsAndEngage')}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder={t('searchForums')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <select
                value={filterCourse}
                onChange={(e) => setFilterCourse(e.target.value)}
                className="px-4 py-2 border rounded-lg bg-white dark:bg-gray-900"
              >
                <option value="all">{t('allCourses')}</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Forums List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
            {t('yourCourseForums')}
          </CardTitle>
          <CardDescription>
            {t('forumsForCoursesYouTeach')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredForums.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {t('noForumsYet')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {t('forumsWillAppearWhenStudentsCreate')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredForums.map((forum) => (
                <div key={forum.id} className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {forum.title}
                        </h3>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 mb-3">
                        {forum.description}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <BookOpen className="w-4 h-4" />
                          <span>{forum.course_title}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageSquare className="w-4 h-4" />
                          <span>{forum.posts_count} {t('posts')}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>
                            {new Date(forum.last_activity || forum.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/instructor/forums/${forum.id}`}>
                        {t('viewForum')}
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

