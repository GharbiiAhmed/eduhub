"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export default function TestQrokPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [testMessage, setTestMessage] = useState("Hello, can you help me with my learning?")

  const testAI = async () => {
    setIsLoading(true)
    setError("")
    setResult("")

    try {
      const response = await fetch("/api/ai-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          context: testMessage,
          userType: "student"
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setResult(data.suggestion || "No response received")
    } catch (err) {
      console.error("Test AI error:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsLoading(false)
    }
  }

  const testChat = async () => {
    setIsLoading(true)
    setError("")
    setResult("")

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            { role: "user", content: testMessage }
          ]
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // For streaming response, we'll read it as text
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("No response body")
      }

      let fullResponse = ""
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            
            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                fullResponse += parsed.content
                setResult(fullResponse)
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      setResult(fullResponse || "No response received")
    } catch (err) {
      console.error("Test chat error:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsLoading(false)
    }
  }

  const testCourseAnalysis = async () => {
    setIsLoading(true)
    setError("")
    setResult("")

    try {
      const response = await fetch("/api/course-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseData: {
            title: "Introduction to Web Development",
            description: "Learn the basics of HTML, CSS, and JavaScript",
            price: 99,
            status: "published"
          }
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setResult(data.analysis || "No analysis received")
    } catch (err) {
      console.error("Test course analysis error:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Test Qrok API Integration</h1>
        <p className="text-muted-foreground">Test the Qrok API with ChatGPT agent</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Configuration</CardTitle>
          <CardDescription>Configure your test message</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="test-message">Test Message</Label>
            <Textarea
              id="test-message"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Enter your test message..."
              className="mt-2"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Tests</CardTitle>
          <CardDescription>Test different Qrok API endpoints</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              onClick={testAI} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Testing..." : "Test AI Suggestions"}
            </Button>

            <Button 
              onClick={testChat} 
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              {isLoading ? "Testing..." : "Test Chat API"}
            </Button>

            <Button 
              onClick={testCourseAnalysis}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              {isLoading ? "Testing..." : "Test Course Analysis"}
            </Button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-bold text-red-800">Error:</h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {result && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-bold text-green-800">Response:</h3>
              <div className="text-green-700 whitespace-pre-wrap">{result}</div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Environment Setup</CardTitle>
          <CardDescription>Make sure you have the Qrok API key configured</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Add your Qrok API key to your <code>.env.local</code> file:
            </p>
            <div className="bg-gray-100 p-3 rounded-lg font-mono text-sm">
              QROK_API_KEY=your_qrok_api_key_here
            </div>
            <p className="text-sm text-muted-foreground">
              Replace <code>your_qrok_api_key_here</code> with your actual Qrok API key.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


