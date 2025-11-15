"use client"

import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ApiErrorHandlerProps {
  error: Error | null
  onRetry?: () => void
  title?: string
}

export function ApiErrorHandler({ error, onRetry, title = "Something went wrong" }: ApiErrorHandlerProps) {
  if (!error) return null

  return (
    <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 space-y-3">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-destructive">{title}</h3>
          <p className="text-sm text-destructive/80 mt-1">{error.message}</p>
        </div>
      </div>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm" className="w-full bg-transparent">
          Try Again
        </Button>
      )}
    </div>
  )
}
