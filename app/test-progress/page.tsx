"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function TestProgressPage() {
  const [isTesting, setIsTesting] = useState(false)
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

  const handleTestProgressUpdate = async () => {
    setIsTesting(true)
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
      console.log("Testing progress update for course:", courseId)

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
      console.log("Testing progress update for lesson:", lessonId)

      // Test the progress update API
      const response = await fetch("/api/update-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: courseId,
          lessonId: lessonId,
          completed: true,
        }),
      })

      console.log("Progress update response:", response.status)

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Progress update failed: ${errorData}`)
      }

      const data = await response.json()
      console.log("Progress update data:", data)

      setResult(`✅ Progress update successful! New progress: ${data.progressPercentage}%`)
      
      // Refresh enrollments to show updated progress
      await fetchEnrollments()

    } catch (err) {
      console.error("Test progress error:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsTesting(false)
    }
  }

  const handleRefreshEnrollments = async () => {
    await fetchEnrollments()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Test Progress Update</h1>
        <p className="text-muted-foreground">Test the lesson progress update system</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Progress Update Test</CardTitle>
          <CardDescription>Test the progress update API with your enrolled courses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleTestProgressUpdate} 
            disabled={isTesting}
            className="w-full"
          >
            {isTesting ? "Testing Progress Update..." : "Test Progress Update"}
          </Button>

          <Button 
            variant="outline"
            onClick={handleRefreshEnrollments}
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
          <Button variant="outline" onClick={() => router.push("/debug-enrollment")}>
            Debug Enrollment
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}



