"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { useEffect, useState } from "react"

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

export default function ModuleView({
  module,
  courseId,
  isExpanded,
  onToggle,
}: {
  module: Module
  courseId: string
  isExpanded: boolean
  onToggle: () => void
}) {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [lessonProgress, setLessonProgress] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (isExpanded) {
      const fetchLessons = async () => {
        const supabase = createClient()
        const { data } = await supabase
          .from("lessons")
          .select("*")
          .eq("module_id", module.id)
          .order("order_index", { ascending: true })

        if (data) {
          setLessons(data)

          // Fetch progress for each lesson
          const {
            data: { user },
          } = await supabase.auth.getUser()

          if (user) {
            const { data: progressData } = await supabase
              .from("lesson_progress")
              .select("lesson_id, completed")
              .eq("student_id", user.id)
              .in(
                "lesson_id",
                data.map((l) => l.id),
              )

            const progressMap: Record<string, boolean> = {}
            progressData?.forEach((p) => {
              progressMap[p.lesson_id] = p.completed
            })
            setLessonProgress(progressMap)
          }
        }
      }

      fetchLessons()
    }
  }, [isExpanded, module.id])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle>{module.title}</CardTitle>
            <CardDescription>{module.description || "No description"}</CardDescription>
          </div>
          <Button variant="outline" onClick={onToggle}>
            {isExpanded ? "Collapse" : "Expand"}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {lessons.length > 0 ? (
            lessons.map((lesson) => (
              <Link key={lesson.id} href={`/student/lessons/${lesson.id}`}>
                <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted transition-colors cursor-pointer">
                  <div className="flex-1">
                    <h4 className="font-medium">{lesson.title}</h4>
                    <p className="text-sm text-muted-foreground">{lesson.content_type}</p>
                  </div>
                  {lessonProgress[lesson.id] && <div className="text-green-600 font-medium">✓ Completed</div>}
                </div>
              </Link>
            ))
          ) : (
            <p className="text-muted-foreground text-center py-4">No lessons in this module yet</p>
          )}
        </CardContent>
      )}
    </Card>
  )
}
