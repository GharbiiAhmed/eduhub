"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

interface DownloadButtonProps {
  pdfUrl: string
  title: string
}

export function DownloadButton({ pdfUrl, title }: DownloadButtonProps) {
  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = pdfUrl
    link.download = `${title}.pdf`
    link.click()
  }

  return (
    <Button 
      size="sm" 
      variant="outline"
      onClick={handleDownload}
    >
      <Download className="w-4 h-4" />
    </Button>
  )
}

