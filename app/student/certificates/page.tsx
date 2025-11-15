"use client"

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Award, 
  Download, 
  Calendar, 
  Clock, 
  BookOpen, 
  Star,
  CheckCircle,
  Eye,
  Share2,
  FileText,
  X
} from "lucide-react"
import Link from "next/link"

interface Certificate {
  id: string
  course_id: string
  course_title: string
  student_name: string
  completion_date: string
  certificate_url: string
  verification_code: string
  grade: string
  hours_completed: number
}

export default function StudentCertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [verificationCode, setVerificationCode] = useState('')
  const [verificationResult, setVerificationResult] = useState<{ valid: boolean; certificate?: any; error?: string } | null>(null)
  const [viewingCertificate, setViewingCertificate] = useState<Certificate | null>(null)
  const [shareMessage, setShareMessage] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchCertificates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchCertificates = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('Error getting user:', userError)
        throw userError
      }
      
      if (!user) {
        console.log('No user found')
        setLoading(false)
        return
      }

      // Get user profile for name
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single()

      if (profileError) {
        console.warn('Error fetching profile:', profileError)
        // Continue even if profile fetch fails
      }

      // Get all certificates for the student
      // Note: duration field doesn't exist in courses table, so we'll calculate it from modules/lessons if needed
      const { data: certificatesData, error: certificatesError } = await supabase
        .from("certificates")
        .select(`
          id,
          course_id,
          certificate_number,
          issued_at,
          courses!inner(
            id,
            title,
            description
          )
        `)
        .eq("student_id", user.id)
        .order("issued_at", { ascending: false })

      if (certificatesError) {
        console.error('Error fetching certificates:', certificatesError)
        throw certificatesError
      }

      // Check for completed courses without certificates and generate them
      const { data: completedEnrollments } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("student_id", user.id)
        .eq("progress_percentage", 100)

      if (completedEnrollments && completedEnrollments.length > 0) {
        const completedCourseIds = completedEnrollments.map(e => e.course_id)
        const existingCertificateCourseIds = (certificatesData || []).map(c => c.course_id)
        
        // Find courses that are completed but don't have certificates
        const coursesNeedingCertificates = completedCourseIds.filter(
          courseId => !existingCertificateCourseIds.includes(courseId)
        )

        // Generate certificates for completed courses that don't have them
        // Use API endpoint to ensure proper validation and error handling
        if (coursesNeedingCertificates.length > 0) {
          console.log(`Generating certificates for ${coursesNeedingCertificates.length} completed course(s)...`)
          
          for (const courseId of coursesNeedingCertificates) {
            try {
              const response = await fetch('/api/generate-certificate', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ courseId }),
              })

              const result = await response.json()

              if (!response.ok) {
                console.error(`Error generating certificate for course ${courseId}:`, result.error || result)
                continue
              }

              if (result.certificate) {
                console.log(`✅ Certificate generated for course ${courseId}:`, result.certificate.certificate_number)
                // Fetch the course details for the new certificate
                const { data: course } = await supabase
                  .from("courses")
                  .select("id, title, description")
                  .eq("id", courseId)
                  .single()
                
                if (certificatesData && course) {
                  certificatesData.push({
                    id: result.certificate.id,
                    course_id: courseId,
                    certificate_number: result.certificate.certificate_number,
                    issued_at: result.certificate.issued_at,
                    courses: course
                  })
                }
              }
            } catch (error) {
              console.error(`Error generating certificate for course ${courseId}:`, error)
            }
          }
        }
      }

      if (!certificatesData || certificatesData.length === 0) {
        setCertificates([])
        setLoading(false)
        return
      }

      // Format certificates
      const formattedCertificates: Certificate[] = await Promise.all(
        certificatesData.map(async (cert) => {
          const course = cert.courses as any
          
          // Calculate hours from modules/lessons if needed
          let hoursCompleted = 0
          try {
            // Get modules count as a proxy for course duration
            const { count: modulesCount } = await supabase
              .from("modules")
              .select("*", { count: "exact", head: true })
              .eq("course_id", cert.course_id)
            
            // Estimate hours (rough estimate: 1-2 hours per module)
            hoursCompleted = (modulesCount || 0) * 1.5
          } catch (error) {
            console.warn(`Error calculating hours for course ${cert.course_id}:`, error)
            // Default to 0 if calculation fails
          }
          
          return {
            id: cert.id,
            course_id: cert.course_id,
            course_title: course?.title || 'Unknown Course',
            student_name: profile?.full_name || user.email || 'Student',
            completion_date: cert.issued_at,
            certificate_url: `/certificates/${cert.certificate_number}.pdf`,
            verification_code: cert.certificate_number,
            grade: 'A', // Grade would need to come from quiz attempts or course completion criteria
            hours_completed: Math.round(hoursCompleted)
          }
        })
      )

      setCertificates(formattedCertificates)
    } catch (error) {
      console.error('Error fetching certificates:', error)
      // Set empty array on error so UI shows "no certificates" instead of crashing
      setCertificates([])
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadCertificate = (certificate: Certificate) => {
    // Open certificate page with print parameter to auto-trigger print dialog
    const certificateUrl = `/certificates/${certificate.verification_code}?print=true`
    window.open(certificateUrl, '_blank')
  }

  const handleShareCertificate = async (certificate: Certificate) => {
    const shareText = `🎓 I completed the "${certificate.course_title}" course on EduHub!\n\nVerification Code: ${certificate.verification_code}\n\nVerify at: ${window.location.origin}/student/certificates`
    
    // Check if Web Share API is available (mobile devices, some desktop browsers)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Certificate: ${certificate.course_title}`,
          text: shareText,
          url: window.location.href
        })
        setShareMessage('Certificate shared successfully!')
        setTimeout(() => setShareMessage(null), 3000)
        return // Successfully shared, exit early
      } catch (error: any) {
        // User cancelled or error occurred
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error)
          // Fall through to clipboard fallback
        } else {
          // User cancelled, don't show message
          return
        }
      }
    }
    
    // Fallback: copy to clipboard (for browsers without Web Share API)
    try {
      await navigator.clipboard.writeText(shareText)
      setShareMessage('Certificate details copied to clipboard!')
      setTimeout(() => setShareMessage(null), 3000)
    } catch (error) {
      console.error('Error copying to clipboard:', error)
      setShareMessage('Failed to share. Please copy manually.')
      setTimeout(() => setShareMessage(null), 3000)
    }
  }

  const handleVerifyCertificate = async () => {
    if (!verificationCode.trim()) {
      setVerificationResult({ valid: false, error: 'Please enter a verification code' })
      return
    }

    try {
      const { data: certificate, error } = await supabase
        .from("certificates")
        .select(`
          id,
          certificate_number,
          issued_at,
          student_id,
          course_id,
          courses!inner(
            id,
            title,
            description
          )
        `)
        .eq("certificate_number", verificationCode.trim())
        .single()

      if (error || !certificate) {
        setVerificationResult({ valid: false, error: 'Certificate not found. Please check the verification code.' })
        return
      }

      // Get student profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", certificate.student_id)
        .single()

      setVerificationResult({ 
        valid: true, 
        certificate: {
          ...certificate,
          course_title: (certificate.courses as any)?.title,
          student_name: profile?.full_name || profile?.email || 'Student'
        }
      })
    } catch (error) {
      console.error('Error verifying certificate:', error)
      setVerificationResult({ valid: false, error: 'Error verifying certificate. Please try again.' })
    }
  }

  const handleViewCertificate = (certificate: Certificate) => {
    setViewingCertificate(certificate)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Certificates</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            View and download your course completion certificates
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <Award className="w-3 h-3 mr-1" />
            {certificates.length} Certificates
          </Badge>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Certificates</CardTitle>
            <Award className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{certificates.length}</div>
            <p className="text-xs text-muted-foreground">
              Course completions
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {certificates.reduce((sum, cert) => sum + cert.hours_completed, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Learning hours completed
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
            <Star className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">A+</div>
            <p className="text-xs text-muted-foreground">
              Excellent performance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Certificates Grid */}
      {certificates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Certificates Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Complete courses to earn certificates
            </p>
            <Button asChild>
              <Link href="/courses">
                Browse Courses
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificates.map((certificate) => (
            <Card key={certificate.id} className="group hover:shadow-xl transition-all duration-300 hover:scale-105">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2 mb-2">
                      {certificate.course_title}
                    </CardTitle>
                    <CardDescription className="flex items-center space-x-2 text-sm">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Completed {new Date(certificate.completion_date).toLocaleDateString()}
                      </span>
                    </CardDescription>
                  </div>
                  <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    {certificate.grade}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Certificate Details */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Verification Code:</span>
                      <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        {certificate.verification_code}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Hours Completed:</span>
                      <span className="font-semibold">{certificate.hours_completed}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Grade:</span>
                      <span className="font-semibold text-green-600">{certificate.grade}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleDownloadCertificate(certificate)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleShareCertificate(certificate)}
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewCertificate(certificate)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Verification Info */}
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center space-x-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                      <span className="text-blue-800 dark:text-blue-200">
                        Verified Certificate
                      </span>
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      This certificate can be verified using the verification code
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Certificate Verification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2 text-blue-600" />
            Certificate Verification
          </CardTitle>
          <CardDescription>
            Verify the authenticity of any certificate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              All certificates issued by EduHub include a unique verification code. 
              You can verify any certificate by entering its verification code below.
            </p>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Enter verification code..."
                value={verificationCode}
                onChange={(e) => {
                  setVerificationCode(e.target.value)
                  setVerificationResult(null)
                }}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <Button variant="outline" onClick={handleVerifyCertificate}>
                Verify
              </Button>
            </div>
            {verificationResult && (
              <div className={`mt-4 p-4 rounded-lg ${
                verificationResult.valid 
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}>
                {verificationResult.valid ? (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-green-800 dark:text-green-200">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-semibold">Certificate Verified</span>
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
                      <p><strong>Course:</strong> {verificationResult.certificate?.course_title}</p>
                      <p><strong>Student:</strong> {verificationResult.certificate?.student_name}</p>
                      <p><strong>Issued:</strong> {new Date(verificationResult.certificate?.issued_at).toLocaleDateString()}</p>
                      <p><strong>Verification Code:</strong> <code className="bg-green-100 dark:bg-green-900 px-2 py-1 rounded">{verificationResult.certificate?.certificate_number}</code></p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-red-800 dark:text-red-200">
                    <span className="font-semibold">Verification Failed</span>
                    {verificationResult.error && (
                      <span className="text-sm">{verificationResult.error}</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Share Success Message */}
      {shareMessage && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2">
          <CheckCircle className="w-5 h-5" />
          <span>{shareMessage}</span>
        </div>
      )}

      {/* View Certificate Modal */}
      {viewingCertificate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewingCertificate(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Certificate of Completion</h2>
                <Button variant="ghost" size="sm" onClick={() => setViewingCertificate(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="border-4 border-blue-600 rounded-lg p-8 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                <div className="text-center space-y-4">
                  <div className="flex justify-center mb-4">
                    <Award className="w-16 h-16 text-blue-600" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white">Certificate of Completion</h3>
                  <p className="text-lg text-gray-700 dark:text-gray-300">This is to certify that</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{viewingCertificate.student_name}</p>
                  <p className="text-lg text-gray-700 dark:text-gray-300">has successfully completed the course</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{viewingCertificate.course_title}</p>
                  <div className="mt-6 pt-6 border-t border-gray-300 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Issued on {new Date(viewingCertificate.completion_date).toLocaleDateString()}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Verification Code: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{viewingCertificate.verification_code}</code></p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex space-x-2">
                <Button className="flex-1" onClick={() => handleDownloadCertificate(viewingCertificate)}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => handleShareCertificate(viewingCertificate)}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


