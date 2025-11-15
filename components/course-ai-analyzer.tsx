"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Sparkles } from "lucide-react"

interface CourseAIAnalyzerProps {
  courseData: {
    title: string
    description: string
    price: number
    status?: string
  }
}

export function CourseAIAnalyzer({ courseData }: CourseAIAnalyzerProps) {
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyzeWithAI = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/course-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseData }),
      })

      if (!response.ok) throw new Error("Failed to analyze course")

      const data = await response.json()
      setAnalysis(data.analysis)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-accent/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            <CardTitle>AI Course Analysis</CardTitle>
          </div>
          <Button
            onClick={analyzeWithAI}
            disabled={isLoading}
            size="sm"
            className="bg-gradient-to-r from-accent to-primary"
          >
            {isLoading ? (
              <>
                <LoadingSpinner />
                Analyzing...
              </>
            ) : (
              "Analyze with AI"
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">{error}</div>}
        {analysis && (
          <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{analysis}</div>
        )}
        {!analysis && !isLoading && !error && (
          <p className="text-sm text-muted-foreground italic">
            Click "Analyze with AI" to get insights about your course
          </p>
        )}
      </CardContent>
    </Card>
  )
}
