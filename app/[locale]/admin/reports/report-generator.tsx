"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Download, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useTranslations } from 'next-intl'

export function ReportGenerator() {
  const t = useTranslations('profile')
  const [reportType, setReportType] = useState("summary")
  const [dateRange, setDateRange] = useState("all-time")
  const [format, setFormat] = useState<"pdf" | "csv" | "excel">("csv")
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    try {
      setIsGenerating(true)

      const response = await fetch("/api/admin/reports/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reportType,
          dateRange,
          format,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to generate report")
      }

      // Get the filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition")
      let filename = `report-${reportType}-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'csv' : format}`
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      // Get the blob data
      const blob = await response.blob()

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast({
        title: "Report generated",
        description: `Your ${reportType} report has been downloaded successfully.`,
      })
    } catch (error: any) {
      console.error("Generate error:", error)
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate report. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div>
        <label className="block text-sm font-medium mb-2">{t('reportType')}</label>
        <Select value={reportType} onValueChange={setReportType}>
          <SelectTrigger>
            <SelectValue placeholder={t('selectReportType')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="summary">{t('platformSummary')}</SelectItem>
            <SelectItem value="users">{t('userReport')}</SelectItem>
            <SelectItem value="courses">{t('courseReport')}</SelectItem>
            <SelectItem value="books">{t('bookReport')}</SelectItem>
            <SelectItem value="revenue">{t('revenueReport')}</SelectItem>
            <SelectItem value="enrollments">{t('enrollmentReport')}</SelectItem>
            <SelectItem value="activity">{t('activityReport')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">{t('dateRange')}</label>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger>
            <SelectValue placeholder={t('selectDateRange')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last-7-days">{t('last7Days')}</SelectItem>
            <SelectItem value="last-30-days">{t('last30Days')}</SelectItem>
            <SelectItem value="last-3-months">{t('last3Months')}</SelectItem>
            <SelectItem value="last-6-months">{t('last6Months')}</SelectItem>
            <SelectItem value="last-year">{t('lastYear')}</SelectItem>
            <SelectItem value="all-time">{t('allTime')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">{t('exportFormat')}</label>
        <Select value={format} onValueChange={(value) => setFormat(value as "pdf" | "csv" | "excel")}>
          <SelectTrigger>
            <SelectValue placeholder={t('selectFormat')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="csv">CSV</SelectItem>
            <SelectItem value="excel">Excel</SelectItem>
            <SelectItem value="pdf">{t('pdfJson')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-end">
        <Button 
          onClick={handleGenerate} 
          disabled={isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t('generating')}
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              {t('generateReport')}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

