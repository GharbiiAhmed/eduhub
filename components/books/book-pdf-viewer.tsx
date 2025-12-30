"use client"

import { useState, lazy, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { BookOpen } from "lucide-react"

// Dynamically import BookReader to avoid SSR issues with PDF.js
const BookReader = lazy(() => 
  import("./book-reader").then(module => ({ 
    default: module.BookReader 
  }))
)

interface BookPDFViewerProps {
  pdfUrl: string
  title: string
}

export function BookPDFViewer({ pdfUrl, title }: BookPDFViewerProps) {
  const [isViewerOpen, setIsViewerOpen] = useState(false)

  return (
    <>
        <Button 
          className="w-full bg-gradient-to-r from-primary to-secondary hover:shadow-lg hover:shadow-primary/30 text-primary-foreground"
          onClick={() => setIsViewerOpen(true)}
        >
        <BookOpen className="w-4 h-4 mr-2" />
        Read Book Online
        </Button>
        
      {isViewerOpen && (
        <Suspense fallback={
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="text-white">Loading book reader...</div>
      </div>
        }>
          <BookReader
        pdfUrl={pdfUrl}
        title={title}
        open={isViewerOpen}
        onOpenChange={setIsViewerOpen}
      />
        </Suspense>
      )}
    </>
  )
}







