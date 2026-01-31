"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useRouter as useI18nRouter } from '@/i18n/routing'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/hooks/use-toast'
import { useTranslations } from 'next-intl'
import { ArrowLeft, FileText, Loader2, Upload, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Assignment {
  id: string
  title: string
  description: string
  instructions: string | null
  due_date: string | null
  max_points: number
  assignment_type: string
  is_published: boolean
  course_id: string
  courses: { id: string; title: string }
  allowed_file_types: string[] | null
  max_file_size_mb: number | null
  attachment_url?: string | null
}

export default function InstructorAssignmentEditPage() {
  const t = useTranslations('assignments')
  const tCommon = useTranslations('common')
  const params = useParams()
  const router = useRouter()
  const routerI18n = useI18nRouter()
  const assignmentId = params.assignmentId as string

  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null)
  const [attachmentRemoved, setAttachmentRemoved] = useState(false)
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    dueDate: '',
    maxPoints: 100,
    assignmentType: 'essay',
    isPublished: false,
  })
  const supabase = createClient()

  useEffect(() => {
    if (assignmentId) fetchAssignment()
  }, [assignmentId])

  const fetchAssignment = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/assignments/${assignmentId}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to load assignment')
      const a = data.assignment
      if (!a) throw new Error('Assignment not found')
      setAssignment(a)
      setAttachmentUrl(a.attachment_url || null)
      setFormData({
        title: a.title,
        description: a.description,
        instructions: a.instructions || '',
        dueDate: a.due_date ? new Date(a.due_date).toISOString().slice(0, 16) : '',
        maxPoints: a.max_points ?? 100,
        assignmentType: a.assignment_type || 'essay',
        isPublished: !!a.is_published,
      })
    } catch (e: any) {
      toast({ title: tCommon('error'), description: e.message, variant: 'destructive' })
      routerI18n.push('/instructor/assignments')
    } finally {
      setLoading(false)
    }
  }

  const uploadAttachment = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop() || 'pdf'
    const path = `assignment-attachments/${assignmentId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('assignments').upload(path, file, { upsert: true, contentType: file.type || 'application/pdf' })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('assignments').getPublicUrl(path)
    return publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      let finalAttachmentUrl: string | null = attachmentRemoved ? null : attachmentUrl
      if (attachmentFile) {
        setUploadingAttachment(true)
        try {
          finalAttachmentUrl = await uploadAttachment(attachmentFile)
        } finally {
          setUploadingAttachment(false)
        }
      }

      const body: Record<string, unknown> = {
        title: formData.title,
        description: formData.description,
        instructions: formData.instructions || null,
        dueDate: formData.dueDate || null,
        maxPoints: formData.maxPoints,
        assignmentType: formData.assignmentType,
        isPublished: formData.isPublished,
      }
      if (attachmentRemoved || attachmentFile) body.attachment_url = finalAttachmentUrl

      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update')
      toast({
        title: tCommon('success'),
        description: data.warning || t('assignmentUpdated') || 'Assignment updated.',
      })
      routerI18n.push(`/instructor/assignments/${assignmentId}`)
    } catch (e: any) {
      toast({ title: tCommon('error'), description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!assignment) return null

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4 space-y-6">
      <Button
        variant="ghost"
        onClick={() => routerI18n.push(`/instructor/assignments/${assignmentId}`)}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        {tCommon('back')}
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('editAssignment') || 'Edit Assignment'}
          </CardTitle>
          <CardDescription>
            {assignment.courses?.title}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">{t('assignmentTitle')} *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder={t('assignmentTitlePlaceholder')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('description')} *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder={t('describeWhatStudentsNeedToDo')}
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">{t('instructions')}</Label>
              <Textarea
                id="instructions"
                value={formData.instructions}
                onChange={(e) => setFormData((prev) => ({ ...prev, instructions: e.target.value }))}
                placeholder={t('detailedInstructions')}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dueDate">{t('dueDate')}</Label>
                <Input
                  id="dueDate"
                  type="datetime-local"
                  value={formData.dueDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxPoints">{t('maxPoints')}</Label>
                <Input
                  id="maxPoints"
                  type="number"
                  min={1}
                  value={formData.maxPoints}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, maxPoints: parseInt(e.target.value, 10) || 100 }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignmentType">{t('assignmentType')}</Label>
              <Select
                value={formData.assignmentType}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, assignmentType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="essay">{t('essay')}</SelectItem>
                  <SelectItem value="project">{t('project')}</SelectItem>
                  <SelectItem value="file_upload">{t('fileUpload')}</SelectItem>
                  <SelectItem value="text">{t('text')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('assignmentTypeHint') || 'File Upload: students submit a PDF/file. Text/Essay: students answer in the box. You can also add an optional PDF below for students to download.'}
              </p>
            </div>

            <div className="space-y-2 border-t pt-4">
              <Label>{t('optionalAssignmentPdf') || 'Optional assignment PDF'}</Label>
              <p className="text-xs text-muted-foreground">
                {t('optionalAssignmentPdfHint') || 'Attach a PDF (e.g. worksheet) for students to download and complete. Leave empty to use description/instructions only.'}
              </p>
              {attachmentUrl && !attachmentRemoved && !attachmentFile ? (
                <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted">
                  <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate">
                    {t('downloadAssignmentPdf') || 'Download assignment PDF'}
                  </a>
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setAttachmentUrl(null); setAttachmentRemoved(true); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) { setAttachmentFile(f); setAttachmentRemoved(false); }
                  }}
                  disabled={uploadingAttachment}
                />
              )}
              {attachmentFile && (
                <p className="text-sm text-muted-foreground">
                  {attachmentFile.name} ({tCommon('optional')})
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isPublished"
                checked={formData.isPublished}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isPublished: checked }))}
              />
              <Label htmlFor="isPublished">{t('publishImmediately')}</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => routerI18n.push(`/instructor/assignments/${assignmentId}`)}
              >
                {tCommon('cancel')}
              </Button>
              <Button type="submit" disabled={saving || uploadingAttachment}>
                {saving || uploadingAttachment ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {tCommon('saving')}
                  </>
                ) : (
                  tCommon('saveChanges')
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
