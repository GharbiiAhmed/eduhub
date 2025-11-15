"use client"

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { 
  MessageSquare, 
  Search, 
  Plus, 
  Filter, 
  Clock, 
  Users, 
  Eye,
  ThumbsUp,
  Reply,
  Pin,
  Lock,
  BookOpen,
  Calendar,
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
  is_pinned: boolean
  is_locked: boolean
  created_at: string
}

interface Post {
  id: string
  title: string
  content: string
  author_name: string
  author_email: string
  replies_count: number
  likes_count: number
  views_count: number
  created_at: string
  updated_at: string
}

export default function StudentForumsPage() {
  const t = useTranslations('forums')
  const tCommon = useTranslations('common')

  const [forums, setForums] = useState<Forum[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [enrolledCourses, setEnrolledCourses] = useState<Array<{ id: string; title: string }>>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCourse, setFilterCourse] = useState('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    course_id: ''
  })

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

      // First, get enrolled courses for the user
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', user.id)

      if (enrollmentsError) {
        console.error('Error fetching enrollments:', enrollmentsError)
        throw enrollmentsError
      }

      if (!enrollments || enrollments.length === 0) {
        setForums([])
        setLoading(false)
        return
      }

      // Get course IDs from enrollments
      const courseIds = enrollments.map(e => e.course_id).filter(Boolean)

      // Get enrolled courses with details
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, title')
        .in('id', courseIds)

      if (coursesError) {
        console.error('Error fetching courses:', coursesError)
      } else if (coursesData) {
        setEnrolledCourses(coursesData.map(c => ({ id: c.id, title: c.title })))
      }

      // Get forums for enrolled courses
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
        throw error
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
          
          // Get last activity (most recent post or forum creation)
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
            course_title: (forum.courses as any)?.title || 'Unknown Course',
            posts_count: count || 0,
            last_activity: lastPost?.created_at || forum.created_at,
            is_pinned: forum.is_pinned || false,
            is_locked: forum.is_locked || false,
            created_at: forum.created_at
          }
        })
      )

      setForums(forumsWithCounts)

      // Get forum IDs from the forums we fetched
      const forumIds = forumsWithCounts.map(f => f.id).filter(Boolean)

      // Fetch recent posts from enrolled courses only
      if (forumIds.length > 0) {
        // First, get posts with forums (without profiles to avoid RLS issues)
        const { data: postsData, error: postsError } = await supabase
          .from('forum_posts')
          .select(`
            *,
            forums(
              id,
              course_id
            )
          `)
          .in('forum_id', forumIds)
          .order('created_at', { ascending: false })
          .limit(10)

        if (postsError) {
          console.error('Error fetching posts:', postsError)
          console.error('Error details:', JSON.stringify(postsError, null, 2))
          // Don't throw - just set empty posts
          setPosts([])
        } else if (postsData && postsData.length > 0) {
          // Get course IDs from forums
          const courseIdsFromPosts = [...new Set(
            postsData
              .map((post: any) => (post.forums as any)?.course_id)
              .filter(Boolean)
          )]

          // Get course titles
          const { data: coursesData } = await supabase
            .from('courses')
            .select('id, title')
            .in('id', courseIdsFromPosts)

          // Create a map of course_id -> course_title
          const courseTitleMap = new Map(
            (coursesData || []).map(c => [c.id, c.title])
          )

          // Get author IDs from posts
          const authorIds = [...new Set(postsData.map((post: any) => post.author_id).filter(Boolean))]
          
          // Get profiles for authors
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', authorIds)

          if (profilesError) {
            console.error('Error fetching profiles:', profilesError)
          }

          console.log('Author IDs:', authorIds)
          console.log('Profiles data:', profilesData)
          console.log('Posts data:', postsData.map((p: any) => ({ id: p.id, author_id: p.author_id })))

          // Create a map of author_id -> profile
          const profileMap = new Map(
            (profilesData || []).map(p => [p.id, p])
          )
          
          console.log('Profile map:', Array.from(profileMap.entries()))

          // Get counts for each post
          const formattedPosts = await Promise.all(
            postsData.map(async (post: any) => {
              // Get replies count
              const { count: repliesCount } = await supabase
                .from('forum_replies')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', post.id)

              const forum = post.forums as any
              const courseTitle = forum?.course_id 
                ? courseTitleMap.get(forum.course_id) || 'Unknown Course'
                : 'Unknown Course'

              const profile = profileMap.get(post.author_id)
              
              // Get author name - use full_name, or email username, or fallback to Anonymous
              let authorName = 'Anonymous'
              if (profile) {
                if (profile.full_name && profile.full_name.trim()) {
                  authorName = profile.full_name
                } else if (profile.email) {
                  // Use email username (part before @) as fallback
                  authorName = profile.email.split('@')[0]
                }
              } else if (post.author_id) {
                // If profile not found, try to get email from auth.users
                // For now, just use a generic name
                authorName = 'User'
              }
              
              return {
                id: post.id,
                title: post.title,
                content: post.content,
                author_name: authorName,
                author_email: profile?.email || '',
                course_title: courseTitle,
                replies_count: repliesCount || 0,
                likes_count: 0, // Likes would need a separate table (forum_post_likes)
                views_count: 0, // Views would need tracking (forum_post_views)
                created_at: post.created_at,
                updated_at: post.updated_at
              }
            })
          )

          setPosts(formattedPosts)
        } else {
          setPosts([])
        }
      } else {
        setPosts([])
      }
    } catch (error) {
      console.error('Error fetching forums:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePost = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (!newPost.course_id) {
        console.error('Please select a course')
        return
      }

      if (!newPost.title.trim() || !newPost.content.trim()) {
        console.error('Please fill in title and content')
        return
      }

      // Find or create forum for the selected course
      let forum = forums.find(f => f.course_id === newPost.course_id)
      
      if (!forum) {
        // Get course details
        const course = enrolledCourses.find(c => c.id === newPost.course_id)
        if (!course) {
          console.error('Course not found')
          return
        }

        // Create a forum for this course via API endpoint
        const response = await fetch('/api/forums/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            courseId: newPost.course_id,
            title: `${course.title} Discussion`,
            description: `Discussion forum for ${course.title}`
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error('Error creating forum:', errorData)
          throw new Error(errorData.error || 'Failed to create forum')
        }

        const { forum: newForum } = await response.json()

        forum = {
          id: newForum.id,
          course_id: newForum.course_id,
          course_title: course.title,
          title: newForum.title,
          description: newForum.description || '',
          posts_count: 0,
          last_activity: newForum.created_at,
          is_pinned: false,
          is_locked: false,
          created_at: newForum.created_at
        }
      }

      // Create the post
      const { error } = await supabase
        .from('forum_posts')
        .insert({
          forum_id: forum.id,
          title: newPost.title,
          content: newPost.content,
          author_id: user.id
        })

      if (error) {
        console.error('Error creating post:', error)
        throw error
      }

      setNewPost({ title: '', content: '', course_id: '' })
      setShowCreateDialog(false)
      fetchForums()
    } catch (error) {
      console.error('Error creating post:', error)
    }
  }

  const filteredForums = forums.filter(forum => {
    const matchesSearch = forum.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         forum.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCourse = filterCourse === 'all' || forum.course_id === filterCourse
    return matchesSearch && matchesCourse
  })

  // Use enrolled courses for dropdown (not just courses with forums)
  const coursesForDropdown = enrolledCourses.length > 0 ? enrolledCourses : [...new Set(forums.map(f => ({ id: f.course_id, title: f.course_title })))]
  
  // For filter dropdown, use courses that have forums
  const coursesForFilter = [...new Set(forums.map(f => ({ id: f.course_id, title: f.course_title })))]

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('connectWithStudents')}
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>{t('newPost')}</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('createNewPost')}</DialogTitle>
              <DialogDescription>
                {t('shareThoughtsOrAskQuestions')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">{tCommon('courses')}</label>
                <Select value={newPost.course_id} onValueChange={(value) => setNewPost(prev => ({ ...prev, course_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectCourse')} />
                  </SelectTrigger>
                  <SelectContent>
                    {coursesForDropdown.length === 0 ? (
                      <SelectItem value="" disabled>{t('noEnrolledCourses')}</SelectItem>
                    ) : (
                      coursesForDropdown.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('postTitle')}</label>
                <Input
                  placeholder={t('postTitlePlaceholder')}
                  value={newPost.title}
                  onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('postContent')}</label>
                <Textarea
                  placeholder={t('writeYourPost')}
                  rows={6}
                  value={newPost.content}
                  onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  {tCommon('cancel')}
                </Button>
                <Button onClick={handleCreatePost}>
                  {t('createPost')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder={t('searchForumsAndPosts')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <Select value={filterCourse} onValueChange={setFilterCourse}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={t('filterByCourse')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allCourses')}</SelectItem>
                  {coursesForFilter.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Forums List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
                {t('courseForums')}
              </CardTitle>
              <CardDescription>
                {t('discussionForumsForEnrolledCourses')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredForums.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {enrolledCourses.length > 0 ? t('noPosts') : t('noForumsAvailable')}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {enrolledCourses.length > 0 
                      ? t('forumsAutoCreate')
                      : t('enrollInCoursesToSeeForums')}
                  </p>
                  {enrolledCourses.length === 0 && (
                    <Button asChild>
                      <Link href="/courses">
                        {tCommon('browseCourses')}
                      </Link>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredForums.map((forum) => (
                    <div key={forum.id} className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            {forum.is_pinned && (
                              <Pin className="w-4 h-4 text-red-500" />
                            )}
                            {forum.is_locked && (
                              <Lock className="w-4 h-4 text-gray-500" />
                            )}
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
                          <Link href={`/student/forums/${forum.id}`}>
                            <ChevronRight className="w-4 h-4" />
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

        {/* Recent Posts */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2 text-green-600" />
                {t('recentPosts')}
              </CardTitle>
              <CardDescription>
                {t('latestDiscussionsAcrossForums')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {posts.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('noRecentPosts')}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <div key={post.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 line-clamp-2">
                        {post.title}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        {t('by')} {post.author_name} {t('in')} {post.course_title}
                      </p>
                      <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Reply className="w-3 h-3" />
                          <span>{post.replies_count}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <ThumbsUp className="w-3 h-3" />
                          <span>{post.likes_count}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Eye className="w-3 h-3" />
                          <span>{post.views_count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2 text-purple-600" />
                {t('communityStats')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t('totalForums')}</span>
                  <span className="font-semibold">{forums.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t('totalPosts')}</span>
                  <span className="font-semibold">{forums.reduce((sum, f) => sum + f.posts_count, 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t('activeCourses')}</span>
                  <span className="font-semibold">{enrolledCourses.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}