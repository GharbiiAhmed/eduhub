"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function TestCheckoutPage() {
  const [isTesting, setIsTesting] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleTestCheckout = async () => {
    setIsTesting(true)
    setError(null)
    setResult(null)

    try {
      const courseId = "e0dd41d0-7b4e-4aeb-98ff-b2bac79c1bce" // Your course ID
      
      console.log("Testing checkout API with course ID:", courseId)
      
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: courseId,
        }),
      })

      console.log("Checkout response status:", response.status)
      console.log("Checkout response headers:", response.headers)

      const data = await response.json()
      console.log("Checkout response data:", data)

      if (!response.ok) {
        throw new Error(`Checkout failed: ${data.error || 'Unknown error'}`)
      }

      if (data.free) {
        setResult("✅ Free enrollment successful! Check the server console for detailed logs.")
        
        // Wait a moment then redirect to student courses
        setTimeout(() => {
          router.push("/student/courses")
        }, 2000)
      } else if (data.sessionId) {
        setResult("✅ Stripe checkout session created. This would redirect to Stripe.")
      } else {
        setResult("✅ Checkout successful, but unexpected response format.")
      }

    } catch (err) {
      console.error("Test checkout error:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsTesting(false)
    }
  }

  const handleGoToStudentCourses = () => {
    router.push("/student/courses")
  }

  const handleGoToCourse = () => {
    router.push("/courses/e0dd41d0-7b4e-4aeb-98ff-b2bac79c1bce")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Test Checkout API</h1>
        <p className="text-muted-foreground">Test the checkout API directly to see what's happening</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Checkout API Test</CardTitle>
          <CardDescription>This will test the checkout API with your course ID and show detailed logs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleTestCheckout} 
            disabled={isTesting}
            className="w-full"
          >
            {isTesting ? "Testing Checkout..." : "Test Checkout API"}
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

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleGoToStudentCourses}
              className="flex-1"
            >
              Go to Student Courses
            </Button>
            <Button 
              variant="outline" 
              onClick={handleGoToCourse}
              className="flex-1"
            >
              Go to Course Page
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What This Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Tests the checkout API endpoint directly</li>
            <li>• Shows detailed console logs of the enrollment process</li>
            <li>• Verifies if enrollment is created successfully</li>
            <li>• Checks for any authentication or database errors</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}


