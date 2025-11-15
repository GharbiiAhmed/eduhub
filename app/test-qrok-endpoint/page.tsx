"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react"

export default function QrokEndpointTestPage() {
  const [isTesting, setIsTesting] = useState(false)
  const [results, setResults] = useState<Array<{
    endpoint: string
    success: boolean
    error?: string
    response?: any
  }>>([])

  const testEndpoint = async (endpoint: string) => {
    try {
      const response = await fetch('/api/test-qrok-endpoint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ endpoint })
      })

      const data = await response.json()
      return {
        endpoint,
        success: response.ok,
        error: data.error,
        response: data.response
      }
    } catch (error) {
      return {
        endpoint,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  const testAllEndpoints = async () => {
    setIsTesting(true)
    setResults([])

    const possibleEndpoints = [
      'https://api.qrok.io/v1',
      'https://qrok.io/api/v1',
      'https://api.qrok.com/v1',
      'https://qrok.com/api/v1',
      'https://api.qrok.dev/v1',
      'https://qrok.dev/api/v1',
      'https://api.qrok.net/v1',
      'https://qrok.net/api/v1',
    ]

    const testResults = []
    for (const endpoint of possibleEndpoints) {
      const result = await testEndpoint(endpoint)
      testResults.push(result)
      setResults([...testResults])
    }

    setIsTesting(false)
  }

  const testCustomEndpoint = async () => {
    const customEndpoint = (document.getElementById('custom-endpoint') as HTMLInputElement)?.value
    if (!customEndpoint) return

    setIsTesting(true)
    const result = await testEndpoint(customEndpoint)
    setResults([result])
    setIsTesting(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Qrok API Endpoint Test</h1>
        <p className="text-muted-foreground">Find the correct Qrok API endpoint</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Endpoints</CardTitle>
          <CardDescription>Test different possible Qrok API endpoints</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={testAllEndpoints} 
            disabled={isTesting}
            className="w-full"
          >
            {isTesting ? "Testing..." : "Test All Possible Endpoints"}
          </Button>

          <div className="space-y-2">
            <Label htmlFor="custom-endpoint">Custom Endpoint</Label>
            <div className="flex space-x-2">
              <Input
                id="custom-endpoint"
                placeholder="https://your-qrok-endpoint.com/v1"
                className="flex-1"
              />
              <Button 
                onClick={testCustomEndpoint} 
                disabled={isTesting}
                variant="outline"
              >
                Test
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>Results from endpoint testing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-sm font-mono">{result.endpoint}</code>
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                  
                  {result.success ? (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        ✅ Endpoint is working! This might be the correct Qrok API endpoint.
                        <br />
                        Response: {JSON.stringify(result.response, null, 2)}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="border-red-200 bg-red-50">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        ❌ Endpoint failed: {result.error}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
          <CardDescription>What to do after finding the correct endpoint</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>Important:</strong> Once you find the working endpoint, add it to your <code>.env.local</code> file:
              <br />
              <code>QROK_BASE_URL=https://working-endpoint.com/v1</code>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              If none of the endpoints work, you might need to:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Check Qrok's official documentation</li>
              <li>Contact Qrok support for the correct API endpoint</li>
              <li>Verify your API key is valid</li>
              <li>Check if there are any regional endpoints</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


