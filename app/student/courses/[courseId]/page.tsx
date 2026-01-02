"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { RatingDisplay } from "@/components/course/rating-display"
import { CourseRatingSection } from "@/components/student/course-rating-section"
import BottomCurriculum from "@/components/student/bottom-curriculum"
import { 
  BookOpen, 
  Info, 
  Star, 
  Award,
  ArrowLeft,
  GraduationCap
} from "lucide-react"
import { cn } from "@/lib/utils"

type TabType = 'curriculum' | 'about' | 'reviews'

export default function StudentCourseDetailPage({
  params
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = use(params)
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('curriculum')
  const [course, setCourse] = useState<any>(null)
  const [modules, setModules] = useState<any[]>([])
  const [enrollment, setEnrollment] = useState<any>(null)
  const [certificate, setCertificate] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentModuleId, setCurrentModuleId] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }

      // Fetch course
      const { data: courseData } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single()

      // Fetch enrollment
      const { data: enrollmentData } = await supabase
        .from("enrollments")
        .select("*")
        .eq("student_id", user.id)
        .eq("course_id", courseId)
        .single()

      // Fetch modules
      const { data: modulesData } = await supabase
        .from("modules")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true })

      // Fetch certificate
      const { data: certificateData } = await supabase
        .from("certificates")
        .select("*")
        .eq("student_id", user.id)
        .eq("course_id", courseId)
        .single()

      setCourse(courseData)
      setEnrollment(enrollmentData)
      setModules(modulesData || [])
      setCertificate(certificateData || null)
      
      // Set first module as current
      if (modulesData && modulesData.length > 0) {
        setCurrentModuleId(modulesData[0].id)
      }

      setLoading(false)
    }

    fetchData()
  }, [courseId, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading course...</p>
        </div>
      </div>
    )
  }

  if (!course || !enrollment) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p className="text-lg font-medium">Course not found</p>
          <Button onClick={() => router.push("/student/courses")}>Go Back</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <GraduationCap className="h-3 w-3" />
                Course
              </Badge>
            </div>
            <h1 className="text-4xl font-bold tracking-tight">{course.title}</h1>
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Progress:</span>
                <div className="flex items-center gap-2 min-w-[200px]">
                  <Progress value={enrollment.progress_percentage} className="flex-1 h-2" />
                  <span className="text-sm font-medium min-w-[45px]">
                    {enrollment.progress_percentage}%
                  </span>
                </div>
              </div>
              {course.average_rating && course.average_rating > 0 && (
                <RatingDisplay
                  rating={course.average_rating}
                  totalRatings={course.total_ratings || 0}
                />
              )}
            </div>
          </div>
          <Button variant="outline" onClick={() => router.push("/student/courses")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('curriculum')}
          className={cn(
            "px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2",
            activeTab === 'curriculum' 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <BookOpen className="h-4 w-4" />
          Curriculum
        </button>
        <button
          onClick={() => setActiveTab('about')}
          className={cn(
            "px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2",
            activeTab === 'about' 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Info className="h-4 w-4" />
          About
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={cn(
            "px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2",
            activeTab === 'reviews' 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Star className="h-4 w-4" />
          Reviews
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'curriculum' && (
          <div className="space-y-4">
            {modules.length > 0 ? (
              <>
                <div className="space-y-3">
                  {modules.map((module) => (
                    <Card key={module.id} className="overflow-hidden">
                      <CardHeader 
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setCurrentModuleId(currentModuleId === module.id ? null : module.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CardTitle className="text-lg">
                              {module.order_index}. {module.title}
                            </CardTitle>
                            <Badge variant="outline" className="text-xs">
                              {module.order_index}
                            </Badge>
                          </div>
                        </div>
                        {module.description && (
                          <CardDescription className="mt-2">
                            {module.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      {currentModuleId === module.id && (
                        <CardContent className="pt-0">
                          <BottomCurriculum
                            moduleId={module.id}
                            courseId={courseId}
                          />
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No modules available yet
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'about' && (
          <Card>
            <CardHeader>
              <CardTitle>About This Course</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-lg dark:prose-invert max-w-none">
                <p className="text-muted-foreground whitespace-pre-line">
                  {course.description || "No description available."}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'reviews' && (
          <Card>
            <CardHeader>
              <CardTitle>Course Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <CourseRatingSection
                courseId={courseId}
                courseTitle={course.title || ""}
                enrollmentProgress={enrollment.progress_percentage}
                averageRating={course.average_rating || 0}
                totalRatings={course.total_ratings || 0}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Certificate */}
      {certificate && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              <CardTitle>Certificate of Completion</CardTitle>
            </div>
            <CardDescription>You have successfully completed this course</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-primary p-6 rounded-lg text-center space-y-3">
              <h2 className="text-2xl font-bold">Certificate of Completion</h2>
              <p className="text-lg">This certifies that you have successfully completed</p>
              <p className="text-xl font-bold">{course.title}</p>
              <p className="text-sm text-muted-foreground">Certificate #: {certificate.certificate_number}</p>
              <p className="text-sm text-muted-foreground">
                Issued on: {new Date(certificate.issued_at).toLocaleDateString()}
              </p>
            </div>
            <Button className="w-full">Download Certificate</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
