"use client"

import { useState } from "react"

export function useUpdateProgress() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const updateProgress = async (courseId: string, lessonId: string, completed: boolean) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/update-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, lessonId, completed }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update progress")
      }

      return await response.json()
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error")
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  return { updateProgress, loading, error }
}
