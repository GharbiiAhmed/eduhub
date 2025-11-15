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
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'

interface Assignment {
  id: string
  course_id: string
  title: string
  description: string
  assignment_type: string
  max_points: number
  due_date: string | null
  courses: {
    title: string
  } | null
}

interface Submission {
  id: string
  assignment_id: string
  student_id: string
  submission_text: string | null
  submission_url: string | null
  grade: number | null
  feedback: string | null
  status: string
  submitted_at: string | null
  graded_at: string | null
}

export default function StudentAssignmentDetailPage() {
  const t = useTranslations('assignments')
  const tCommon = useTranslations('common')

  const params = useParams()
  const assignmentId = params.assignmentId as string
  const router = useRouter()
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submissionText, setSubmissionText] = useState("")
  const [submissionFile, setSubmissionFile] = useState<File | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchAssignment()
    fetchSubmission()
  }, [assignmentId])

  const fetchAssignment = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("assignments")
        .select(`
          *,
          courses (
            title
          )
        `)
        .eq("id", assignmentId)
        .single()

      if (error) throw error
      setAssignment(data)
    } catch (error) {
      console.error("Error fetching assignment:", error)
      toast({
        title: tCommon('error'),
        description: "Failed to load assignment",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchSubmission = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("assignment_submissions")
        .select("*")
        .eq("assignment_id", assignmentId)
        .eq("student_id", user.id)
        .maybeSingle()

      if (error) throw error
      if (data) {
        setSubmission(data)
        setSubmissionText(data.submission_text || "")
      }
    } catch (error) {
      console.error("Error fetching submission:", error)
    }
  }

  const handleFileUpload = async (file: File): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated")

    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}-${Date.now()}.${fileExt}`
    const filePath = `assignments/${assignmentId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from("assignments")
      .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from("assignments")
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({
          title: tCommon('error'),
          description: "You must be logged in to submit",
          variant: "destructive",
        })
        return
      }

      let submissionUrl = submission?.submission_url || null

      if (submissionFile) {
        submissionUrl = await handleFileUpload(submissionFile)
      }

      const submissionData = {
        assignment_id: assignmentId,
        student_id: user.id,
        submission_text: submissionText || null,
        submission_url: submissionUrl,
        status: "submitted",
      }

      if (submission) {
        // Update existing submission
        const { error } = await supabase
          .from("assignment_submissions")
          .update(submissionData)
          .eq("id", submission.id)

        if (error) throw error
        toast({
          title: tCommon('success'),
          description: t('updateSubmission'),
        })
      } else {
        // Create new submission
        const { error } = await supabase
          .from("assignment_submissions")
          .insert(submissionData)

        if (error) throw error
        toast({
          title: tCommon('success'),
          description: t('submitAssignment'),
        })
      }

      await fetchSubmission()
      setSubmissionFile(null)
    } catch (error: any) {
      console.error("Error submitting assignment:", error)
      toast({
        title: tCommon('error'),
        description: error.message || "Failed to submit assignment",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{tCommon('loading')}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!assignment) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">{t('assignmentDetails')}</h3>
              <p className="text-muted-foreground mb-4">Assignment not found</p>
              <Button onClick={() => router.back()}>{tCommon('back')}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isOverdue = assignment.due_date && new Date(assignment.due_date) < new Date() && !submission
  const isSubmitted = submission?.status === "submitted"
  const isGraded = submission?.grade !== null

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {tCommon('back')}
      </Button>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{assignment.title}</CardTitle>
                  <CardDescription className="mt-2">
                    {assignment.courses?.title && (
                      <div className="flex items-center gap-2 mt-2">
                        <GraduationCap className="w-4 h-4" />
                        {assignment.courses.title}
                      </div>
                    )}
                  </CardDescription>
                </div>
                {isOverdue && (
                  <Badge variant="destructive">{t('overdue')}</Badge>
                )}
                {isGraded && (
                  <Badge variant="default" className="bg-green-600">
                    {t('graded')}
                  </Badge>
                )}
                {isSubmitted && !isGraded && (
                  <Badge variant="secondary">{t('submitted')}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {assignment.due_date && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{t('dueDate')}: {new Date(assignment.due_date).toLocaleDateString()}</span>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-2">{t('description')}</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{assignment.description}</p>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="capitalize">{assignment.assignment_type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>{t('maxPoints')}: {assignment.max_points} {t('points')}</span>
                </div>
              </div>

              {isGraded && submission && (
                <div className="border-t pt-6 space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">{t('yourGrade')}</h3>
                    <div className="text-2xl font-bold text-primary">
                      {submission.grade} / {assignment.max_points}
                    </div>
                  </div>
                  {submission.feedback && (
                    <div>
                      <h3 className="font-semibold mb-2">{t('instructorFeedback')}</h3>
                      <p className="text-muted-foreground whitespace-pre-wrap">{submission.feedback}</p>
                    </div>
                  )}
                </div>
              )}

              {submission?.submission_url && (
                <div>
                  <h3 className="font-semibold mb-2">{t('submission')}</h3>
                  <a
                    href={submission.submission_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <Download className="w-4 h-4" />
                    {t('download')} {tCommon('submission')}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {!isGraded && (
            <Card>
              <CardHeader>
                <CardTitle>{submission ? t('updateSubmission') : t('yourSubmission')}</CardTitle>
                <CardDescription>
                  {submission ? t('updateSubmission') : t('submissionStatus')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {assignment.assignment_type === "text" || assignment.assignment_type === "essay" ? (
                    <div>
                      <Label htmlFor="submissionText">{t('instructions')}</Label>
                      <Textarea
                        id="submissionText"
                        value={submissionText}
                        onChange={(e) => setSubmissionText(e.target.value)}
                        placeholder={t('enterYourSubmission')}
                        rows={10}
                        required={assignment.assignment_type === "text" || assignment.assignment_type === "essay"}
                      />
                    </div>
                  ) : null}

                  {(assignment.assignment_type === "file" || assignment.assignment_type === "project") && (
                    <div>
                      <Label htmlFor="submissionFile">{t('fileUpload')}</Label>
                      <Input
                        id="submissionFile"
                        type="file"
                        onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)}
                        required={assignment.assignment_type === "file" || assignment.assignment_type === "project"}
                      />
                    </div>
                  )}

                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting ? tCommon('loading') : submission ? t('updateSubmission') : t('submitAssignment')}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('submissionStatus')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!submission ? (
                <div>
                  <Badge variant="outline">{t('notSubmittedYet')}</Badge>
                  {assignment.due_date && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {t('dueDate')}: {new Date(assignment.due_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-medium mb-1">{t('submissionStatus')}</p>
                    <Badge variant={isGraded ? "default" : "secondary"}>
                      {isGraded ? t('graded') : t('submitted')}
                    </Badge>
                  </div>
                  {submission.submitted_at && (
                    <div>
                      <p className="text-sm font-medium mb-1">{t('submittedAt')}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(submission.submitted_at).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {isGraded && submission.grade !== null && (
                    <div>
                      <p className="text-sm font-medium mb-1">{t('yourGrade')}</p>
                      <p className="text-2xl font-bold text-primary">
                        {submission.grade} / {assignment.max_points}
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
