"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react"

export default function EnvCheckPage() {
  const [envStatus, setEnvStatus] = useState<{
    hasKey: boolean
    keyLength: number
    error?: string
  } | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  const checkEnvironment = async () => {
    setIsChecking(true)
    setEnvStatus(null)

    try {
      const response = await fetch("/api/env-check")
      const data = await response.json()
      setEnvStatus(data)
    } catch (error) {
      setEnvStatus({
        hasKey: false,
        keyLength: 0,
        error: error instanceof Error ? error.message : "Unknown error"
      })
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Environment Check</h1>
        <p className="text-muted-foreground">Check if your Qrok API key is properly configured</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Environment Status</CardTitle>
          <CardDescription>Check if QROK_API_KEY is properly loaded</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={checkEnvironment} 
            disabled={isChecking}
            className="w-full"
          >
            {isChecking ? "Checking..." : "Check Environment"}
          </Button>

          {envStatus && (
            <div className="space-y-4">
              {envStatus.hasKey ? (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    ✅ QROK_API_KEY is properly configured!
                    <br />
                    Key length: {envStatus.keyLength} characters
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-red-200 bg-red-50">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    ❌ QROK_API_KEY is not configured or not loaded
                    {envStatus.error && (
                      <>
                        <br />
                        Error: {envStatus.error}
                      </>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
          <CardDescription>How to properly configure your Qrok API key</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">1</div>
              <div>
                <p className="font-medium">Create .env.local file</p>
                <p className="text-sm text-muted-foreground">In your project root directory</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">2</div>
              <div>
                <p className="font-medium">Add your API key</p>
                <div className="bg-gray-100 p-2 rounded text-sm font-mono mt-1">
                  QROK_API_KEY=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
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">3</div>
              <div>
                <p className="font-medium">Restart your development server</p>
                <p className="text-sm text-muted-foreground">Stop (Ctrl+C) and run <code>npm run dev</code> again</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">4</div>
              <div>
                <p className="font-medium">Test the integration</p>
                <p className="text-sm text-muted-foreground">Visit <code>/test-qrok</code> to test the API</p>
              </div>
            </div>
          </div>

          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>Important:</strong> Environment variables are only loaded when the server starts. 
              You must restart your development server after adding or changing environment variables.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" onClick={() => window.open('/test-qrok', '_blank')}>
            Test Qrok API
          </Button>
          <Button variant="outline" onClick={() => window.open('/debug-progress', '_blank')}>
            Debug Progress
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}


