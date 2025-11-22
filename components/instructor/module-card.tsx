"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { useTranslations } from 'next-intl'
import LessonCard from "./lesson-card"

interface Module {
  id: string
  title: string
  description: string
  order_index: number
}

interface Lesson {
  id: string
  title: string
  content_type: string
  order_index: number
}

export default function ModuleCard({ module, courseId }: { module: Module; courseId: string }) {
  const t = useTranslations('courses')
  const tCommon = useTranslations('common')
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [newLessonTitle, setNewLessonTitle] = useState("")
  const [isCreatingLesson, setIsCreatingLesson] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExpandModule = async () => {
    if (isExpanded) {
      setIsExpanded(false)
      return
    }

    const supabase = createClient()
    const { data } = await supabase
      .from("lessons")
      .select("*")
      .eq("module_id", module.id)
      .order("order_index", { ascending: true })

    if (data) {
      setLessons(data)
    }
    setIsExpanded(true)
  }

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsCreatingLesson(true)
    setError(null)

    try {
      const { data, error: insertError } = await supabase
        .from("lessons")
        .insert({
          module_id: module.id,
          title: newLessonTitle,
          content_type: "text",
          order_index: lessons.length,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Get course_id from module to notify enrolled students
      const { data: moduleData } = await supabase
        .from('modules')
        .select('course_id')
        .eq('id', module.id)
        .single()

      if (moduleData?.course_id) {
        // Get enrolled students
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('student_id')
          .eq('course_id', moduleData.course_id)

        if (enrollments && enrollments.length > 0) {
          const studentIds = enrollments.map(e => e.student_id)
          
          // Send email notifications to enrolled students
          try {
            await fetch('/api/lessons/notify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lessonId: data.id,
                courseId: moduleData.course_id,
                lessonTitle: newLessonTitle
              })
            }).catch(err => console.error('Failed to send lesson notification emails:', err))
          } catch (emailError) {
            console.error('Error sending lesson notification emails:', emailError)
          }

          // Create in-app notifications for enrolled students
          await fetch('/api/notifications/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userIds: studentIds,
              type: 'lesson_added',
              title: 'New Lesson Added',
              message: `A new lesson "${newLessonTitle}" has been added to your enrolled course.`,
              link: `/student/courses/${moduleData.course_id}`,
              relatedId: data.id,
              relatedType: 'lesson'
            })
          }).catch(err => console.error('Failed to create notifications:', err))
        }
      }

      setLessons([...lessons, data])
      setNewLessonTitle("")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('anErrorOccurred'))
    } finally {
      setIsCreatingLesson(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle>{module.title}</CardTitle>
            <CardDescription>{module.description || t('noDescriptionAvailable')}</CardDescription>
          </div>
          <Button variant="outline" onClick={handleExpandModule}>
            {isExpanded ? t('collapse') : t('expand')}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h4 className="font-semibold">{t('addLesson')}</h4>
            <form onSubmit={handleCreateLesson} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor={`lesson-${module.id}`}>{t('lessonTitle')}</Label>
                <Input
                  id={`lesson-${module.id}`}
                  placeholder={t('lessonTitlePlaceholder')}
                  required
                  value={newLessonTitle}
                  onChange={(e) => setNewLessonTitle(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={isCreatingLesson}>
                {isCreatingLesson ? t('creating') : t('addLesson')}
              </Button>
            </form>
          </div>

          {lessons.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-semibold">{t('lessons')}</h4>
              {lessons.map((lesson) => (
                <LessonCard key={lesson.id} lesson={lesson} moduleId={module.id} />
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
