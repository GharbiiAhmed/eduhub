"use client"

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
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
  file_url: string | null
  score: number | null
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
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [submissionText, setSubmissionText] = useState("")
  const [submissionFile, setSubmissionFile] = useState<File | null>(null)
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null)
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
        setUploadedFileUrl(data.file_url || null)
      }
    } catch (error) {
      console.error("Error fetching submission:", error)
    }
  }

  const handleFileUpload = async (file: File): Promise<string> => {
    setUploading(true)
    setUploadProgress(0)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Validate file size (max 50MB default)
      const maxSize = assignment?.max_file_size_mb ? assignment.max_file_size_mb * 1024 * 1024 : 50 * 1024 * 1024
      if (file.size > maxSize) {
        throw new Error(`File size exceeds maximum allowed size of ${assignment?.max_file_size_mb || 50}MB`)
      }

      // Validate file type if specified
      if (assignment?.allowed_file_types && assignment.allowed_file_types.length > 0) {
        const fileExt = file.name.split('.').pop()?.toLowerCase()
        if (!fileExt || !assignment.allowed_file_types.includes(fileExt)) {
          throw new Error(`File type not allowed. Allowed types: ${assignment.allowed_file_types.join(', ')}`)
        }
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `assignments/${assignmentId}/${fileName}`

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("assignments")
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (uploadError) {
        // If file already exists, try to overwrite
        if (uploadError.message.includes('already exists')) {
          const { error: updateError } = await supabase.storage
            .from("assignments")
            .update(filePath, file, {
              cacheControl: '3600',
              upsert: true
            })
          
          if (updateError) throw updateError
        } else {
          throw uploadError
        }
      }

      // Get signed URL for the file (works for both public and private buckets)
      const { data: signedData, error: signedError } = await supabase
        .storage
        .from("assignments")
        .createSignedUrl(filePath, 31536000) // 1 year expiry

      if (!signedError && signedData?.signedUrl) {
        return signedData.signedUrl
      } else {
        // Fallback to public URL
        const { data: { publicUrl } } = supabase.storage
          .from("assignments")
          .getPublicUrl(filePath)
        return publicUrl
      }
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate submission
    if (assignment.assignment_type === "text" || assignment.assignment_type === "essay") {
      if (!submissionText.trim()) {
        toast({
          title: tCommon('error'),
          description: "Please enter your submission text",
          variant: "destructive",
        })
        return
      }
    } else if (assignment.assignment_type === "file" || assignment.assignment_type === "project" || assignment.assignment_type === "file_upload") {
      if (!submissionFile && !uploadedFileUrl) {
        toast({
          title: tCommon('error'),
          description: "Please upload a file",
          variant: "destructive",
        })
        return
      }
    } else if (assignment.assignment_type === "mixed") {
      // Mixed type requires either text or file
      if (!submissionText.trim() && !submissionFile && !uploadedFileUrl) {
        toast({
          title: tCommon('error'),
          description: "Please provide either text submission or upload a file",
          variant: "destructive",
        })
        return
      }
    }

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

      let fileUrl = uploadedFileUrl || submission?.file_url || null

      // Upload new file if one was selected
      if (submissionFile) {
        fileUrl = await handleFileUpload(submissionFile)
        setUploadedFileUrl(fileUrl)
      }

      const submissionData: any = {
        assignment_id: assignmentId,
        student_id: user.id,
        submission_text: (assignment.assignment_type === "text" || assignment.assignment_type === "essay" || assignment.assignment_type === "mixed") 
          ? (submissionText.trim() || null)
          : null,
        file_url: (assignment.assignment_type === "file" || assignment.assignment_type === "project" || assignment.assignment_type === "file_upload" || assignment.assignment_type === "mixed") 
          ? fileUrl 
          : null,
        status: "submitted",
        submitted_at: new Date().toISOString(),
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
          description: "Submission updated successfully",
        })
      } else {
        // Create new submission
        const { error } = await supabase
          .from("assignment_submissions")
          .insert(submissionData)

        if (error) throw error
        toast({
          title: tCommon('success'),
          description: "Assignment submitted successfully",
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
  const isSubmitted = submission?.status === "submitted" || submission?.status === "graded"
  const isGraded = submission?.status === "graded" && submission?.score !== null

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
                {isGraded && submission?.score !== null && (
                  <Badge variant="default" className="bg-green-600">
                    {t('graded')} - {submission.score}/{assignment.max_points}
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
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <h3 className="font-semibold text-green-900 dark:text-green-100">{t('yourGrade')}</h3>
                    </div>
                    <div className="text-3xl font-bold text-green-700 dark:text-green-300">
                      {submission.score} / {assignment.max_points}
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-300 mt-1">
                      {submission.score !== null && assignment.max_points > 0 && (
                        <span>
                          ({Math.round((submission.score / assignment.max_points) * 100)}%)
                        </span>
                      )}
                    </div>
                  </div>
                  {submission.feedback && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h3 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">{t('instructorFeedback')}</h3>
                      <p className="text-blue-800 dark:text-blue-200 whitespace-pre-wrap">{submission.feedback}</p>
                    </div>
                  )}
                </div>
              )}

              {submission?.file_url && (
                <div>
                  <h3 className="font-semibold mb-2">{t('submission')}</h3>
                  <a
                    href={submission.file_url}
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
                  {(assignment.assignment_type === "text" || assignment.assignment_type === "essay" || assignment.assignment_type === "mixed") && (
                    <div className="space-y-2">
                      <Label htmlFor="submissionText">
                        Your Submission {assignment.assignment_type === "mixed" ? "(Optional)" : "*"}
                      </Label>
                      <Textarea
                        id="submissionText"
                        value={submissionText}
                        onChange={(e) => setSubmissionText(e.target.value)}
                        placeholder="Enter your submission text here..."
                        rows={10}
                        required={assignment.assignment_type === "text" || assignment.assignment_type === "essay"}
                        disabled={submitting || uploading}
                      />
                      <p className="text-xs text-muted-foreground">
                        {assignment.assignment_type === "mixed" 
                          ? "You can provide text, upload a file, or both."
                          : "Please provide your complete answer or essay response."}
                      </p>
                    </div>
                  )}

                  {(assignment.assignment_type === "file" || assignment.assignment_type === "project" || assignment.assignment_type === "file_upload" || assignment.assignment_type === "mixed") && (
                    <div className="space-y-2">
                      <Label htmlFor="submissionFile">{t('fileUpload')}</Label>
                      <Input
                        id="submissionFile"
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null
                          setSubmissionFile(file)
                          if (file) {
                            // Validate file size
                            const maxSize = assignment?.max_file_size_mb ? assignment.max_file_size_mb * 1024 * 1024 : 50 * 1024 * 1024
                            if (file.size > maxSize) {
                              toast({
                                title: tCommon('error'),
                                description: `File size exceeds maximum allowed size of ${assignment?.max_file_size_mb || 50}MB`,
                                variant: "destructive",
                              })
                              e.target.value = ''
                              setSubmissionFile(null)
                              return
                            }
                            // Validate file type
                            if (assignment?.allowed_file_types && assignment.allowed_file_types.length > 0) {
                              const fileExt = file.name.split('.').pop()?.toLowerCase()
                              if (!fileExt || !assignment.allowed_file_types.includes(fileExt)) {
                                toast({
                                  title: tCommon('error'),
                                  description: `File type not allowed. Allowed types: ${assignment.allowed_file_types.join(', ')}`,
                                  variant: "destructive",
                                })
                                e.target.value = ''
                                setSubmissionFile(null)
                                return
                              }
                            }
                          }
                        }}
                        accept={assignment?.allowed_file_types 
                          ? assignment.allowed_file_types.map(ext => `.${ext}`).join(',')
                          : ".pdf,.doc,.docx,.txt,.zip,.rar"}
                        required={!uploadedFileUrl && assignment.assignment_type !== "mixed" && (assignment.assignment_type === "file" || assignment.assignment_type === "project" || assignment.assignment_type === "file_upload")}
                        disabled={uploading}
                      />
                      {uploading && (
                        <div className="space-y-2">
                          <Progress value={uploadProgress} className="h-2" />
                          <p className="text-xs text-muted-foreground">Uploading... {uploadProgress}%</p>
                        </div>
                      )}
                      {uploadedFileUrl && !submissionFile && (
                        <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            <span className="text-sm">File uploaded</span>
                          </div>
                          <a
                            href={uploadedFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            View
                          </a>
                        </div>
                      )}
                      {submissionFile && (
                        <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            <span className="text-sm">{submissionFile.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({(submissionFile.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </div>
                        </div>
                      )}
                      {assignment?.max_file_size_mb && (
                        <p className="text-xs text-muted-foreground">
                          Maximum file size: {assignment.max_file_size_mb}MB
                        </p>
                      )}
                      {assignment?.allowed_file_types && assignment.allowed_file_types.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Allowed file types: {assignment.allowed_file_types.join(', ')}
                        </p>
                      )}
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    disabled={submitting || uploading} 
                    className="w-full"
                    size="lg"
                  >
                    {uploading ? (
                      <>
                        <Upload className="w-4 h-4 mr-2 animate-spin" />
                        Uploading... {uploadProgress}%
                      </>
                    ) : submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {submission ? "Updating..." : "Submitting..."}
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        {submission ? "Update Submission" : "Submit Assignment"}
                      </>
                    )}
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
                  {isGraded && submission.score !== null && (
                    <div>
                      <p className="text-sm font-medium mb-1">{t('yourGrade')}</p>
                      <p className="text-2xl font-bold text-primary">
                        {submission.score} / {assignment.max_points}
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
