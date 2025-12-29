"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Eye } from "lucide-react"
import { PDFViewerModal } from "./pdf-viewer"

interface BookPDFViewerProps {
  pdfUrl: string
  title: string
}

export function BookPDFViewer({ pdfUrl, title }: BookPDFViewerProps) {
  const [isViewerOpen, setIsViewerOpen] = useState(false)

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = pdfUrl
    link.download = `${title}.pdf`
    link.click()
  }

  return (
    <>
      <div className="space-y-3">
        <Button 
          className="w-full bg-gradient-to-r from-primary to-secondary hover:shadow-lg hover:shadow-primary/30 text-primary-foreground"
          onClick={() => setIsViewerOpen(true)}
        >
          <Eye className="w-4 h-4 mr-2" />
          Read PDF Online
        </Button>
        
        <Button 
          className="w-full" 
          variant="outline"
          onClick={handleDownload}
        >
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
      </div>

      <PDFViewerModal
        pdfUrl={pdfUrl}
        title={title}
        open={isViewerOpen}
        onOpenChange={setIsViewerOpen}
      />
    </>
  )
}






