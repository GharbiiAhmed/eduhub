"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, Bot, Loader2 } from "lucide-react"

export default function DebugChatPage() {
  const [query, setQuery] = useState("YO")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [rawResponse, setRawResponse] = useState("")

  const testChat = async () => {
    setIsLoading(true)
    setResult(null)
    setRawResponse("")

    try {
      console.log("Testing chat API...")
      
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            { role: "user", content: query }
          ]
        }),
      })

      console.log("Response status:", response.status)
      console.log("Response headers:", Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Read the streaming response
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
        console.log("Received chunk:", chunk)
        fullResponse += chunk

        // Parse streaming data
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            console.log("Data line:", data)
            
            if (data === '[DONE]') {
              console.log("Stream complete")
              break
            }
            
            try {
              const parsed = JSON.parse(data)
              console.log("Parsed data:", parsed)
              setResult(parsed)
            } catch (e) {
              console.log("Failed to parse JSON:", e)
            }
          }
        }
      }

      setRawResponse(fullResponse)
      console.log("Full response:", fullResponse)

    } catch (error) {
      console.error("Chat test error:", error)
      setResult({ error: error instanceof Error ? error.message : "Unknown error" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Debug Chat API</h1>
        <p className="text-muted-foreground">Test the chat API and see exactly what's happening</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bot className="h-5 w-5 text-primary" />
            <span>Debug Chat</span>
          </CardTitle>
          <CardDescription>
            Test the chat API and see the raw response
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
            onClick={testChat} 
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
                Test Chat API
              </>
            )}
          </Button>

          {result && (
            <Alert className={result.error ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
              {result.error ? (
                <XCircle className="h-4 w-4 text-red-600" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
              <AlertDescription className={result.error ? "text-red-800" : "text-green-800"}>
                <strong>{result.error ? "Error" : "Success!"}</strong>
                {result.content && (
                  <>
                    <br />
                    <div className="mt-2 whitespace-pre-wrap bg-white p-3 rounded border">
                      <strong>AI Response:</strong><br />
                      {result.content}
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

          {rawResponse && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Raw Response:</h4>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-40">
                {rawResponse}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Enter a message and click "Test Chat API"</li>
            <li>Open browser Developer Tools (F12)</li>
            <li>Check the Console tab for detailed logs</li>
            <li>Look for "Received chunk:", "Data line:", and "Parsed data:" logs</li>
            <li>Check if the AI response appears above</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}


