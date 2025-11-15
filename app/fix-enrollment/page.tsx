"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function FixEnrollmentPage() {
  const [isWorking, setIsWorking] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleFixEnrollment = async () => {
    setIsWorking(true)
    setError(null)
    setResult(null)

    try {
      const supabase = createClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error("Not authenticated")
      }

      // Get the course ID from URL or use a test one
      const courseId = "e0dd41d0-7b4e-4aeb-98ff-b2bac79c1bce" // Your course ID from the logs
      
      console.log("User ID:", user.id)
      console.log("Course ID:", courseId)

      // Try to create enrollment directly
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from("enrollments")
        .insert({
          student_id: user.id,
          course_id: courseId,
        })
        .select()
        .single()

      if (enrollmentError) {
        console.error("Enrollment error:", enrollmentError)
        
        // If it's a duplicate key error, that means enrollment already exists
        if (enrollmentError.code === "23505") {
          setResult("✅ Enrollment already exists! You are enrolled in this course.")
        } else {
          throw new Error(`Enrollment failed: ${enrollmentError.message}`)
        }
      } else {
        console.log("Enrollment created:", enrollmentData)
        setResult("✅ Enrollment created successfully!")
      }

      // Now try to query enrollments to verify
      const { data: allEnrollments, error: queryError } = await supabase
        .from("enrollments")
        .select("*")
        .eq("student_id", user.id)

      if (queryError) {
        console.error("Query error:", queryError)
        setError(`Query failed: ${queryError.message}`)
      } else {
        console.log("All enrollments:", allEnrollments)
        setResult(prev => prev + ` Found ${allEnrollments?.length || 0} total enrollments.`)
      }

    } catch (err) {
      console.error("Error:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsWorking(false)
    }
  }

  const handleGoToStudentCourses = () => {
    router.push("/student/courses")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fix Enrollment Issue</h1>
        <p className="text-muted-foreground">Manually fix the enrollment for your course</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enrollment Fix</CardTitle>
          <CardDescription>This will manually create the enrollment and check the results</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleFixEnrollment} 
            disabled={isWorking}
            className="w-full"
          >
            {isWorking ? "Fixing Enrollment..." : "Fix Enrollment"}
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

          <Button 
            variant="outline" 
            onClick={handleGoToStudentCourses}
            className="w-full"
          >
            Go to Student Courses
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The 406 error suggests the enrollment query is failing due to RLS policies. 
            This tool will manually create the enrollment and verify it works.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}


