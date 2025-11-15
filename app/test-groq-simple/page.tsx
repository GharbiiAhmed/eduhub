"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, Bot, Loader2 } from "lucide-react"

export default function SimpleGroqTestPage() {
  const [query, setQuery] = useState("Hello! How are you?")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    response?: string
    error?: string
  } | null>(null)

  const testGroq = async () => {
    if (!query.trim()) return

    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/test-groq-simple", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      })

      const data = await response.json()

      if (data.success) {
        setResult({
          success: true,
          response: data.response
        })
      } else {
        setResult({
          success: false,
          error: data.error
        })
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Simple Groq Test</h1>
        <p className="text-muted-foreground">Test Groq AI without streaming</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bot className="h-5 w-5 text-primary" />
            <span>Test Groq AI</span>
          </CardTitle>
          <CardDescription>
            Simple test to verify Groq AI is working
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Query</label>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your question..."
            />
          </div>

          <Button 
            onClick={testGroq} 
            disabled={isLoading || !query.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Bot className="h-4 w-4 mr-2" />
                Test Groq AI
              </>
            )}
          </Button>

          {result && (
            <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              {result.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={result.success ? "text-green-800" : "text-red-800"}>
                <strong>{result.success ? "Success!" : "Error"}</strong>
                {result.response && (
                  <>
                    <br />
                    <div className="mt-2 whitespace-pre-wrap bg-white p-3 rounded border">
                      {result.response}
                    </div>
                  </>
                )}
                {result.error && (
                  <>
                    <br />
                    <div className="mt-2">{result.error}</div>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


