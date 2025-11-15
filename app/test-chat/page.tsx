"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, MessageCircle } from "lucide-react"

export default function ChatTestPage() {
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState("")
  const [error, setError] = useState("")

  const sendMessage = async () => {
    if (!message.trim()) return

    setIsLoading(true)
    setError("")
    setResponse("")

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            { role: "user", content: message }
          ]
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      // Handle streaming response
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
                setResponse(fullResponse)
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

    } catch (err) {
      console.error("Chat test error:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Chat Test</h1>
        <p className="text-muted-foreground">Test the AI chat functionality</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chat with EduHub AI Assistant</CardTitle>
          <CardDescription>Test the streaming chat functionality</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message here..."
              disabled={isLoading}
            />
            <Button 
              onClick={sendMessage} 
              disabled={isLoading || !message.trim()}
              className="w-full"
            >
              {isLoading ? "Sending..." : "Send Message"}
            </Button>
          </div>

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Error:</strong> {error}
              </AlertDescription>
            </Alert>
          )}

          {response && (
            <Alert className="border-green-200 bg-green-50">
              <MessageCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>AI Response:</strong>
                <div className="mt-2 whitespace-pre-wrap">{response}</div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Messages</CardTitle>
          <CardDescription>Try these sample messages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              "Hello! How can you help me?",
              "I want to learn web development",
              "What courses do you recommend?",
              "How do I create a course?",
              "Tell me about the platform features"
            ].map((testMsg, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setMessage(testMsg)}
                disabled={isLoading}
                className="text-left justify-start h-auto p-2"
              >
                {testMsg}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
          <CardDescription>Current chat system status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm">Chat API is working with mock responses</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            The chat system will use mock AI responses until you configure a real AI API key.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}


