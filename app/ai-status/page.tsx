"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react"

export default function AIStatusPage() {
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
    details?: string
  } | null>(null)

  const testAI = async () => {
    setIsTesting(true)
    setTestResult(null)

    try {
      const response = await fetch("/api/ai-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          context: "I want to learn web development",
          userType: "student"
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      setTestResult({
        success: true,
        message: "AI Suggestions API is working!",
        details: data.suggestion
      })
    } catch (error) {
      setTestResult({
        success: false,
        message: "AI Suggestions API failed",
        details: error instanceof Error ? error.message : "Unknown error"
      })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Status Dashboard</h1>
        <p className="text-muted-foreground">Check the status of your AI integration</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI System Status</CardTitle>
          <CardDescription>Current status of AI features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm">AI Suggestions</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm">Course Analysis</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm">Chat System</span>
            </div>
          </div>

          <Button 
            onClick={testAI} 
            disabled={isTesting}
            className="w-full"
          >
            {isTesting ? "Testing..." : "Test AI Suggestions"}
          </Button>

          {testResult && (
            <Alert className={testResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              {testResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={testResult.success ? "text-green-800" : "text-red-800"}>
                <strong>{testResult.message}</strong>
                {testResult.details && (
                  <>
                    <br />
                    <details className="mt-2">
                      <summary className="cursor-pointer font-medium">Details</summary>
                      <div className="mt-2 text-sm whitespace-pre-wrap">{testResult.details}</div>
                    </details>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Configuration</CardTitle>
          <CardDescription>How your AI system is currently set up</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Current Setup:</strong> Your AI system is using mock responses because the Qrok API endpoint is not properly configured.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h4 className="font-medium">What's Working:</h4>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>✅ AI Suggestions API responds with helpful mock responses</li>
                <li>✅ Course Analysis API provides structured analysis</li>
                <li>✅ Chat system has fallback functionality</li>
                <li>✅ All AI features are accessible to users</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">To Enable Real AI:</h4>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Add your OpenAI API key to .env.local: <code>OPENAI_API_KEY=sk-...</code></li>
                <li>Or find the correct Qrok API endpoint and add: <code>QROK_BASE_URL=https://...</code></li>
                <li>Restart your development server</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" onClick={() => window.open('/test-qrok', '_blank')}>
            Test Qrok Integration
          </Button>
          <Button variant="outline" onClick={() => window.open('/test-qrok-endpoint', '_blank')}>
            Find Qrok Endpoint
          </Button>
          <Button variant="outline" onClick={() => window.open('/env-check', '_blank')}>
            Check Environment
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}


