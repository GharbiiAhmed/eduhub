"use client"

import { useState, useEffect } from 'react'
import { useRouter } from '@/i18n/routing'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/hooks/use-toast'
import { useTranslations } from 'next-intl'
import {
  Plus, 
  Megaphone, 
  Calendar, 
  Users, 
  Edit, 
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

interface Announcement {
  id: string
  title: string
  content: string
  priority: string
  target_audience: string
  is_published: boolean
  published_at: string | null
  expires_at: string | null
  created_at: string
  courses: {
    id: string
    title: string
  } | null
}

export default function AdminAnnouncementsPage() {
  const t = useTranslations('announcements')
  const tCommon = useTranslations('common')

  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal',
    targetAudience: 'all',
    courseId: '',
    isPublished: false,
    expiresAt: ''
  })

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const fetchAnnouncements = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${window.location.origin}/api/announcements`)
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json()
          throw new Error(data.error || t('failedToFetchAnnouncements'))
        } else {
          throw new Error(t('failedToFetchAnnouncements'))
        }
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(t('invalidResponseFormat'))
      }

      const data = await response.json()

      // For admin, we need to fetch all announcements (published and unpublished)
      // This would need a separate endpoint or modify the existing one
      setAnnouncements(data.announcements || [])
    } catch (error: any) {
      console.error('Error fetching announcements:', error)
      toast({
        title: tCommon('error'),
        description: error.message || t('failedToLoadAnnouncements'),
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch(`${window.location.origin}/api/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          priority: formData.priority,
          targetAudience: formData.targetAudience,
          courseId: formData.courseId || null,
          isPublished: formData.isPublished,
          expiresAt: formData.expiresAt || null
        })
      })

      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json()
          throw new Error(data.error || t('failedToCreateAnnouncement'))
        } else {
          throw new Error(t('failedToCreateAnnouncement'))
        }
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(t('invalidResponseFormat'))
      }

      const data = await response.json()

      toast({
        title: tCommon('success'),
        description: t('announcementCreatedSuccessfully'),
      })

      setIsCreateDialogOpen(false)
      setFormData({
        title: '',
        content: '',
        priority: 'normal',
        targetAudience: 'all',
        courseId: '',
        isPublished: false,
        expiresAt: ''
      })
      fetchAnnouncements()
    } catch (error: any) {
      console.error('Error creating announcement:', error)
      toast({
        title: tCommon('error'),
        description: error.message || t('failedToCreateAnnouncement'),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (!confirm(t('confirmDeleteAnnouncement'))) {
      return
    }

    try {
      const response = await fetch(`${window.location.origin}/api/announcements/${announcementId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json()
          throw new Error(data.error || t('failedToDeleteAnnouncement'))
        } else {
          throw new Error(t('failedToDeleteAnnouncement'))
        }
      }

      toast({
        title: tCommon('success'),
        description: t('announcementDeletedSuccessfully'),
      })

      fetchAnnouncements()
    } catch (error: any) {
      console.error('Error deleting announcement:', error)
      toast({
        title: tCommon('error'),
        description: error.message || t('failedToDeleteAnnouncement'),
      })
    }
  }

  const handlePublishAnnouncement = async (announcementId: string) => {
    try {
      const response = await fetch(`${window.location.origin}/api/announcements/${announcementId}/publish`, {
        method: 'POST'
      })

      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json()
          throw new Error(data.error || t('failedToPublishAnnouncement'))
        } else {
          throw new Error(t('failedToPublishAnnouncement'))
        }
      }

      toast({
        title: tCommon('success'),
        description: t('announcementPublishedSuccessfully'),
      })

      fetchAnnouncements()
    } catch (error: any) {
      console.error('Error publishing announcement:', error)
      toast({
        title: tCommon('error'),
        description: error.message || t('failedToPublishAnnouncement'),
      })
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t('never')
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive'
      case 'high':
        return 'default'
      case 'normal':
        return 'secondary'
      default:
        return 'outline'
    }
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {t('createAndManageAnnouncements')}
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {t('createAnnouncement')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('createNewAnnouncement')}</DialogTitle>
                <DialogDescription>
                  {t('createSystemWideAnnouncement')}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">{t('title')} *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder={t('titlePlaceholder')}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">{t('content')} *</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder={t('writeAnnouncementContent')}
                    rows={8}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priority">{t('priority')}</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">{t('low')}</SelectItem>
                        <SelectItem value="normal">{t('normal')}</SelectItem>
                        <SelectItem value="high">{t('high')}</SelectItem>
                        <SelectItem value="urgent">{t('urgent')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="targetAudience">{t('targetAudience')}</Label>
                    <Select
                      value={formData.targetAudience}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, targetAudience: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('allUsers')}</SelectItem>
                        <SelectItem value="students">{t('studentsOnly')}</SelectItem>
                        <SelectItem value="instructors">{t('instructorsOnly')}</SelectItem>
                        <SelectItem value="admins">{t('adminsOnly')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiresAt">{t('expiresAt')} ({tCommon('optional')})</Label>
                  <Input
                    id="expiresAt"
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isPublished"
                    checked={formData.isPublished}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPublished: checked }))}
                  />
                  <Label htmlFor="isPublished">{t('publishImmediately')}</Label>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    {tCommon('cancel')}
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? t('creating') : t('createAnnouncement')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {announcements.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Megaphone className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t('noAnnouncementsYet')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {t('createFirstAnnouncement')}
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t('createAnnouncement')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {announcements.map((announcement) => (
              <Card key={announcement.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle>{announcement.title}</CardTitle>
                        <Badge variant={getPriorityColor(announcement.priority) as any}>
                          {announcement.priority}
                        </Badge>
                        {announcement.is_published ? (
                          <Badge variant="default">{t('published')}</Badge>
                        ) : (
                          <Badge variant="secondary">{t('draft')}</Badge>
                        )}
                      </div>
                      <CardDescription className="mt-2">
                        {t('target')}: {announcement.target_audience} • {t('published')}: {formatDate(announcement.published_at)}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/admin/announcements/${announcement.id}`)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        {tCommon('view')}
                      </Button>
                      {!announcement.is_published && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePublishAnnouncement(announcement.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {t('publish')}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/admin/announcements/${announcement.id}/edit`)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteAnnouncement(announcement.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                    {announcement.content}
                  </p>
                  {announcement.expires_at && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                      <AlertCircle className="w-4 h-4" />
                      <span>{t('expires')}: {formatDate(announcement.expires_at)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
  )
}

