"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function TestEnrollmentPage() {
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleTestEnrollment = async () => {
    setIsEnrolling(true)
    setError(null)
    setSuccess(false)

    try {
      // First, get the first available course
      const supabase = createClient()
      
      const { data: courses } = await supabase
        .from("courses")
        .select("*")
        .eq("status", "published")
        .limit(1)

      if (!courses || courses.length === 0) {
        throw new Error("No published courses found")
      }

      const courseId = courses[0].id
      console.log("Testing enrollment for course:", courseId)

      // Test the enrollment API
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: courseId,
        }),
      })

      console.log("Enrollment response:", response)

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Enrollment failed: ${errorData}`)
      }

      const data = await response.json()
      console.log("Enrollment data:", data)

      if (data.free) {
        setSuccess(true)
        // Redirect to student courses page
        setTimeout(() => {
          router.push("/student/courses")
        }, 2000)
      } else {
        throw new Error("Expected free enrollment but got paid flow")
      }
    } catch (err) {
      console.error("Enrollment error:", err)
      setError(err instanceof Error ? err.message : "Enrollment failed")
    } finally {
      setIsEnrolling(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Test Enrollment</h1>
        <p className="text-muted-foreground">Test the enrollment process</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enrollment Test</CardTitle>
          <CardDescription>Click the button below to test enrolling in the first available course</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleTestEnrollment} 
            disabled={isEnrolling}
            className="w-full"
          >
            {isEnrolling ? "Testing Enrollment..." : "Test Enrollment"}
          </Button>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-bold text-red-800">Error:</h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-bold text-green-800">Success!</h3>
              <p className="text-green-700">Enrollment successful! Redirecting to student courses...</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Debug Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" onClick={() => router.push("/debug-enrollment")}>
            View Debug Enrollment Page
          </Button>
          <Button variant="outline" onClick={() => router.push("/debug-courses")}>
            View Debug Courses Page
          </Button>
          <Button variant="outline" onClick={() => router.push("/student/courses")}>
            Go to Student Courses
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}


