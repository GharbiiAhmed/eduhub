"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Lightbulb, RefreshCw } from "lucide-react"

interface AISuggestionsPanelProps {
  context: string
  userType: "student" | "instructor" | "admin"
  title?: string
}

export function AISuggestionsPanel({ context, userType, title = "AI Suggestions" }: AISuggestionsPanelProps) {
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSuggestion = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/ai-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, userType }),
      })

      if (!response.ok) throw new Error("Failed to fetch suggestions")

      const data = await response.json()
      setSuggestion(data.suggestion)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-secondary/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-accent" />
            <CardTitle>{title}</CardTitle>
          </div>
          <Button
            onClick={fetchSuggestion}
            disabled={isLoading}
            size="sm"
            variant="outline"
            className="gap-2 bg-transparent"
          >
            {isLoading ? (
              <>
                <LoadingSpinner />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Get Suggestion
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">{error}</div>}
        {suggestion && (
          <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{suggestion}</div>
        )}
        {!suggestion && !isLoading && !error && (
          <p className="text-sm text-muted-foreground italic">
            Click "Get Suggestion" to receive AI-powered recommendations
          </p>
        )}
      </CardContent>
    </Card>
  )
}
