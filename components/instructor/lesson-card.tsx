"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { useTranslations } from 'next-intl'

interface Lesson {
  id: string
  title: string
  content_type: string
  order_index: number
}

export default function LessonCard({ lesson, moduleId }: { lesson: Lesson; moduleId: string }) {
  const t = useTranslations('courses')
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{lesson.title}</CardTitle>
        <CardDescription>{t('type')}: {lesson.content_type}</CardDescription>
      </CardHeader>
      <CardContent>
        <Link href={`/instructor/lessons/${lesson.id}`}>
          <Button variant="outline" className="w-full bg-transparent">
            {t('editLesson')}
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
