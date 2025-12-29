"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { BookOpen } from "lucide-react"
import { BookReader } from "./book-reader"

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

      <BookReader
        pdfUrl={pdfUrl}
        title={title}
        open={isViewerOpen}
        onOpenChange={setIsViewerOpen}
      />
    </>
  )
}







