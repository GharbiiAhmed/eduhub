"use client"

import { useState, useEffect } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ChevronLeft, ChevronRight, X, BookOpen } from "lucide-react"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"
import "./book-reader.css"

// Set up PDF.js worker
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`
}

interface BookReaderProps {
  pdfUrl: string
  title: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BookReader({ pdfUrl, title, open, onOpenChange }: BookReaderProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageWidth, setPageWidth] = useState(600)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setCurrentPage(1)
      setLoading(true)
      setError(null)
    }
  }, [open, pdfUrl])

  useEffect(() => {
    // Calculate page width based on viewport
    const updatePageWidth = () => {
      const width = Math.min(window.innerWidth * 0.4, 500)
      setPageWidth(width)
    }
    updatePageWidth()
    window.addEventListener("resize", updatePageWidth)
    return () => window.removeEventListener("resize", updatePageWidth)
  }, [])

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setLoading(false)
    setError(null)
  }

  const onDocumentLoadError = (error: Error) => {
    console.error("Error loading PDF:", error)
    setError("Failed to load PDF. Please try again.")
    setLoading(false)
  }

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const goToNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!open) return
    if (e.key === "ArrowLeft") goToPrevPage()
    if (e.key === "ArrowRight") goToNextPage()
  }

  useEffect(() => {
    if (open) {
      window.addEventListener("keydown", handleKeyDown as any)
      return () => window.removeEventListener("keydown", handleKeyDown as any)
    }
  }, [open, currentPage, numPages])

  // Calculate which pages to show (two-page spread)
  const leftPage = currentPage % 2 === 0 ? currentPage - 1 : currentPage
  const rightPage = currentPage % 2 === 0 ? currentPage : currentPage + 1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 dark:from-amber-950 dark:via-orange-950 dark:to-amber-900 overflow-hidden">
        {/* Accessibility: Hidden title and description for screen readers */}
        <VisuallyHidden.Root>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Book reader for {title}. Use arrow keys or navigation buttons to turn pages.
          </DialogDescription>
        </VisuallyHidden.Root>
        
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-800/90 to-orange-800/90 dark:from-amber-900/90 dark:to-orange-900/90 backdrop-blur-sm border-b border-amber-700/50 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-amber-100" />
            <h2 className="text-lg font-semibold text-amber-50 truncate max-w-md">{title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-amber-100 px-3 py-1 bg-amber-900/50 rounded-full">
              Page {currentPage} of {numPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-amber-100 hover:bg-amber-800/50"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Book Container */}
        <div className="w-full h-full flex items-center justify-center pt-16 pb-24 overflow-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-amber-800 dark:text-amber-200">Loading book...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center gap-4 p-8">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                <X className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-red-800 dark:text-red-200 font-medium">{error}</p>
              <Button onClick={() => window.location.reload()} variant="outline">
                Retry
              </Button>
            </div>
          )}

          {!loading && !error && numPages > 0 && (
            <div className="relative flex items-center justify-center gap-2 perspective-1000 w-full h-full">
              {/* Book Pages Container */}
              <div className="relative flex items-center gap-1 book-container" style={{ height: 'calc(95vh - 200px)' }}>
                {/* Left Page */}
                <div className="relative book-page book-page-left" style={{ width: `${pageWidth}px`, height: '100%' }}>
                  <div className="book-page-inner" style={{ width: '100%', height: '100%', overflow: 'auto' }}>
                    <div className="flex items-center justify-center h-full p-4">
                      <Page
                        pageNumber={leftPage}
                        width={pageWidth - 32}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                        className="book-page-content"
                        loading={
                          <div className="flex items-center justify-center h-full">
                            <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        }
                      />
                    </div>
                  </div>
                  {leftPage % 2 === 0 && (
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-900/20 to-transparent pointer-events-none"></div>
                  )}
                </div>

                {/* Book Spine Shadow */}
                <div className="w-2 h-full bg-gradient-to-r from-amber-900/30 via-amber-800/50 to-amber-900/30 shadow-2xl"></div>

                {/* Right Page */}
                {rightPage <= numPages && (
                  <div className="relative book-page book-page-right" style={{ width: `${pageWidth}px`, height: '100%' }}>
                    <div className="book-page-inner" style={{ width: '100%', height: '100%', overflow: 'auto' }}>
                      <div className="flex items-center justify-center h-full p-4">
                        <Page
                          pageNumber={rightPage}
                          width={pageWidth - 32}
                          renderTextLayer={true}
                          renderAnnotationLayer={true}
                          className="book-page-content"
                          loading={
                            <div className="flex items-center justify-center h-full">
                              <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          }
                        />
                      </div>
                    </div>
                    {rightPage % 2 === 1 && (
                      <div className="absolute inset-0 bg-gradient-to-l from-amber-900/20 to-transparent pointer-events-none"></div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Controls */}
        {!loading && !error && numPages > 0 && (
          <div className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-800/90 to-orange-800/90 dark:from-amber-900/90 dark:to-orange-900/90 backdrop-blur-sm border-t border-amber-700/50 px-6 py-4">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              <Button
                onClick={goToPrevPage}
                disabled={currentPage <= 1}
                className="bg-amber-700 hover:bg-amber-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                size="lg"
              >
                <ChevronLeft className="w-5 h-5 mr-2" />
                Previous
              </Button>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={numPages}
                  value={currentPage}
                  onChange={(e) => {
                    const page = parseInt(e.target.value)
                    if (page >= 1 && page <= numPages) {
                      setCurrentPage(page)
                    }
                  }}
                  className="w-20 px-3 py-2 text-center bg-amber-900/50 border border-amber-700 rounded-lg text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-amber-100">/ {numPages}</span>
              </div>

              <Button
                onClick={goToNextPage}
                disabled={currentPage >= numPages}
                className="bg-amber-700 hover:bg-amber-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                size="lg"
              >
                Next
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

