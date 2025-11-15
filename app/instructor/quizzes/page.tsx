"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  BarChart3, 
  Clock, 
  Users, 
  Target,
  CheckCircle,
  XCircle,
  PlayCircle,
  Settings,
  Copy,
  Share2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Quiz {
  id: string
  title: string
  description: string
  time_limit: number | null
  max_attempts: number
  passing_score: number
  is_published: boolean
  is_randomized: boolean
  show_correct_answers: boolean
  show_results_immediately: boolean
  created_at: string
  course_id: string
  module_id: string
  questions_count?: number
  analytics?: {
    total_attempts: number
    total_students: number
    average_score: number
    pass_rate: number
  }
}

interface Course {
  id: string
  title: string
  modules: Module[]
}

interface Module {
  id: string
  title: string
  course_id: string
}

interface Lesson {
  id: string
  title: string
  module_id: string
}

export default function QuizManagement() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCourse, setFilterCourse] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  
  const supabase = createClient()
  const router = useRouter()

  // Form state for creating/editing quizzes
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course_id: '',
    module_id: '',
    lesson_id: '',
    time_limit: '',
    max_attempts: 3,
    passing_score: 70,
    is_published: false,
    is_randomized: false,
    show_correct_answers: true,
    show_results_immediately: true,
    instructions: ''
  })

  const [lessons, setLessons] = useState<Lesson[]>([])

  useEffect(() => {
    fetchQuizzes()
    fetchCourses()
  }, [])

  // Load lessons whenever module changes
  useEffect(() => {
    const loadLessons = async () => {
      if (!formData.module_id) {
        setLessons([])
        return
      }
      const { data, error } = await supabase
        .from('lessons')
        .select('id,title,module_id')
        .eq('module_id', formData.module_id)
        .order('order_index', { ascending: true })
      if (!error) setLessons(data || [])
    }
    loadLessons()
  }, [formData.module_id, supabase])

  const fetchQuizzes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch instructor course IDs first to avoid joining restricted tables
      const { data: instructorCourses, error: coursesError } = await supabase
        .from('courses')
        .select('id')
        .eq('instructor_id', user.id)

      if (coursesError) throw coursesError

      const courseIds = (instructorCourses || []).map((c: any) => c.id)

      // Fetch quizzes created by the instructor
      const { data: createdByMe, error: createdError } = await supabase
        .from('quizzes')
        .select(`*`)
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })

      if (createdError) throw createdError

      // Fetch quizzes in instructor's courses
      let byCourse: any[] = []
      if (courseIds.length > 0) {
        const { data: courseQuizzes, error: byCourseError } = await supabase
          .from('quizzes')
          .select(`*`)
          .in('course_id', courseIds)
          .order('created_at', { ascending: false })

        if (byCourseError) throw byCourseError
        byCourse = courseQuizzes || []
      }

      // Merge and de-duplicate by id
      const mergedMap: Record<string, any> = {}
      ;(createdByMe || []).forEach((q: any) => { mergedMap[q.id] = q })
      byCourse.forEach((q: any) => { mergedMap[q.id] = q })
      const merged = Object.values(mergedMap)

      // Get question counts for each quiz
      const quizzesWithCounts = await Promise.all(
        merged.map(async (quiz: any) => {
          const { count } = await supabase
            .from('quiz_questions')
            .select('*', { count: 'exact', head: true })
            .eq('quiz_id', quiz.id)
          
          return {
            ...quiz,
            questions_count: count || 0
          }
        })
      )

      setQuizzes(quizzesWithCounts)
    } catch (error) {
      console.error('Error fetching quizzes:', error)
      // Fail gracefully: show empty list if the table/schema is not ready yet
      setQuizzes([])
    } finally {
      setLoading(false)
    }
  }

  const fetchCourses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          modules(id, title, course_id)
        `)
        .eq('instructor_id', user.id)

      if (error) throw error
      setCourses(data || [])
    } catch (error) {
      console.error('Error fetching courses:', error)
    }
  }

  const handleCreateQuiz = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Send only known columns to avoid schema cache errors (e.g., missing 'instructions')
      const quizData = {
        title: formData.title,
        description: formData.description,
        course_id: formData.course_id,
        module_id: formData.module_id === 'none' ? null : formData.module_id,
        lesson_id: formData.lesson_id,
        time_limit: formData.time_limit ? parseInt(formData.time_limit) : null,
        max_attempts: formData.max_attempts,
        passing_score: formData.passing_score,
        is_published: formData.is_published,
        is_randomized: formData.is_randomized,
        show_correct_answers: formData.show_correct_answers,
        show_results_immediately: formData.show_results_immediately,
        created_by: user.id,
      }

      const { data, error } = await supabase
        .from('quizzes')
        .insert(quizData)
        .select()
        .single()

      if (error) throw error

      // Initialize analytics
      await supabase
        .from('quiz_analytics')
        .insert({
          quiz_id: data.id,
          total_attempts: 0,
          total_students: 0,
          average_score: 0,
          pass_rate: 0,
          average_time_spent: 0
        })

      setIsCreateDialogOpen(false)
      resetForm()
      fetchQuizzes()
      
      // Redirect to quiz editor
      router.push(`/instructor/quizzes/${data.id}/edit`)
    } catch (error) {
      console.error('Error creating quiz:', error)

      // Fallback: retry with minimal payload if schema cache is missing some columns (PGRST204)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const minimal = {
          title: formData.title,
          course_id: formData.course_id,
          created_by: user.id,
        }

        const { data: fallbackData, error: fallbackError } = await supabase
          .from('quizzes')
          .insert(minimal)
          .select()
          .single()

        if (fallbackError) throw fallbackError

        setIsCreateDialogOpen(false)
        resetForm()
        fetchQuizzes()
        router.push(`/instructor/quizzes/${fallbackData.id}/edit`)
      } catch (fallbackErr) {
        console.error('Create quiz fallback failed:', fallbackErr)
      }
    }
  }

  const handleUpdateQuiz = async () => {
    if (!editingQuiz) return

    try {
      // Send only known columns
      const updateData = {
        title: formData.title,
        description: formData.description,
        course_id: formData.course_id,
        module_id: formData.module_id === 'none' ? null : formData.module_id,
        lesson_id: formData.lesson_id,
        time_limit: formData.time_limit ? parseInt(formData.time_limit) : null,
        max_attempts: formData.max_attempts,
        passing_score: formData.passing_score,
        is_published: formData.is_published,
        is_randomized: formData.is_randomized,
        show_correct_answers: formData.show_correct_answers,
        show_results_immediately: formData.show_results_immediately,
      }

      const { error } = await supabase
        .from('quizzes')
        .update(updateData)
        .eq('id', editingQuiz.id)

      if (error) throw error

      setEditingQuiz(null)
      resetForm()
      fetchQuizzes()
    } catch (error) {
      console.error('Error updating quiz:', error)
    }
  }

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', quizId)

      if (error) throw error

      fetchQuizzes()
    } catch (error) {
      console.error('Error deleting quiz:', error)
    }
  }

  const toggleQuizStatus = async (quizId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('quizzes')
        .update({ is_published: !currentStatus })
        .eq('id', quizId)

      if (error) throw error

      fetchQuizzes()
    } catch (error) {
      console.error('Error updating quiz status:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      course_id: '',
      module_id: '',
      lesson_id: '',
      time_limit: '',
      max_attempts: 3,
      passing_score: 70,
      is_published: false,
      is_randomized: false,
      show_correct_answers: true,
      show_results_immediately: true,
      instructions: ''
    })
    setLessons([])
  }

  const openEditDialog = (quiz: Quiz) => {
    setEditingQuiz(quiz)
    setFormData({
      title: quiz.title,
      description: quiz.description,
      course_id: quiz.course_id,
      module_id: quiz.module_id,
      lesson_id: (quiz as any).lesson_id || '',
      time_limit: quiz.time_limit?.toString() || '',
      max_attempts: quiz.max_attempts,
      passing_score: quiz.passing_score,
      is_published: quiz.is_published,
      is_randomized: quiz.is_randomized,
      show_correct_answers: quiz.show_correct_answers,
      show_results_immediately: quiz.show_results_immediately,
      instructions: ''
    })
  }

  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quiz.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCourse = filterCourse === 'all' || quiz.course_id === filterCourse
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'published' && quiz.is_published) ||
                         (filterStatus === 'draft' && !quiz.is_published)
    
    return matchesSearch && matchesCourse && matchesStatus
  })

  const selectedCourse = courses.find(c => c.id === formData.course_id)
  const availableModules = selectedCourse?.modules || []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quiz Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Create and manage quizzes for your courses
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Quiz
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Quiz</DialogTitle>
              <DialogDescription>
                Set up a new quiz for your course
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Quiz Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter quiz title"
                  />
                </div>
                <div>
                  <Label htmlFor="course">Course</Label>
                  <Select value={formData.course_id} onValueChange={(value) => setFormData({ ...formData, course_id: value, module_id: '', lesson_id: '' })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="module">Module (Optional)</Label>
                <Select value={formData.module_id} onValueChange={(value) => setFormData({ ...formData, module_id: value, lesson_id: '' })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select module" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific module</SelectItem>
                    {availableModules.map((module) => (
                      <SelectItem key={module.id} value={module.id}>
                        {module.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="lesson">Lesson</Label>
                <Select value={formData.lesson_id} onValueChange={(value) => setFormData({ ...formData, lesson_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder={formData.module_id && formData.module_id !== 'none' ? 'Select lesson' : 'Select a module first'} />
                  </SelectTrigger>
                  <SelectContent>
                    {lessons.map((lesson) => (
                      <SelectItem key={lesson.id} value={lesson.id}>
                        {lesson.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter quiz description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="time_limit">Time Limit (minutes)</Label>
                  <Input
                    id="time_limit"
                    type="number"
                    value={formData.time_limit}
                    onChange={(e) => setFormData({ ...formData, time_limit: e.target.value })}
                    placeholder="No limit"
                  />
                </div>
                <div>
                  <Label htmlFor="max_attempts">Max Attempts</Label>
                  <Input
                    id="max_attempts"
                    type="number"
                    value={formData.max_attempts}
                    onChange={(e) => setFormData({ ...formData, max_attempts: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="passing_score">Passing Score (%)</Label>
                  <Input
                    id="passing_score"
                    type="number"
                    value={formData.passing_score}
                    onChange={(e) => setFormData({ ...formData, passing_score: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_published">Publish immediately</Label>
                  <Switch
                    id="is_published"
                    checked={formData.is_published}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_randomized">Randomize questions</Label>
                  <Switch
                    id="is_randomized"
                    checked={formData.is_randomized}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_randomized: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_correct_answers">Show correct answers</Label>
                  <Switch
                    id="show_correct_answers"
                    checked={formData.show_correct_answers}
                    onCheckedChange={(checked) => setFormData({ ...formData, show_correct_answers: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_results_immediately">Show results immediately</Label>
                  <Switch
                    id="show_results_immediately"
                    checked={formData.show_results_immediately}
                    onCheckedChange={(checked) => setFormData({ ...formData, show_results_immediately: checked })}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateQuiz} disabled={!formData.title || !formData.course_id || !formData.lesson_id}>
                  Create Quiz
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <Input
            placeholder="Search quizzes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Select value={filterCourse} onValueChange={setFilterCourse}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by course" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {courses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quizzes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredQuizzes.map((quiz) => (
          <Card key={quiz.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{quiz.title}</CardTitle>
                  <CardDescription className="mt-1">
                    {quiz.description || 'No description'}
                  </CardDescription>
                </div>
                <Badge variant={quiz.is_published ? "default" : "secondary"}>
                  {quiz.is_published ? 'Published' : 'Draft'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Quiz Stats */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <PlayCircle className="w-4 h-4 text-blue-600" />
                    <span>{quiz.questions_count || 0} questions</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-green-600" />
                    <span>{quiz.time_limit ? `${quiz.time_limit}m` : 'No limit'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Target className="w-4 h-4 text-purple-600" />
                    <span>{quiz.passing_score}% to pass</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-orange-600" />
                    <span>{quiz.max_attempts} attempts</span>
                  </div>
                </div>

                {/* Analytics */}
                {quiz.analytics && (
                  <div className="pt-3 border-t">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Attempts:</span>
                        <span className="ml-1 font-medium">{quiz.analytics.total_attempts}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Students:</span>
                        <span className="ml-1 font-medium">{quiz.analytics.total_students}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Avg Score:</span>
                        <span className="ml-1 font-medium">{quiz.analytics.average_score.toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Pass Rate:</span>
                        <span className="ml-1 font-medium">{quiz.analytics.pass_rate.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-3">
                  <div className="flex space-x-1">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/instructor/quizzes/${quiz.id}/edit`}>
                        <Edit className="w-4 h-4" />
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/instructor/quizzes/${quiz.id}/analytics`}>
                        <BarChart3 className="w-4 h-4" />
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/instructor/quizzes/${quiz.id}/preview`}>
                        <Eye className="w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleQuizStatus(quiz.id, quiz.is_published)}
                    >
                      {quiz.is_published ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteQuiz(quiz.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredQuizzes.length === 0 && (
        <div className="text-center py-12">
          <PlayCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No quizzes found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchTerm || filterCourse !== 'all' || filterStatus !== 'all'
              ? 'Try adjusting your filters or search terms'
              : 'Create your first quiz to get started'}
          </p>
          {(!searchTerm && filterCourse === 'all' && filterStatus === 'all') && (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Quiz
            </Button>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingQuiz} onOpenChange={() => setEditingQuiz(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Quiz</DialogTitle>
            <DialogDescription>
              Update quiz settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-title">Quiz Title</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter quiz title"
                />
              </div>
              <div>
                <Label htmlFor="edit-course">Course</Label>
                <Select value={formData.course_id} onValueChange={(value) => setFormData({ ...formData, course_id: value, module_id: '' })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter quiz description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-time_limit">Time Limit (minutes)</Label>
                <Input
                  id="edit-time_limit"
                  type="number"
                  value={formData.time_limit}
                  onChange={(e) => setFormData({ ...formData, time_limit: e.target.value })}
                  placeholder="No limit"
                />
              </div>
              <div>
                <Label htmlFor="edit-max_attempts">Max Attempts</Label>
                <Input
                  id="edit-max_attempts"
                  type="number"
                  value={formData.max_attempts}
                  onChange={(e) => setFormData({ ...formData, max_attempts: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="edit-passing_score">Passing Score (%)</Label>
                <Input
                  id="edit-passing_score"
                  type="number"
                  value={formData.passing_score}
                  onChange={(e) => setFormData({ ...formData, passing_score: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-is_published">Published</Label>
                <Switch
                  id="edit-is_published"
                  checked={formData.is_published}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-is_randomized">Randomize questions</Label>
                <Switch
                  id="edit-is_randomized"
                  checked={formData.is_randomized}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_randomized: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-show_correct_answers">Show correct answers</Label>
                <Switch
                  id="edit-show_correct_answers"
                  checked={formData.show_correct_answers}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_correct_answers: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-show_results_immediately">Show results immediately</Label>
                <Switch
                  id="edit-show_results_immediately"
                  checked={formData.show_results_immediately}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_results_immediately: checked })}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditingQuiz(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateQuiz} disabled={!formData.title || !formData.course_id}>
                Update Quiz
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

