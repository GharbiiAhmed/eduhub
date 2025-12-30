"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
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

type RenderFlags = {
  left: boolean
  right: boolean
}

/* ================= COMPONENT ================= */

export function BookReader({ pdfUrl, title, open, onOpenChange }: BookReaderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  const [numPages, setNumPages] = useState(0)

  // "Displayed" pages (what user sees)
  const [displayIndex, setDisplayIndex] = useState(1)

  // Next requested page (render in background, then swap)
  const [targetIndex, setTargetIndex] = useState<number | null>(null)

  const [pageWidth, setPageWidth] = useState(520)
  const [isTwoPage, setIsTwoPage] = useState(false)

  // Flip animation
  const [isFlipping, setIsFlipping] = useState(false)
  const [flipDir, setFlipDir] = useState<FlipDir>("next")

  // When we are waiting for hidden pages to finish rendering
  const [isPreloading, setIsPreloading] = useState(false)
  const [renderedTarget, setRenderedTarget] = useState<RenderFlags>({ left: false, right: false })

  /* ---------- INIT ---------- */

  useEffect(() => {
    if (!open) return
    initializeWorker()
    setDisplayIndex(1)
    setTargetIndex(null)
    setIsFlipping(false)
    setIsPreloading(false)
    setRenderedTarget({ left: false, right: false })
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

      if (two) setPageWidth(Math.min(650, Math.floor((w - 80) / 2)))
      else setPageWidth(Math.min(900, w - 48))
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [open])

  /* ---------- PAGE CALC HELPERS ---------- */

  const calcSpreadStart = (idx: number) => {
    if (!isTwoPage) return idx
    return idx % 2 === 0 ? idx - 1 : idx
  }

  const displaySpreadStart = useMemo(() => calcSpreadStart(displayIndex), [displayIndex, isTwoPage])
  const displayLeft = isTwoPage ? displaySpreadStart : displayIndex
  const displayRight = isTwoPage ? displaySpreadStart + 1 : null

  const targetSpreadStart = useMemo(() => (targetIndex ? calcSpreadStart(targetIndex) : null), [targetIndex, isTwoPage])
  const targetLeft = targetSpreadStart ? (isTwoPage ? targetSpreadStart : targetIndex!) : null
  const targetRight = targetSpreadStart && isTwoPage ? targetSpreadStart + 1 : null

  const canPrev = displayIndex > 1
  const canNext = isTwoPage ? displaySpreadStart + 2 <= numPages + 1 : displayIndex < numPages

  /* ---------- REQUEST FLIP ---------- */

  const requestFlip = (dir: FlipDir) => {
    if (isFlipping || isPreloading) return
    if (dir === "next" && !canNext) return
    if (dir === "prev" && !canPrev) return

    const next =
      isTwoPage
        ? dir === "next"
          ? displaySpreadStart + 2
          : Math.max(1, displaySpreadStart - 2)
        : dir === "next"
        ? displayIndex + 1
        : displayIndex - 1

    setFlipDir(dir)
    setTargetIndex(next)
    setRenderedTarget({ left: false, right: false })
    setIsFlipping(true)
  }

  /* ---------- AFTER FLIP ANIMATION ENDS ---------- */
  // We do NOT swap to target immediately.
  // We start preloading hidden pages, show a paper overlay (not white),
  // then swap instantly when the hidden pages are rendered.
  const onFlipAnimationEnd = () => {
    // animation finished, now preload
    setIsFlipping(false)
    setIsPreloading(true)
  }

  /* ---------- WHEN HIDDEN TARGET PAGES ARE READY, SWAP ---------- */

  useEffect(() => {
    if (!isPreloading) return
    if (!targetIndex) return

    const needLeft = true
    const needRight = isTwoPage ? (targetRight !== null && targetRight <= numPages) : false

    if (!renderedTarget.left) return
    if (needRight && !renderedTarget.right) return

    // Swap instantly (no canvas white flash, because these are already rendered)
    requestAnimationFrame(() => {
      setDisplayIndex(targetIndex)
      setTargetIndex(null)
      setIsPreloading(false)
      setRenderedTarget({ left: false, right: false })
    })
  }, [isPreloading, targetIndex, renderedTarget, isTwoPage, targetRight, numPages])

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
  }, [open, displayIndex, isTwoPage, isFlipping, isPreloading, canNext, canPrev])

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
                <div className={`br-book ${isTwoPage ? "two" : "one"}`} style={{ position: "relative" }}>
                  {/* ========== VISIBLE PAGES (NEVER HIDDEN / NEVER FLASH) ========== */}
                  <div className="br-page" style={{ width: pageWidth }}>
                    <Page
                      pageNumber={displayLeft}
                      width={pageWidth}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </div>

                  {isTwoPage && <div className="br-spine" />}

                  {isTwoPage && displayRight && displayRight <= numPages && (
                    <div className="br-page" style={{ width: pageWidth }}>
                      <Page
                        pageNumber={displayRight}
                        width={pageWidth}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                      />
                    </div>
                  )}

                  {/* ========== FLIP SHEET OVERLAY ========== */}
                  {/* Flip uses CURRENT visible pages for realism */}
                  {(isFlipping || isPreloading) && (
                    <div
                      className={`br-flipSheet ${isFlipping ? `flip-${flipDir}` : ""}`}
                      style={{
                        width: pageWidth,
                        left: isTwoPage && flipDir === "next" ? pageWidth + 18 : 0,
                        transformOrigin: flipDir === "next" ? "left center" : "right center",
                      }}
                      onAnimationEnd={isFlipping ? onFlipAnimationEnd : undefined}
                      aria-hidden
                    >
                      <div className="br-flipFront">
                        <Page
                          pageNumber={displayLeft}
                          width={pageWidth}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                        />
                      </div>
                      <div className="br-flipBack">
                        <Page
                          pageNumber={
                            flipDir === "next"
                              ? Math.min(displayLeft + 1, numPages)
                              : Math.max(1, displayLeft - 1)
                          }
                          width={pageWidth}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                        />
                      </div>
                    </div>
                  )}

                  {/* ========== PAPER OVERLAY WHILE PRELOADING (HIDES WHITE CANVAS CLEAR) ========== */}
                  {isPreloading && <div className="br-paperOverlay" aria-hidden />}

                  {/* ========== HIDDEN PRELOAD PAGES (RENDER OFFSCREEN, THEN SWAP) ========== */}
                  {targetIndex !== null && (
                    <div
                      style={{
                        position: "absolute",
                        left: -100000,
                        top: 0,
                        width: 1,
                        height: 1,
                        overflow: "hidden",
                        opacity: 0,
                        pointerEvents: "none",
                      }}
                      aria-hidden
                    >
                      {/* preload left */}
                      <Page
                        pageNumber={targetLeft ?? 1}
                        width={pageWidth}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        onRenderSuccess={() => setRenderedTarget((p) => ({ ...p, left: true }))}
                      />

                      {/* preload right if needed */}
                      {isTwoPage && targetRight && targetRight <= numPages && (
                        <Page
                          pageNumber={targetRight}
                          width={pageWidth}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                          onRenderSuccess={() => setRenderedTarget((p) => ({ ...p, right: true }))}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </Document>
        </div>

        {/* FOOTER */}
        <div className="br-footer">
          <Button onClick={() => requestFlip("prev")} disabled={!canPrev || isFlipping || isPreloading}>
            <ChevronLeft /> Prev
          </Button>
          <span>
            {displayIndex} / {numPages}
          </span>
          <Button onClick={() => requestFlip("next")} disabled={!canNext || isFlipping || isPreloading}>
            Next <ChevronRight />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
