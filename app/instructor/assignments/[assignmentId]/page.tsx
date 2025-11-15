"use client"

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { 
  ArrowLeft, 
  FileText, 
  Calendar, 
  Users, 
  CheckCircle, 
  Clock, 
  GraduationCap,
  MessageSquare,
  Star,
  Download
} from 'lucide-react'
import Link from 'next/link'

interface Assignment {
  id: string
  title: string
  description: string
  instructions: string | null
  due_date: string | null
  max_points: number
  assignment_type: string
  is_published: boolean
  created_at: string
  courses: {
    id: string
    title: string
  }
}

interface Submission {
  id: string
  student_id: string
  submission_text: string | null
  file_url: string | null
  submitted_at: string
  status: string
  score: number | null
  feedback: string | null
  graded_at: string | null
  profiles: {
    id: string
    full_name: string
    email: string
  }
}

export default function AssignmentDetailPage() {
  const params = useParams()
  const assignmentId = params.assignmentId as string
  const router = useRouter()
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [gradingSubmission, setGradingSubmission] = useState<string | null>(null)
  const [gradeData, setGradeData] = useState({
    score: 0,
    feedback: ''
  })

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
      setSubmissions(data.submissions || [])
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

  const handleGradeSubmission = async (submissionId: string) => {
    try {
      setGradingSubmission(submissionId)
      const response = await fetch(`/api/assignments/${assignmentId}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId,
          score: gradeData.score,
          feedback: gradeData.feedback
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to grade assignment')
      }

      toast({
        title: "Success",
        description: "Assignment graded successfully.",
      })

      setGradeData({ score: 0, feedback: '' })
      setGradingSubmission(null)
      fetchAssignment()
    } catch (error: any) {
      console.error('Error grading assignment:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to grade assignment.",
      })
    } finally {
      setGradingSubmission(null)
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
            <Button onClick={() => router.push('/instructor/assignments')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Assignments
            </Button>
          </CardContent>
        </Card>
    )
  }

  return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/instructor/assignments')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{assignment.title}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {assignment.courses.title}
            </p>
          </div>
          {assignment.is_published ? (
            <Badge variant="default">Published</Badge>
          ) : (
            <Badge variant="secondary">Draft</Badge>
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
                      <p className="text-sm font-medium">{formatDate(assignment.due_date)}</p>
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

            <Card>
              <CardHeader>
                <CardTitle>Submissions ({submissions.length})</CardTitle>
                <CardDescription>
                  Review and grade student submissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {submissions.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                      No submissions yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {submissions.map((submission) => (
                      <Card key={submission.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">
                                {submission.profiles.full_name || submission.profiles.email}
                              </CardTitle>
                              <CardDescription>
                                Submitted {new Date(submission.submitted_at).toLocaleDateString()}
                              </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                              {submission.status === 'graded' ? (
                                <Badge variant="default" className="flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  Graded
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Pending
                                </Badge>
                              )}
                              {submission.score !== null && (
                                <Badge variant="outline">
                                  {submission.score} / {assignment.max_points} points
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {submission.submission_text && (
                            <div>
                              <Label className="text-sm font-semibold">Submission</Label>
                              <p className="text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-wrap">
                                {submission.submission_text}
                              </p>
                            </div>
                          )}

                          {submission.file_url && (
                            <div>
                              <Label className="text-sm font-semibold">File</Label>
                              <div className="mt-1">
                                <a
                                  href={submission.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                                >
                                  <Download className="w-4 h-4" />
                                  Download File
                                </a>
                              </div>
                            </div>
                          )}

                          {submission.status === 'graded' && submission.feedback && (
                            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                              <Label className="text-sm font-semibold">Feedback</Label>
                              <p className="text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">
                                {submission.feedback}
                              </p>
                            </div>
                          )}

                          {submission.status !== 'graded' && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  onClick={() => setGradeData({ score: 0, feedback: '' })}
                                >
                                  <Star className="w-4 h-4 mr-2" />
                                  Grade Submission
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Grade Submission</DialogTitle>
                                  <DialogDescription>
                                    Provide a score and feedback for this submission
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="score">Score (out of {assignment.max_points})</Label>
                                    <Input
                                      id="score"
                                      type="number"
                                      min="0"
                                      max={assignment.max_points}
                                      value={gradeData.score}
                                      onChange={(e) => setGradeData(prev => ({ ...prev, score: parseInt(e.target.value) || 0 }))}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="feedback">Feedback</Label>
                                    <Textarea
                                      id="feedback"
                                      value={gradeData.feedback}
                                      onChange={(e) => setGradeData(prev => ({ ...prev, feedback: e.target.value }))}
                                      placeholder="Provide feedback for the student..."
                                      rows={6}
                                    />
                                  </div>
                                  <div className="flex justify-end space-x-2">
                                    <Button
                                      variant="outline"
                                      onClick={() => setGradeData({ score: 0, feedback: '' })}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      onClick={() => handleGradeSubmission(submission.id)}
                                      disabled={gradingSubmission === submission.id}
                                    >
                                      {gradingSubmission === submission.id ? 'Grading...' : 'Submit Grade'}
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Total Submissions</p>
                  <p className="text-2xl font-bold">{submissions.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Graded</p>
                  <p className="text-2xl font-bold">
                    {submissions.filter(s => s.status === 'graded').length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-2xl font-bold">
                    {submissions.filter(s => s.status !== 'graded').length}
                  </p>
                </div>
                {submissions.filter(s => s.score !== null).length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500">Average Score</p>
                    <p className="text-2xl font-bold">
                      {Math.round(
                        submissions
                          .filter(s => s.score !== null)
                          .reduce((sum, s) => sum + (s.score || 0), 0) /
                        submissions.filter(s => s.score !== null).length
                      )} / {assignment.max_points}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  )
}

