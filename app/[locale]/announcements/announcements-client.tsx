"use client"

import { useState, useEffect } from 'react'
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Navigation } from '@/components/navigation'
import {
  Megaphone, 
  Calendar, 
  AlertCircle,
  CheckCircle,
  Info,
  X
} from 'lucide-react'

interface Announcement {
  id: string
  title: string
  content: string
  priority: string
  target_audience: string
  published_at: string | null
  expires_at: string | null
  created_at: string
  courses: {
    id: string
    title: string
  } | null
  profiles: {
    full_name: string
    email: string
  }
}

export function AnnouncementsClient() {
  const t = useTranslations('announcements')
  const tCommon = useTranslations('common')
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const fetchAnnouncements = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/announcements')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch announcements')
      }

      setAnnouncements(data.announcements || [])
    } catch (error: any) {
      console.error('Error fetching announcements:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No date'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      case 'high':
        return <AlertCircle className="w-5 h-5 text-orange-600" />
      case 'normal':
        return <Info className="w-5 h-5 text-blue-600" />
      default:
        return <CheckCircle className="w-5 h-5 text-gray-600" />
    }
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('stayUpdated')}
          </p>
        </div>

        {announcements.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Megaphone className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t('noAnnouncements')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t('noAnnouncementsDesc')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <Card 
                key={announcement.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedAnnouncement(announcement)}
              >
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {getPriorityIcon(announcement.priority)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle>{announcement.title}</CardTitle>
                        <Badge variant={getPriorityColor(announcement.priority) as any}>
                          {announcement.priority}
                        </Badge>
                      </div>
                      <CardDescription>
                        {announcement.courses?.title || 'System Announcement'} • {formatDate(announcement.published_at)}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400 line-clamp-3">
                    {announcement.content}
                  </p>
                  {announcement.expires_at && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span>Expires: {formatDate(announcement.expires_at)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Announcement Detail Dialog */}
        <Dialog open={!!selectedAnnouncement} onOpenChange={(open) => !open && setSelectedAnnouncement(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedAnnouncement && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2">
                    {getPriorityIcon(selectedAnnouncement.priority)}
                    <DialogTitle>{selectedAnnouncement.title}</DialogTitle>
                    <Badge variant={getPriorityColor(selectedAnnouncement.priority) as any}>
                      {selectedAnnouncement.priority}
                    </Badge>
                  </div>
                  <DialogDescription>
                    {selectedAnnouncement.courses?.title || 'System Announcement'} • {formatDate(selectedAnnouncement.published_at)}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {selectedAnnouncement.content}
                    </p>
                  </div>
                  {selectedAnnouncement.courses && (
                    <div className="pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/student/courses/${selectedAnnouncement.courses?.id}`)}
                      >
                        View Course
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

