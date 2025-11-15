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

export function ReportGenerator() {
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
        <label className="block text-sm font-medium mb-2">Report Type</label>
        <Select value={reportType} onValueChange={setReportType}>
          <SelectTrigger>
            <SelectValue placeholder="Select report type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="summary">Platform Summary</SelectItem>
            <SelectItem value="users">User Report</SelectItem>
            <SelectItem value="courses">Course Report</SelectItem>
            <SelectItem value="books">Book Report</SelectItem>
            <SelectItem value="revenue">Revenue Report</SelectItem>
            <SelectItem value="enrollments">Enrollment Report</SelectItem>
            <SelectItem value="activity">Activity Report</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Date Range</label>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger>
            <SelectValue placeholder="Select date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last-7-days">Last 7 Days</SelectItem>
            <SelectItem value="last-30-days">Last 30 Days</SelectItem>
            <SelectItem value="last-3-months">Last 3 Months</SelectItem>
            <SelectItem value="last-6-months">Last 6 Months</SelectItem>
            <SelectItem value="last-year">Last Year</SelectItem>
            <SelectItem value="all-time">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Export Format</label>
        <Select value={format} onValueChange={(value) => setFormat(value as "pdf" | "csv" | "excel")}>
          <SelectTrigger>
            <SelectValue placeholder="Select format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="csv">CSV</SelectItem>
            <SelectItem value="excel">Excel</SelectItem>
            <SelectItem value="pdf">PDF (JSON)</SelectItem>
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
              Generating...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Generate Report
            </>
          )}
        </Button>
      </div>
    </div>
  )
}


