"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Eye, MessageSquare, MoreHorizontal, User, Mail } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

interface StudentActionsProps {
  studentId: string
  studentEmail: string
  courseId: string
  studentName?: string
  courseTitle?: string
  progress?: number
}

export function StudentActions({ 
  studentId, 
  studentEmail, 
  courseId,
  studentName,
  courseTitle,
  progress
}: StudentActionsProps) {
  const router = useRouter()
  const [showDetails, setShowDetails] = useState(false)
  const [studentDetails, setStudentDetails] = useState<any>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  const handleViewDetails = async () => {
    setShowDetails(true)
    setLoadingDetails(true)
    
    try {
      const supabase = createClient()
      
      // Fetch student profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, email, created_at")
        .eq("id", studentId)
        .single()

      // Fetch enrollment details
      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("*")
        .eq("student_id", studentId)
        .eq("course_id", courseId)
        .single()

      // Fetch course details
      const { data: course } = await supabase
        .from("courses")
        .select("id, title")
        .eq("id", courseId)
        .single()

      // Fetch lesson progress (using same logic as update-progress API)
      const { data: modules } = await supabase
        .from("modules")
        .select("id")
        .eq("course_id", courseId)

      if (!modules || modules.length === 0) {
        setStudentDetails({
          profile,
          enrollment,
          course,
          lessonProgress: [],
          totalLessons: 0,
          completedLessons: 0
        })
        return
      }

      const moduleIds = modules.map(m => m.id)
      
      const { data: lessons } = await supabase
        .from("lessons")
        .select("id")
        .in("module_id", moduleIds)

      if (!lessons || lessons.length === 0) {
        setStudentDetails({
          profile,
          enrollment,
          course,
          lessonProgress: [],
          totalLessons: 0,
          completedLessons: 0
        })
        return
      }

      const lessonIds = lessons.map(l => l.id)
      
      // Use API endpoint to fetch student progress (bypasses RLS)
      let completedCount = 0
      let queryError = null
      
      try {
        const response = await fetch(`/api/instructor/student-progress?studentId=${studentId}&courseId=${courseId}`)
        if (response.ok) {
          const progressData = await response.json()
          completedCount = progressData.completedLessons || 0
        } else {
          const errorData = await response.json()
          queryError = errorData.error || 'Failed to fetch progress'
          console.error('Error fetching student progress:', errorData)
          
          // Fallback: if stored progress is 100% and we have lessons, assume all are completed
          if (enrollment?.progress_percentage === 100 && lessonIds.length > 0) {
            completedCount = lessonIds.length
          }
        }
      } catch (error: any) {
        console.error('Error calling progress API:', error)
        queryError = error.message || 'Failed to fetch progress'
        
        // Fallback: if stored progress is 100% and we have lessons, assume all are completed
        if (enrollment?.progress_percentage === 100 && lessonIds.length > 0) {
          completedCount = lessonIds.length
        }
      }

      const totalCount = lessonIds.length

      // Recalculate progress to match API logic
      const calculatedProgress = totalCount > 0 
        ? Math.round((completedCount / totalCount) * 100)
        : 0

      setStudentDetails({
        profile,
        enrollment,
        course,
        lessonProgress: [],
        totalLessons: totalCount,
        completedLessons: completedCount,
        calculatedProgress, // Show calculated progress vs stored progress
        storedProgress: enrollment?.progress_percentage || 0,
        queryError
      })
    } catch (error) {
      console.error('Error fetching student details:', error)
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleSendMessage = () => {
    // Navigate to messages page - the page will handle finding or creating the conversation
    router.push(`/instructor/messages`)
    // Note: We could add query params, but the messages page doesn't currently support pre-selecting
    // For now, just navigate to messages and let the instructor find the student manually
  }

  return (
    <>
      <div className="flex items-center justify-end space-x-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleViewDetails}
          title="View student details"
        >
          <Eye className="w-4 h-4" />
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleSendMessage}
          title="Send message"
        >
          <MessageSquare className="w-4 h-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" title="More options">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleViewDetails}>
              <User className="w-4 h-4 mr-2" />
              View Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSendMessage}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Send Message
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => window.location.href = `mailto:${studentEmail}`}
            >
              <Mail className="w-4 h-4 mr-2" />
              Send Email
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Student Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
            <DialogDescription>
              View detailed information about this student's progress
            </DialogDescription>
          </DialogHeader>
          
          {loadingDetails ? (
            <div className="py-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="mt-2 text-sm text-gray-600">Loading student details...</p>
            </div>
          ) : studentDetails ? (
            <div className="space-y-6">
              {/* Student Info */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Student Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium">{studentDetails.profile?.full_name || 'No name'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{studentDetails.profile?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Joined</p>
                    <p className="font-medium">
                      {studentDetails.profile?.created_at 
                        ? new Date(studentDetails.profile.created_at).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Course Progress */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Course Progress</h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Course</p>
                    <p className="font-medium">{studentDetails.course?.title || courseTitle || 'Unknown Course'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Progress</p>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${studentDetails.calculatedProgress ?? studentDetails.storedProgress ?? progress ?? 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">
                        {studentDetails.calculatedProgress ?? studentDetails.storedProgress ?? progress ?? 0}%
                      </span>
                    </div>
                    {studentDetails.calculatedProgress !== undefined && studentDetails.storedProgress !== undefined && 
                     studentDetails.calculatedProgress !== studentDetails.storedProgress && (
                      <p className="text-xs text-amber-600 mt-1">
                        ⚠️ Mismatch: Calculated {studentDetails.calculatedProgress}% vs Stored {studentDetails.storedProgress}%
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Completed Lessons</p>
                      <p className="font-medium">
                        {studentDetails.completedLessons} / {studentDetails.totalLessons}
                      </p>
                      {studentDetails.totalLessons > 0 && studentDetails.completedLessons === 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          ⚠️ No completed lessons found in database
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Enrolled</p>
                      <p className="font-medium">
                        {studentDetails.enrollment?.created_at
                          ? new Date(studentDetails.enrollment.created_at).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2 pt-4 border-t">
                <Button onClick={handleSendMessage} className="flex-1">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = `mailto:${studentEmail}`}
                  className="flex-1"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Email
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-600">Failed to load student details</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

