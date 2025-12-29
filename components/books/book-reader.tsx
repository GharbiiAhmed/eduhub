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
  // Use jsdelivr CDN which is very reliable and has all versions
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`
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
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [useBlob, setUseBlob] = useState(false)

  useEffect(() => {
    if (open) {
      setCurrentPage(1)
      setLoading(true)
      setError(null)
      setPdfBlob(null)
      setUseBlob(false)
      console.log("BookReader: Opening with PDF URL:", pdfUrl)
      
      // Try to fetch as blob first to handle CORS issues
      const fetchPdfAsBlob = async () => {
        try {
          const response = await fetch(pdfUrl, {
            method: 'GET',
            mode: 'cors',
            credentials: 'omit',
          })
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          
          const blob = await response.blob()
          console.log("BookReader: PDF fetched as blob successfully")
          setPdfBlob(blob)
          setUseBlob(true)
        } catch (err) {
          console.warn("BookReader: Failed to fetch as blob, will try direct URL:", err)
          setUseBlob(false)
        }
      }
      
      fetchPdfAsBlob()
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
    console.log("BookReader: PDF loaded successfully, pages:", numPages)
    setNumPages(numPages)
    setLoading(false)
    setError(null)
  }

  const onDocumentLoadError = (error: Error) => {
    console.error("Error loading PDF:", error)
    console.error("PDF URL:", pdfUrl)
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack
    })
    
    let errorMessage = "Failed to load PDF document."
    
    if (error.message?.includes("CORS")) {
      errorMessage = "CORS error: The PDF server doesn't allow cross-origin requests. Please contact support."
    } else if (error.message?.includes("404") || error.message?.includes("Not Found")) {
      errorMessage = "PDF file not found. The file may have been moved or deleted."
    } else if (error.message?.includes("403") || error.message?.includes("Forbidden")) {
      errorMessage = "Access denied. You may not have permission to view this PDF."
    } else if (error.message?.includes("network") || error.message?.includes("fetch")) {
      errorMessage = "Network error. Please check your internet connection and try again."
    } else {
      errorMessage = `Failed to load PDF: ${error.message || "Unknown error"}. Please try again.`
    }
    
    setError(errorMessage)
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
          <Document
            file={useBlob && pdfBlob ? pdfBlob : pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-amber-800 dark:text-amber-200">Loading PDF document...</p>
                <p className="text-sm text-amber-700 dark:text-amber-300">This may take a moment</p>
              </div>
            }
            error={
              <div className="flex flex-col items-center justify-center gap-4 p-8">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                  <X className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <p className="text-red-800 dark:text-red-200 font-medium">Failed to load PDF document</p>
                <p className="text-sm text-red-700 dark:text-red-300 text-center max-w-md">
                  {error || "The PDF may be unavailable or there may be a network issue. Please try again."}
                </p>
                <Button 
                  onClick={() => { 
                    setLoading(true); 
                    setError(null);
                    setCurrentPage(1);
                    setNumPages(0);
                  }} 
                  variant="outline"
                >
                  Retry
                </Button>
              </div>
            }
            options={{
              cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/cmaps/`,
              cMapPacked: true,
              standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
            }}
          >
              {numPages > 0 && (
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
            </Document>
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

