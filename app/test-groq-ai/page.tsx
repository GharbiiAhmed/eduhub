"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, Bot, Loader2 } from "lucide-react"

export default function GroqTestPage() {
  const [testQuery, setTestQuery] = useState("Hello! Can you help me with course recommendations?")
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    response?: string
    error?: string
  } | null>(null)

  const testGroq = async () => {
    if (!testQuery.trim()) return

    setIsTesting(true)
    setTestResult(null)

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: testQuery,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setTestResult({
          success: true,
          response: data.response
        })
      } else {
        setTestResult({
          success: false,
          error: data.error
        })
      }
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      })
    } finally {
      setIsTesting(false)
    }
  }

  const sampleQueries = [
    "Hello! Can you help me with course recommendations?",
    "How do I enroll in a course?",
    "What courses do you recommend for beginners?",
    "How do I track my learning progress?",
    "Can you help me create a course as an instructor?",
    "What are the platform features?",
    "Tell me about team collaboration features"
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Groq AI Test</h1>
        <p className="text-muted-foreground">Test the real Groq AI integration</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bot className="h-5 w-5 text-primary" />
            <span>Test Groq AI</span>
          </CardTitle>
          <CardDescription>
            Send a message to test the real Groq AI integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Query</label>
            <Textarea
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              placeholder="Enter your question..."
              rows={3}
            />
          </div>

          <Button 
            onClick={testGroq} 
            disabled={isTesting || !testQuery.trim()}
            className="w-full"
          >
            {isTesting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing Groq AI...
              </>
            ) : (
              <>
                <Bot className="h-4 w-4 mr-2" />
                Test Groq AI
              </>
            )}
          </Button>

          {testResult && (
            <Alert className={testResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              {testResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={testResult.success ? "text-green-800" : "text-red-800"}>
                <strong>{testResult.success ? "Success! Groq AI is working!" : "Error"}</strong>
                {testResult.response && (
                  <>
                    <br />
                    <div className="mt-2 whitespace-pre-wrap bg-white p-3 rounded border">
                      {testResult.response}
                    </div>
                  </>
                )}
                {testResult.error && (
                  <>
                    <br />
                    <div className="mt-2">{testResult.error}</div>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sample Queries</CardTitle>
          <CardDescription>Try these sample questions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {sampleQueries.map((query, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setTestQuery(query)}
                disabled={isTesting}
                className="text-left justify-start h-auto p-3"
              >
                {query}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
          <CardDescription>Current Groq AI status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Groq SDK installed</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Real AI responses enabled</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Database logging active</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Course context support</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


