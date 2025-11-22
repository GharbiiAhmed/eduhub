"use client"

import { useState, useEffect } from 'react'
import { useRouter } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { useTranslations } from 'next-intl'
import {
  FileText, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ArrowRight,
  GraduationCap
} from 'lucide-react'

interface Assignment {
  id: string
  title: string
  description: string
  due_date: string | null
  max_points: number
  assignment_type: string
  created_at: string
  courses: {
    id: string
    title: string
  }
  assignment_submissions: Array<{
    id: string
    status: string
    score: number | null
    submitted_at: string
  }> | null
}

export default function StudentAssignmentsPage() {
  const t = useTranslations('assignments')
  const tCommon = useTranslations('common')

  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchAssignments()
  }, [])

  const fetchAssignments = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${window.location.origin}/api/assignments?role=student`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || tCommon('error'))
      }

      setAssignments(data.assignments || [])
    } catch (error: any) {
      console.error('Error fetching assignments:', error)
      toast({
        title: tCommon('error'),
        description: error.message || t('noAssignmentsDesc'),
      })
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t('dueDate')
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  const getSubmissionStatus = (assignment: Assignment) => {
    const submission = assignment.assignment_submissions?.[0]
    if (!submission) return { status: 'not_submitted', label: t('notSubmitted'), variant: 'secondary' as const }
    
    if (submission.status === 'graded') {
      return { 
        status: 'graded', 
        label: t('graded'), 
        variant: 'default' as const,
        score: submission.score
      }
    }
    return { status: 'submitted', label: t('submitted'), variant: 'outline' as const }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('myAssignments')}
          </p>
        </div>

        {assignments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t('noAssignments')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t('noAssignmentsDesc')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {assignments.map((assignment) => {
              const submissionStatus = getSubmissionStatus(assignment)
              const overdue = isOverdue(assignment.due_date)

              return (
                <Card key={assignment.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle>{assignment.title}</CardTitle>
                          {overdue && submissionStatus.status === 'not_submitted' && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {t('overdue')}
                            </Badge>
                          )}
                          <Badge variant={submissionStatus.variant}>
                            {submissionStatus.label}
                          </Badge>
                        </div>
                        <CardDescription className="mt-2">
                          {assignment.courses.title}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {assignment.description}
                    </p>
                    <div className="flex items-center gap-3 sm:gap-6 text-sm text-gray-500 dark:text-gray-400 mb-2 sm:mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(assignment.due_date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4" />
                        <span>{assignment.max_points} {t('points')}</span>
                      </div>
                      {submissionStatus.score !== null && submissionStatus.score !== undefined && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="font-semibold">
                            {t('score')}: {submissionStatus.score} / {assignment.max_points}
                          </span>
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={() => router.push(`/student/assignments/${assignment.id}`)}
                      className="w-full"
                    >
                      {submissionStatus.status === 'not_submitted' ? t('submitAssignment') : t('viewAssignment')}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
  )
}

