"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ChevronLeft, ChevronRight, X, BookOpen } from "lucide-react"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"
import "./book-reader.css"

// ---- PDF.js worker init (keep yours) ----
let workerInitialized = false
const initializeWorker = () => {
  if (typeof window === "undefined" || workerInitialized) return
  try {
    const workerVersion = "5.4.296"
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${workerVersion}/build/pdf.worker.min.mjs`
    workerInitialized = true
    console.log("PDF.js worker configured:", pdfjs.GlobalWorkerOptions.workerSrc)
  } catch (error) {
    console.error("Error setting up PDF.js worker:", error)
  }
}

interface BookReaderProps {
  pdfUrl: string
  title: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

type FlipDir = "next" | "prev"

export function BookReader({ pdfUrl, title, open, onOpenChange }: BookReaderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  const [numPages, setNumPages] = useState(0)
  const [pageIndex, setPageIndex] = useState(1) // "current logical page" (we'll derive spread)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isClient, setIsClient] = useState(false)

  // responsive/layout
  const [isTwoPage, setIsTwoPage] = useState(false) // set based on width
  const [pageWidth, setPageWidth] = useState(520)

  // flip animation state
  const [isFlipping, setIsFlipping] = useState(false)
  const [flipDir, setFlipDir] = useState<FlipDir>("next")
  const [pendingIndex, setPendingIndex] = useState<number | null>(null)

  useEffect(() => setIsClient(true), [])

  useEffect(() => {
    if (!open) return
    initializeWorker()
    setPageIndex(1)
    setLoading(true)
    setError(null)
    setNumPages(0)
  }, [open, pdfUrl])

  // Measure available width from container (not window) and decide 1 vs 2 pages
  useEffect(() => {
    if (!open) return
    const el = containerRef.current
    if (!el) return

    const measure = () => {
      const rect = el.getBoundingClientRect()
      const w = rect.width

      // Rule: 2-page only when there's enough space
      // Adjust threshold as you like:
      const twoPage = w >= 1100 // ~xl
      setIsTwoPage(twoPage)

      const padding = 48 // inner paddings / margins
      const maxSingle = 900
      const maxPerPageTwo = 650

      if (twoPage) {
        // two pages + spine gap
        const spineGap = 18
        const available = Math.max(320, w - padding - spineGap)
        const perPage = Math.min(maxPerPageTwo, Math.floor(available / 2))
        setPageWidth(perPage)
      } else {
        const available = Math.max(320, w - padding)
        setPageWidth(Math.min(maxSingle, available))
      }
    }

    measure()

    const ro = new ResizeObserver(() => measure())
    ro.observe(el)

    window.addEventListener("resize", measure)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [open])

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setLoading(false)
    setError(null)
  }

  const onDocumentLoadError = (err: Error) => {
    console.error("Error loading PDF:", err, pdfUrl)
    let msg = "Failed to load PDF document."
    if (err.message?.includes("CORS")) msg = "CORS error: PDF server blocks cross-origin requests."
    else if (err.message?.includes("404") || err.message?.includes("Not Found")) msg = "PDF file not found."
    else if (err.message?.includes("403") || err.message?.includes("Forbidden")) msg = "Access denied."
    else if (err.message?.toLowerCase().includes("fetch") || err.message?.toLowerCase().includes("network"))
      msg = "Network error while loading PDF."
    else msg = `Failed to load PDF: ${err.message || "Unknown error"}`
    setError(msg)
    setLoading(false)
  }

  // ---- Spread calculation ----
  // For two-page: we render spreadStart (odd) and spreadStart+1
  const spreadStart = useMemo(() => {
    if (!isTwoPage) return pageIndex
    return pageIndex % 2 === 0 ? pageIndex - 1 : pageIndex
  }, [pageIndex, isTwoPage])

  const leftPage = isTwoPage ? spreadStart : pageIndex
  const rightPage = isTwoPage ? spreadStart + 1 : null

  const canPrev = useMemo(() => {
    if (numPages <= 0) return false
    return pageIndex > 1
  }, [pageIndex, numPages])

  const canNext = useMemo(() => {
    if (numPages <= 0) return false
    if (!isTwoPage) return pageIndex < numPages
    // in spread mode, next jumps by 2
    return spreadStart + 2 <= numPages + 1 // allow last single
  }, [numPages, isTwoPage, pageIndex, spreadStart])

  // ---- Turn page (animated) ----
  const requestFlip = (dir: FlipDir) => {
    if (isFlipping) return
    if (dir === "next" && !canNext) return
    if (dir === "prev" && !canPrev) return

    let nextIndex = pageIndex
    if (!isTwoPage) {
      nextIndex = dir === "next" ? pageIndex + 1 : pageIndex - 1
    } else {
      // in spread mode, jump by 2 (but keep it aligned)
      const base = spreadStart
      nextIndex = dir === "next" ? base + 2 : Math.max(1, base - 2)
    }

    setFlipDir(dir)
    setPendingIndex(nextIndex)
    setIsFlipping(true)
  }

  const finishFlip = () => {
    setIsFlipping(false)
    if (pendingIndex != null) {
      // clamp
      const clamped = Math.max(1, Math.min(pendingIndex, numPages || pendingIndex))
      setPageIndex(clamped)
    }
    setPendingIndex(null)
  }

  // Keyboard
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") requestFlip("next")
      if (e.key === "ArrowLeft") requestFlip("prev")
      if (e.key === "Escape") onOpenChange(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pageIndex, isTwoPage, canNext, canPrev, spreadStart, isFlipping, pendingIndex])

  // After flip animation, commit page change
  const onFlipAnimationEnd = () => finishFlip()

  if (!isClient) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* IMPORTANT: removed overflow-hidden here to avoid cropping */}
      <DialogContent className="max-w-[96vw] w-full h-[96vh] p-0 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 dark:from-amber-950 dark:via-orange-950 dark:to-amber-900">
        <VisuallyHidden.Root>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Book reader for {title}. Use arrow keys or navigation buttons to turn pages.
          </DialogDescription>
        </VisuallyHidden.Root>

        {/* Header */}
        <div className="br-header">
          <div className="flex items-center gap-3 min-w-0">
            <BookOpen className="w-5 h-5 text-amber-100 shrink-0" />
            <h2 className="text-lg font-semibold text-amber-50 truncate">{title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-amber-100 px-3 py-1 bg-amber-900/50 rounded-full">
              Page {Math.min(pageIndex, numPages || pageIndex)} of {numPages}
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

        {/* Body */}
        <div ref={containerRef} className="br-body">
          <Document
            file={pdfUrl}
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
                    setLoading(true)
                    setError(null)
                    setPageIndex(1)
                    setNumPages(0)
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
              <div className="br-bookWrap">
                {/* Book (one-page or two-page) */}
                <div className={`br-book ${isTwoPage ? "two" : "one"}`}>
                  {/* LEFT (or single) page */}
                  <div className="br-page br-left" style={{ width: `${pageWidth}px` }}>
                    <div className="br-pageInner">
                      <Page
                        key={`p-${leftPage}-${pageWidth}`}
                        pageNumber={leftPage}
                        width={pageWidth}
                        renderTextLayer={!isFlipping}
                        renderAnnotationLayer={!isFlipping}
                        loading={
                          <div className="flex items-center justify-center h-[60vh]">
                            <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        }
                      />
                    </div>
                    <div className="br-shadow-left" />
                  </div>

                  {/* Spine for two-page */}
                  {isTwoPage && <div className="br-spine" />}

                  {/* RIGHT page (two-page only) */}
                  {isTwoPage && rightPage && rightPage <= numPages && (
                    <div className="br-page br-right" style={{ width: `${pageWidth}px` }}>
                      <div className="br-pageInner">
                        <Page
                          key={`p-${rightPage}-${pageWidth}`}
                          pageNumber={rightPage}
                          width={pageWidth}
                          renderTextLayer={!isFlipping}
                          renderAnnotationLayer={!isFlipping}
                          loading={
                            <div className="flex items-center justify-center h-[60vh]">
                              <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          }
                        />
                      </div>
                      <div className="br-shadow-right" />
                    </div>
                  )}

                  {/* FLIP LAYER (animated sheet) */}
                  {/* We overlay a “sheet” that flips, then we commit pageIndex on animation end */}
                  {isTwoPage ? (
                    <div
                      className={`br-flipSheet ${isFlipping ? `flip-${flipDir}` : ""}`}
                      style={{
                        width: `${pageWidth}px`,
                        // When going next, sheet starts on the RIGHT and flips left.
                        // When going prev, sheet starts on the LEFT and flips right.
                        left: flipDir === "next" ? `${pageWidth + 18}px` : `0px`,
                        transformOrigin: flipDir === "next" ? "left center" : "right center",
                      }}
                      onAnimationEnd={onFlipAnimationEnd}
                      aria-hidden
                    >
                      <div className="br-flipFront">
                        {/* show the page that is being turned */}
                        <div className="br-pageInner">
                          <Page
                            key={`flip-front-${flipDir}-${isFlipping}-${pageWidth}-${spreadStart}`}
                            pageNumber={flipDir === "next" ? Math.min(spreadStart + 1, numPages) : spreadStart}
                            width={pageWidth}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                          />
                        </div>
                      </div>
                      <div className="br-flipBack">
                        {/* show the next/prev page on the back for realism */}
                        <div className="br-pageInner">
                          <Page
                            key={`flip-back-${flipDir}-${isFlipping}-${pageWidth}-${spreadStart}`}
                            pageNumber={
                              flipDir === "next"
                                ? Math.min(spreadStart + 2, numPages)
                                : Math.max(1, spreadStart - 1)
                            }
                            width={pageWidth}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Single-page: flip sheet covers the whole page
                    <div
                      className={`br-flipSheet single ${isFlipping ? `flip-${flipDir}` : ""}`}
                      style={{
                        width: `${pageWidth}px`,
                        left: 0,
                        transformOrigin: flipDir === "next" ? "left center" : "right center",
                      }}
                      onAnimationEnd={onFlipAnimationEnd}
                      aria-hidden
                    >
                      <div className="br-flipFront">
                        <div className="br-pageInner">
                          <Page
                            key={`flip-front-single-${flipDir}-${isFlipping}-${pageWidth}-${pageIndex}`}
                            pageNumber={pageIndex}
                            width={pageWidth}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                          />
                        </div>
                      </div>
                      <div className="br-flipBack">
                        <div className="br-pageInner">
                          <Page
                            key={`flip-back-single-${flipDir}-${isFlipping}-${pageWidth}-${pageIndex}`}
                            pageNumber={flipDir === "next" ? Math.min(pageIndex + 1, numPages) : Math.max(1, pageIndex - 1)}
                            width={pageWidth}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Document>
        </div>

        {/* Footer controls */}
        {!loading && !error && numPages > 0 && (
          <div className="br-footer">
            <div className="flex items-center justify-between max-w-4xl mx-auto w-full">
              <Button
                onClick={() => requestFlip("prev")}
                disabled={!canPrev || isFlipping}
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
                  value={Math.min(pageIndex, numPages)}
                  onChange={(e) => {
                    const v = parseInt(e.target.value)
                    if (!Number.isFinite(v)) return
                    const clamped = Math.max(1, Math.min(v, numPages))
                    setPageIndex(clamped)
                  }}
                  className="w-20 px-3 py-2 text-center bg-amber-900/50 border border-amber-700 rounded-lg text-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-amber-100">/ {numPages}</span>
              </div>

              <Button
                onClick={() => requestFlip("next")}
                disabled={!canNext || isFlipping}
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
