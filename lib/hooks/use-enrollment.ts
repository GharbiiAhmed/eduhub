"use client"

import { useEffect, useState } from "react"
import { useAuth } from "./use-auth"

interface EnrollmentStatus {
  enrolled: boolean
  enrollment: any
  loading: boolean
  error: Error | null
}

export function useEnrollmentStatus(courseId: string): EnrollmentStatus {
  const { user } = useAuth()
  const [enrolled, setEnrolled] = useState(false)
  const [enrollment, setEnrollment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!user || !courseId) {
      setLoading(false)
      return
    }

    const checkEnrollment = async () => {
      try {
        const response = await fetch(`/api/enrollment-status?courseId=${courseId}`)
        if (!response.ok) throw new Error("Failed to check enrollment")

        const data = await response.json()
        setEnrolled(data.enrolled)
        setEnrollment(data.enrollment)
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"))
      } finally {
        setLoading(false)
      }
    }

    checkEnrollment()
  }, [user, courseId])

  return { enrolled, enrollment, loading, error }
}

export function useEnroll() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const enroll = async (courseId: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to enroll")
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

  return { enroll, loading, error }
}
