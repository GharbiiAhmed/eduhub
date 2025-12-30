"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ChevronLeft, ChevronRight, X, BookOpen } from "lucide-react"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"
import "./book-reader.css"

/* ================= PDF WORKER ================= */

let workerInitialized = false
const initializeWorker = () => {
  if (typeof window === "undefined" || workerInitialized) return
  pdfjs.GlobalWorkerOptions.workerSrc =
    "https://unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs"
  workerInitialized = true
}

/* ================= TYPES ================= */

interface BookReaderProps {
  pdfUrl: string
  title: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

type FlipDir = "next" | "prev"

/* ================= COMPONENT ================= */

export function BookReader({ pdfUrl, title, open, onOpenChange }: BookReaderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  const [numPages, setNumPages] = useState(0)
  const [pageIndex, setPageIndex] = useState(1)
  const [pageWidth, setPageWidth] = useState(520)

  const [isTwoPage, setIsTwoPage] = useState(false)
  const [isFlipping, setIsFlipping] = useState(false)
  const [flipDir, setFlipDir] = useState<FlipDir>("next")
  const [pendingIndex, setPendingIndex] = useState<number | null>(null)

  /* ---------- INIT ---------- */

  useEffect(() => {
    if (!open) return
    initializeWorker()
    setPageIndex(1)
    setNumPages(0)
  }, [open, pdfUrl])

  /* ---------- RESPONSIVE ---------- */

  useEffect(() => {
    if (!open) return
    const el = containerRef.current
    if (!el) return

    const measure = () => {
      const w = el.getBoundingClientRect().width
      const two = w >= 1100
      setIsTwoPage(two)

      if (two) {
        setPageWidth(Math.min(650, Math.floor((w - 80) / 2)))
      } else {
        setPageWidth(Math.min(900, w - 48))
      }
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [open])

  /* ---------- PAGE CALC ---------- */

  const spreadStart = useMemo(() => {
    if (!isTwoPage) return pageIndex
    return pageIndex % 2 === 0 ? pageIndex - 1 : pageIndex
  }, [pageIndex, isTwoPage])

  const leftPage = isTwoPage ? spreadStart : pageIndex
  const rightPage = isTwoPage ? spreadStart + 1 : null

  const canPrev = pageIndex > 1
  const canNext = isTwoPage
    ? spreadStart + 2 <= numPages + 1
    : pageIndex < numPages

  /* ---------- FLIP ---------- */

  const requestFlip = (dir: FlipDir) => {
    if (isFlipping) return
    if (dir === "next" && !canNext) return
    if (dir === "prev" && !canPrev) return

    const next =
      isTwoPage
        ? dir === "next"
          ? spreadStart + 2
          : Math.max(1, spreadStart - 2)
        : dir === "next"
        ? pageIndex + 1
        : pageIndex - 1

    setFlipDir(dir)
    setPendingIndex(next)
    setIsFlipping(true)
  }

  const finishFlip = () => {
    setIsFlipping(false)
    if (pendingIndex !== null) {
      setPageIndex(Math.min(Math.max(1, pendingIndex), numPages))
    }
    setPendingIndex(null)
  }

  /* ---------- KEYBOARD ---------- */

  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") requestFlip("next")
      if (e.key === "ArrowLeft") requestFlip("prev")
      if (e.key === "Escape") onOpenChange(false)
    }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [open, pageIndex, isTwoPage, isFlipping])

  /* ================= RENDER ================= */

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[96vw] w-full h-[96vh] p-0">
        <VisuallyHidden.Root>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Book reader</DialogDescription>
        </VisuallyHidden.Root>

        {/* HEADER */}
        <div className="br-header">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-amber-100" />
            <h2 className="text-amber-50 font-semibold truncate">{title}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X />
          </Button>
        </div>

        {/* BODY */}
        <div ref={containerRef} className="br-body">
          <Document
            file={pdfUrl}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            options={{
              disableAutoFetch: true,
              disableStream: true,
              disableRange: true,
            }}
          >
            {numPages > 0 && (
              <div className="br-bookWrap">
                <div className={`br-book ${isTwoPage ? "two" : "one"}`}>
                  {/* LEFT */}
                  <div className="br-page" style={{ width: pageWidth }}>
                    <Page
                      pageNumber={leftPage}
                      width={pageWidth}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </div>

                  {isTwoPage && <div className="br-spine" />}

                  {/* RIGHT */}
                  {isTwoPage && rightPage && rightPage <= numPages && (
                    <div className="br-page" style={{ width: pageWidth }}>
                      <Page
                        pageNumber={rightPage}
                        width={pageWidth}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                      />
                    </div>
                  )}

                  {/* FLIP SHEET */}
                  <div
                    className={`br-flipSheet ${isFlipping ? `flip-${flipDir}` : ""}`}
                    style={{
                      width: pageWidth,
                      left: isTwoPage && flipDir === "next" ? pageWidth + 18 : 0,
                      transformOrigin:
                        flipDir === "next" ? "left center" : "right center",
                    }}
                    onAnimationEnd={finishFlip}
                  >
                    <div className="br-flipFront">
                      <Page
                        pageNumber={leftPage}
                        width={pageWidth}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                      />
                    </div>
                    <div className="br-flipBack">
                      <Page
                        pageNumber={
                          flipDir === "next"
                            ? Math.min(leftPage + 1, numPages)
                            : Math.max(1, leftPage - 1)
                        }
                        width={pageWidth}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Document>
        </div>

        {/* FOOTER */}
        <div className="br-footer">
          <Button onClick={() => requestFlip("prev")} disabled={!canPrev || isFlipping}>
            <ChevronLeft /> Prev
          </Button>
          <span>{pageIndex} / {numPages}</span>
          <Button onClick={() => requestFlip("next")} disabled={!canNext || isFlipping}>
            Next <ChevronRight />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
