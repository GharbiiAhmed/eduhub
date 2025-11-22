import { createClient } from "@/lib/supabase/server"
import { redirect } from '@/i18n/routing'
import { Award } from "lucide-react"
import { PrintButton } from "@/components/print-button"
import { AutoPrint } from "@/components/auto-print"
import { getTranslations } from 'next-intl/server'

export default async function CertificatePage({
  params,
  searchParams
}: { 
  params: Promise<{ certificateNumber: string }>
  searchParams: Promise<{ print?: string }>
}) {
  const t = await getTranslations()
  const tCommon = await getTranslations('common')
  const { print } = await searchParams
  const { certificateNumber } = await params
  const supabase = await createClient()

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/auth/login")
  }

  // Get certificate with course and student info
  const { data: certificate, error } = await supabase
    .from("certificates")
    .select(`
      id,
      certificate_number,
      issued_at,
      student_id,
      courses!inner(
        id,
        title,
        description
      )
    `)
    .eq("certificate_number", certificateNumber)
    .single()

  if (error || !certificate) {
    redirect("/student/certificates")
  }

  // Verify the certificate belongs to the authenticated user
  if (certificate.student_id !== user.id) {
    redirect("/student/certificates")
  }

  // Get student profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single()

  const course = certificate.courses as any
  const studentName = profile?.full_name || profile?.email || "Student"

  return (
    <>
      {print === 'true' && <AutoPrint />}
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 sm:p-6 md:p-8 print:p-0">
      <div className="max-w-4xl mx-auto">
        {/* Certificate */}
        <div className="bg-white border-8 border-blue-600 rounded-lg shadow-2xl p-12 print:shadow-none print:border-8 print:rounded-lg">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Award className="w-20 h-20 text-blue-600" />
            </div>
            <h1 className="text-5xl font-bold text-gray-900 mb-2">Certificate of Completion</h1>
            <p className="text-xl text-gray-600">This is to certify that</p>
          </div>

          {/* Student Name */}
          <div className="text-center my-12">
            <p className="text-4xl font-bold text-blue-600 mb-4">{studentName}</p>
            <p className="text-xl text-gray-700">has successfully completed the course</p>
          </div>

          {/* Course Name */}
          <div className="text-center my-12">
            <p className="text-3xl font-bold text-gray-900 mb-8">{course?.title}</p>
          </div>

          {/* Details */}
          <div className="mt-12 pt-8 border-t-2 border-gray-300">
            <div className="grid grid-cols-2 gap-4 sm:gap-6 md:gap-8 text-center">
              <div>
                <p className="text-sm text-gray-600 mb-2">Issued On</p>
                <p className="font-semibold text-gray-900">
                  {new Date(certificate.issued_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Verification Code</p>
                <p className="font-mono text-sm font-semibold text-gray-900">
                  {certificate.certificate_number}
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 text-center text-sm text-gray-500">
            <p>This certificate can be verified at {process.env.NEXT_PUBLIC_SITE_URL || 'https://eduhub.com'}/student/certificates</p>
          </div>
        </div>

        {/* Print Button (hidden when printing) */}
        <div className="mt-8 text-center print:hidden">
          <PrintButton />
        </div>
      </div>
      </div>
    </>
  )
}

