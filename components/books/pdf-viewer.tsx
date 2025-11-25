"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, X, Maximize2, Minimize2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface PDFViewerProps {
  pdfUrl: string
  title: string
  onClose?: () => void
}

export function PDFViewer({ pdfUrl, title, onClose }: PDFViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = pdfUrl
    link.download = `${title}.pdf`
    link.click()
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const pdfViewer = (
    <div className="relative w-full h-full bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden">
      <div className="absolute top-0 left-0 right-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-xs">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="h-8 w-8 p-0"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="h-8 w-8 p-0"
          >
            <Download className="h-4 w-4" />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <iframe
        src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
        className="w-full h-full border-0"
        style={{ height: isFullscreen ? '100vh' : 'calc(100% - 50px)', marginTop: '50px' }}
        title={title}
      />
    </div>
  )

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        {pdfViewer}
      </div>
    )
  }

  return (
    <Card className="w-full">
      <CardContent className="p-0">
        <div className="h-[600px]">
          {pdfViewer}
        </div>
      </CardContent>
    </Card>
  )
}

interface PDFViewerModalProps {
  pdfUrl: string
  title: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PDFViewerModal({ pdfUrl, title, open, onOpenChange }: PDFViewerModalProps) {
  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = pdfUrl
    link.download = `${title}.pdf`
    link.click()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-full h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle>{title}</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <iframe
            src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
            className="w-full h-full border-0"
            title={title}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

