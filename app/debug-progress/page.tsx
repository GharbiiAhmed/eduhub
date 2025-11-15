"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function DebugProgressPage() {
  const [isWorking, setIsWorking] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const debugProgress = async () => {
    setIsWorking(true)
    setError(null)
    setDebugInfo(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error("Not authenticated")

      console.log("🔍 Starting progress debug...")
      console.log("User ID:", user.id)

      // Get all enrollments
      const { data: enrollments, error: enrollError } = await supabase
        .from("enrollments")
        .select("*, courses(*)")
        .eq("student_id", user.id)

      console.log("📚 Enrollments:", enrollments)
      console.log("❌ Enrollment Error:", enrollError)

      if (!enrollments || enrollments.length === 0) {
        throw new Error("No enrollments found")
      }

      const debugData = []

      for (const enrollment of enrollments) {
        console.log(`\n🎯 Debugging course: ${enrollment.course_id}`)
        console.log("Course title:", enrollment.courses?.title)
        console.log("Current progress:", enrollment.progress_percentage)

        // Get modules for this course
        const { data: modules, error: modulesError } = await supabase
          .from("modules")
          .select("id, title")
          .eq("course_id", enrollment.course_id)

        console.log("📦 Modules:", modules)
        console.log("❌ Modules Error:", modulesError)

        if (!modules || modules.length === 0) {
          debugData.push({
            courseId: enrollment.course_id,
            courseTitle: enrollment.courses?.title,
            modules: 0,
            lessons: 0,
            completedLessons: 0,
            progressPercentage: 0,
            error: "No modules found"
          })
          continue
        }

        // Get lessons for all modules
        const moduleIds = modules.map(m => m.id)
        const { data: lessons, error: lessonsError } = await supabase
          .from("lessons")
          .select("id, title, module_id")
          .in("module_id", moduleIds)

        console.log("📖 Lessons:", lessons)
        console.log("❌ Lessons Error:", lessonsError)

        if (!lessons || lessons.length === 0) {
          debugData.push({
            courseId: enrollment.course_id,
            courseTitle: enrollment.courses?.title,
            modules: modules.length,
            lessons: 0,
            completedLessons: 0,
            progressPercentage: 0,
            error: "No lessons found"
          })
          continue
        }

        // Get completed lessons
        const lessonIds = lessons.map(l => l.id)
        const { data: completedLessons, error: completedError } = await supabase
          .from("lesson_progress")
          .select("id, lesson_id, completed, completed_at")
          .eq("student_id", user.id)
          .eq("completed", true)
          .in("lesson_id", lessonIds)

        console.log("✅ Completed Lessons:", completedLessons)
        console.log("❌ Completed Error:", completedError)

        // Calculate progress
        const progressPercentage = Math.round(((completedLessons?.length || 0) / lessons.length) * 100)

        console.log(`📊 Progress: ${completedLessons?.length || 0}/${lessons.length} = ${progressPercentage}%`)

        debugData.push({
          courseId: enrollment.course_id,
          courseTitle: enrollment.courses?.title,
          modules: modules.length,
          lessons: lessons.length,
          completedLessons: completedLessons?.length || 0,
          progressPercentage: progressPercentage,
          moduleDetails: modules,
          lessonDetails: lessons,
          completedDetails: completedLessons
        })
      }

      setDebugInfo(debugData)

    } catch (err) {
      console.error("Debug progress error:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsWorking(false)
    }
  }

  const fixProgressManually = async () => {
    setIsWorking(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error("Not authenticated")

      // Get all enrollments
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("*, courses(*)")
        .eq("student_id", user.id)

      if (!enrollments || enrollments.length === 0) {
        throw new Error("No enrollments found")
      }

      let fixedCount = 0

      for (const enrollment of enrollments) {
        // Get modules
        const { data: modules } = await supabase
          .from("modules")
          .select("id")
          .eq("course_id", enrollment.course_id)

        if (!modules || modules.length === 0) continue

        // Get lessons
        const moduleIds = modules.map(m => m.id)
        const { data: lessons } = await supabase
          .from("lessons")
          .select("id")
          .in("module_id", moduleIds)

        if (!lessons || lessons.length === 0) continue

        // Get completed lessons
        const lessonIds = lessons.map(l => l.id)
        const { data: completedLessons } = await supabase
          .from("lesson_progress")
          .select("id")
          .eq("student_id", user.id)
          .eq("completed", true)
          .in("lesson_id", lessonIds)

        // Calculate and update progress
        const progressPercentage = Math.round(((completedLessons?.length || 0) / lessons.length) * 100)

        const { error: updateError } = await supabase
          .from("enrollments")
          .update({ progress_percentage: progressPercentage })
          .eq("student_id", user.id)
          .eq("course_id", enrollment.course_id)

        if (!updateError) {
          fixedCount++
          console.log(`✅ Fixed progress for ${enrollment.courses?.title}: ${progressPercentage}%`)
        }
      }

      alert(`✅ Fixed progress for ${fixedCount} courses!`)
      
      // Refresh debug info
      await debugProgress()

    } catch (err) {
      console.error("Fix progress error:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsWorking(false)
    }
  }

  const createTestLessonProgress = async () => {
    setIsWorking(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error("Not authenticated")

      // Get first enrollment
      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("*, courses(*)")
        .eq("student_id", user.id)
        .limit(1)
        .single()

      if (!enrollment) throw new Error("No enrollments found")

      // Get first lesson
      const { data: modules } = await supabase
        .from("modules")
        .select("id")
        .eq("course_id", enrollment.course_id)

      if (!modules || modules.length === 0) throw new Error("No modules found")

      const { data: lessons } = await supabase
        .from("lessons")
        .select("id")
        .eq("module_id", modules[0].id)
        .limit(1)

      if (!lessons || lessons.length === 0) throw new Error("No lessons found")

      // Create lesson progress
      const { error: progressError } = await supabase.from("lesson_progress").upsert({
        student_id: user.id,
        lesson_id: lessons[0].id,
        completed: true,
        completed_at: new Date().toISOString(),
      })

      if (progressError) throw progressError

      alert(`✅ Created test lesson progress for lesson ${lessons[0].id}`)
      
      // Refresh debug info
      await debugProgress()

    } catch (err) {
      console.error("Create test progress error:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Debug Progress Issue</h1>
        <p className="text-muted-foreground">Debug why progress is always 0%</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Debug Tools</CardTitle>
          <CardDescription>Tools to debug and fix the progress calculation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={debugProgress} 
            disabled={isWorking}
            className="w-full"
          >
            {isWorking ? "Debugging..." : "Debug Progress Calculation"}
          </Button>

          <Button 
            onClick={fixProgressManually} 
            disabled={isWorking}
            variant="outline"
            className="w-full"
          >
            {isWorking ? "Fixing..." : "Fix Progress Manually"}
          </Button>

          <Button 
            onClick={createTestLessonProgress}
            disabled={isWorking}
            variant="outline"
            className="w-full"
          >
            {isWorking ? "Creating..." : "Create Test Lesson Progress"}
          </Button>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-bold text-red-800">Error:</h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {debugInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Debug Results</CardTitle>
            <CardDescription>Detailed progress calculation debug information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {debugInfo.map((course: any, index: number) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg">{course.courseTitle}</h3>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">{course.progressPercentage}%</p>
                      <p className="text-sm text-muted-foreground">
                        {course.completedLessons}/{course.lessons} lessons
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Modules:</p>
                      <p>{course.modules}</p>
                    </div>
                    <div>
                      <p className="font-medium">Lessons:</p>
                      <p>{course.lessons}</p>
                    </div>
                    <div>
                      <p className="font-medium">Completed:</p>
                      <p>{course.completedLessons}</p>
                    </div>
                  </div>

                  {course.error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded">
                      <p className="text-red-800 font-medium">Error:</p>
                      <p className="text-red-700">{course.error}</p>
                    </div>
                  )}

                  {course.moduleDetails && (
                    <details className="text-sm">
                      <summary className="font-medium cursor-pointer">Module Details</summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                        {JSON.stringify(course.moduleDetails, null, 2)}
                      </pre>
                    </details>
                  )}

                  {course.lessonDetails && (
                    <details className="text-sm">
                      <summary className="font-medium cursor-pointer">Lesson Details</summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                        {JSON.stringify(course.lessonDetails, null, 2)}
                      </pre>
                    </details>
                  )}

                  {course.completedDetails && (
                    <details className="text-sm">
                      <summary className="font-medium cursor-pointer">Completed Lessons</summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                        {JSON.stringify(course.completedDetails, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" onClick={() => router.push("/student/courses")}>
            Go to Student Courses
          </Button>
          <Button variant="outline" onClick={() => router.push("/fix-progress")}>
            Go to Progress Fix Tool
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}


