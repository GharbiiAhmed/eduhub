"use client"

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { toast } from '@/hooks/use-toast'
import { 
  ArrowLeft, 
  FileText, 
  Calendar, 
  GraduationCap,
  CheckCircle,
  Clock,
  Upload,
  Download,
  AlertCircle
} from 'lucide-react'

interface Assignment {
  id: string
  title: string
  description: string
  instructions: string | null
  due_date: string | null
  max_points: number
  assignment_type: string
  courses: {
    id: string
    title: string
  }
}

interface Submission {
  id: string
  submission_text: string | null
  file_url: string | null
  submitted_at: string
  status: string
  score: number | null
  feedback: string | null
  graded_at: string | null
}

export default function StudentAssignmentDetailPage() {
  const params = useParams()
  const assignmentId = params.assignmentId as string
  const router = useRouter()
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionText, setSubmissionText] = useState('')
  const [fileUrl, setFileUrl] = useState('')

  useEffect(() => {
    if (assignmentId) {
      fetchAssignment()
    }
  }, [assignmentId])

  const fetchAssignment = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/assignments/${assignmentId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch assignment')
      }

      setAssignment(data.assignment)
      if (data.submission) {
        setSubmission(data.submission)
        setSubmissionText(data.submission.submission_text || '')
        setFileUrl(data.submission.file_url || '')
      }
    } catch (error: any) {
      console.error('Error fetching assignment:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to load assignment.",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // In a real app, you'd upload to Supabase Storage
    // For now, we'll just use a placeholder
    toast({
      title: "File Upload",
      description: "File upload functionality needs to be implemented with Supabase Storage.",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!submissionText.trim() && !fileUrl) {
      toast({
        title: "Error",
        description: "Please provide a submission text or upload a file.",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/assignments/${assignmentId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionText: submissionText.trim(),
          fileUrl: fileUrl || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit assignment')
      }

      toast({
        title: "Success",
        description: "Assignment submitted successfully.",
      })

      fetchAssignment()
    } catch (error: any) {
      console.error('Error submitting assignment:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to submit assignment.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No due date'
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

  if (loading) {
    return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
    )
  }

  if (!assignment) {
    return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Assignment not found
            </h3>
            <Button onClick={() => router.push('/student/assignments')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Assignments
            </Button>
          </CardContent>
        </Card>
    )
  }

  const overdue = isOverdue(assignment.due_date)
  const isGraded = submission?.status === 'graded'

  return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/student/assignments')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{assignment.title}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {assignment.courses.title}
            </p>
          </div>
          {isGraded ? (
            <Badge variant="default" className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Graded
            </Badge>
          ) : submission ? (
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Submitted
            </Badge>
          ) : (
            overdue && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Overdue
              </Badge>
            )
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Assignment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold">Description</Label>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">{assignment.description}</p>
                </div>

                {assignment.instructions && (
                  <div>
                    <Label className="text-sm font-semibold">Instructions</Label>
                    <p className="text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap">
                      {assignment.instructions}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Due Date</p>
                      <p className={`text-sm font-medium ${overdue ? 'text-red-600' : ''}`}>
                        {formatDate(assignment.due_date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Max Points</p>
                      <p className="text-sm font-medium">{assignment.max_points} points</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {isGraded && submission && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Grade</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-500">Score</p>
                      <p className="text-2xl font-bold text-green-600">
                        {submission.score} / {assignment.max_points}
                      </p>
                    </div>
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  </div>
                  {submission.feedback && (
                    <div>
                      <Label className="text-sm font-semibold">Instructor Feedback</Label>
                      <p className="text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">
                        {submission.feedback}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!isGraded && (
              <Card>
                <CardHeader>
                  <CardTitle>Submit Assignment</CardTitle>
                  <CardDescription>
                    {submission ? 'Update your submission' : 'Submit your assignment'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="submissionText">Your Submission *</Label>
                      <Textarea
                        id="submissionText"
                        value={submissionText}
                        onChange={(e) => setSubmissionText(e.target.value)}
                        placeholder="Write your assignment submission here..."
                        rows={10}
                        required={!fileUrl}
                      />
                    </div>

                    {assignment.assignment_type === 'file_upload' && (
                      <div className="space-y-2">
                        <Label htmlFor="file">Upload File</Label>
                        <Input
                          id="file"
                          type="file"
                          onChange={handleFileUpload}
                          accept=".pdf,.doc,.docx,.txt"
                        />
                        <p className="text-xs text-gray-500">
                          Accepted formats: PDF, DOC, DOCX, TXT
                        </p>
                      </div>
                    )}

                    {submission?.file_url && (
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <Label className="text-sm font-semibold">Current File</Label>
                        <div className="mt-2">
                          <a
                            href={submission.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                          >
                            <Download className="w-4 h-4" />
                            Download Current File
                          </a>
                        </div>
                      </div>
                    )}

                    <Button type="submit" disabled={isSubmitting} className="w-full">
                      {isSubmitting ? 'Submitting...' : submission ? 'Update Submission' : 'Submit Assignment'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Submission Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {submission ? (
                  <>
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <p className="text-lg font-semibold">
                        {submission.status === 'graded' ? 'Graded' : 'Submitted'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Submitted At</p>
                      <p className="text-lg font-semibold">
                        {new Date(submission.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                    {submission.score !== null && (
                      <div>
                        <p className="text-sm text-gray-500">Score</p>
                        <p className="text-2xl font-bold">
                          {submission.score} / {assignment.max_points}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p className="text-lg font-semibold">Not Submitted</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  )
}

