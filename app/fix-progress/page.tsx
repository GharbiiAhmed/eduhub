"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function FixProgressPage() {
  const [isWorking, setIsWorking] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [enrollments, setEnrollments] = useState<any[]>([])
  const router = useRouter()

  const fetchEnrollments = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    const { data } = await supabase
      .from("enrollments")
      .select("*, courses(*)")
      .eq("student_id", user.id)

    setEnrollments(data || [])
  }

  const handleRecalculateProgress = async () => {
    setIsWorking(true)
    setError(null)
    setResult(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error("Not authenticated")

      // Get all enrollments
      const { data: enrollmentData } = await supabase
        .from("enrollments")
        .select("*, courses(*)")
        .eq("student_id", user.id)

      if (!enrollmentData || enrollmentData.length === 0) {
        throw new Error("No enrollments found")
      }

      let updatedCount = 0

      // Recalculate progress for each enrollment
      for (const enrollment of enrollmentData) {
        console.log(`Recalculating progress for course: ${enrollment.course_id}`)

        // Get all lessons in this course
        const { data: modules } = await supabase
          .from("modules")
          .select("id")
          .eq("course_id", enrollment.course_id)

        if (!modules || modules.length === 0) {
          console.log(`No modules found for course ${enrollment.course_id}`)
          continue
        }

        const moduleIds = modules.map(m => m.id)
        const { data: lessons } = await supabase
          .from("lessons")
          .select("id")
          .in("module_id", moduleIds)

        if (!lessons || lessons.length === 0) {
          console.log(`No lessons found for course ${enrollment.course_id}`)
          continue
        }

        // Get completed lessons
        const lessonIds = lessons.map(l => l.id)
        const { data: completedLessons } = await supabase
          .from("lesson_progress")
          .select("id")
          .eq("student_id", user.id)
          .eq("completed", true)
          .in("lesson_id", lessonIds)

        // Calculate progress percentage
        const progressPercentage = Math.round(((completedLessons?.length || 0) / lessons.length) * 100)
        
        console.log(`Course ${enrollment.course_id}: ${completedLessons?.length || 0}/${lessons.length} lessons completed = ${progressPercentage}%`)

        // Update enrollment progress
        const { error: updateError } = await supabase
          .from("enrollments")
          .update({ progress_percentage: progressPercentage })
          .eq("student_id", user.id)
          .eq("course_id", enrollment.course_id)

        if (updateError) {
          console.error(`Failed to update progress for course ${enrollment.course_id}:`, updateError)
        } else {
          updatedCount++
        }
      }

      setResult(`✅ Progress recalculated for ${updatedCount} courses!`)
      
      // Refresh enrollments to show updated progress
      await fetchEnrollments()

    } catch (err) {
      console.error("Recalculate progress error:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsWorking(false)
    }
  }

  const handleMarkLessonComplete = async () => {
    setIsWorking(true)
    setError(null)
    setResult(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error("Not authenticated")

      // Get first enrollment
      const { data: enrollmentData } = await supabase
        .from("enrollments")
        .select("*, courses(*)")
        .eq("student_id", user.id)
        .limit(1)
        .single()

      if (!enrollmentData) {
        throw new Error("No enrollments found")
      }

      const courseId = enrollmentData.course_id
      console.log("Marking lesson complete for course:", courseId)

      // Get first lesson in the course
      const { data: modules } = await supabase
        .from("modules")
        .select("id")
        .eq("course_id", courseId)

      if (!modules || modules.length === 0) {
        throw new Error("No modules found in course")
      }

      const { data: lessons } = await supabase
        .from("lessons")
        .select("id")
        .eq("module_id", modules[0].id)
        .limit(1)

      if (!lessons || lessons.length === 0) {
        throw new Error("No lessons found in course")
      }

      const lessonId = lessons[0].id
      console.log("Marking lesson complete:", lessonId)

      // Mark lesson as complete
      const { error: progressError } = await supabase.from("lesson_progress").upsert({
        student_id: user.id,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date().toISOString(),
      })

      if (progressError) {
        throw new Error(`Failed to mark lesson complete: ${progressError.message}`)
      }

      // Update course progress
      const progressResponse = await fetch("/api/update-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: courseId,
          lessonId: lessonId,
          completed: true,
        }),
      })

      if (!progressResponse.ok) {
        const errorData = await progressResponse.text()
        throw new Error(`Progress update failed: ${errorData}`)
      }

      const data = await progressResponse.json()
      console.log("Progress update data:", data)

      setResult(`✅ Lesson marked complete! New progress: ${data.progressPercentage}%`)
      
      // Refresh enrollments
      await fetchEnrollments()

    } catch (err) {
      console.error("Mark lesson complete error:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsWorking(false)
    }
  }

  const handleRefreshEnrollments = async () => {
    await fetchEnrollments()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fix Progress Issue</h1>
        <p className="text-muted-foreground">Fix the progress percentage calculation</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Progress Fix Tools</CardTitle>
          <CardDescription>Tools to fix the progress calculation issue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleRecalculateProgress} 
            disabled={isWorking}
            className="w-full"
          >
            {isWorking ? "Recalculating..." : "Recalculate All Progress"}
          </Button>

          <Button 
            onClick={handleMarkLessonComplete} 
            disabled={isWorking}
            variant="outline"
            className="w-full"
          >
            {isWorking ? "Marking Complete..." : "Mark First Lesson Complete"}
          </Button>

          <Button 
            onClick={handleRefreshEnrollments}
            variant="outline"
            className="w-full"
          >
            Refresh Enrollments
          </Button>

          {result && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-bold text-green-800">Result:</h3>
              <p className="text-green-700">{result}</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-bold text-red-800">Error:</h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Enrollments</CardTitle>
          <CardDescription>Your current course enrollments and progress</CardDescription>
        </CardHeader>
        <CardContent>
          {enrollments.length > 0 ? (
            <div className="space-y-4">
              {enrollments.map((enrollment: any) => (
                <div key={enrollment.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold">{enrollment.courses?.title || "Unknown Course"}</h3>
                      <p className="text-sm text-muted-foreground">
                        Progress: {enrollment.progress_percentage}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Course ID: {enrollment.course_id}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No enrollments found</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Debug Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" onClick={() => router.push("/student/courses")}>
            Go to Student Courses
          </Button>
          <Button variant="outline" onClick={() => router.push("/test-progress")}>
            Test Progress Update
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}



