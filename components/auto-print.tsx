"use client"

import { useEffect } from "react"

export function AutoPrint() {
  useEffect(() => {
    // Wait for page to fully load, then trigger print
    const timer = setTimeout(() => {
      window.print()
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  return null
}

