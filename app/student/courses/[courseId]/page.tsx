import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { redirect } from "next/navigation"
import CourseCurriculum from "@/components/student/course-curriculum"
import { CourseRatingSection } from "@/components/student/course-rating-section"
import { RatingDisplay } from "@/components/course/rating-display"
import { Progress } from "@/components/ui/progress"

export default async function StudentCourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const supabase = await createClient()
  const { courseId } = await params

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check if student is enrolled
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("*")
    .eq("student_id", user.id)
    .eq("course_id", courseId)
    .single()

  if (!enrollment) {
    redirect("/student/courses")
  }

  const { data: course } = await supabase.from("courses").select("*").eq("id", courseId).single()

  const { data: modules } = await supabase
    .from("modules")
    .select("*")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true })

  const { data: certificate } = await supabase
    .from("certificates")
    .select("*")
    .eq("student_id", user.id)
    .eq("course_id", courseId)
    .single()

  return (
    <div className="space-y-6">
      {/* Course Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <h1 className="text-3xl font-bold">{course?.title}</h1>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Overall Progress:</span>
              <div className="flex items-center gap-2 min-w-[200px]">
                <Progress value={enrollment.progress_percentage} className="flex-1" />
                <span className="text-sm font-medium min-w-[45px]">
                  {enrollment.progress_percentage}%
                </span>
              </div>
            </div>
            {course?.average_rating && course.average_rating > 0 && (
              <RatingDisplay
                rating={course.average_rating}
                totalRatings={course.total_ratings || 0}
              />
            )}
          </div>
        </div>
        <Link href="/student/courses">
          <Button variant="outline">Back to Courses</Button>
        </Link>
      </div>

      {/* Course Curriculum */}
      <CourseCurriculum
        courseId={courseId}
        modules={modules || []}
        courseDescription={course?.description}
        courseTitle={course?.title}
      />

      {/* Course Rating Section */}
      <Card>
        <CardHeader>
          <CardTitle>Course Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <CourseRatingSection
            courseId={courseId}
            courseTitle={course?.title || ""}
            enrollmentProgress={enrollment.progress_percentage}
            averageRating={course?.average_rating || 0}
            totalRatings={course?.total_ratings || 0}
          />
        </CardContent>
      </Card>

      {/* Certificate Section */}
      {certificate && (
        <Card>
          <CardHeader>
            <CardTitle>Certificate of Completion</CardTitle>
            <CardDescription>You have successfully completed this course</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-primary p-4 sm:p-6 md:p-8 rounded-lg text-center space-y-3 sm:space-y-4">
              <h2 className="text-2xl font-bold">Certificate of Completion</h2>
              <p className="text-lg">This certifies that you have successfully completed</p>
              <p className="text-xl font-bold">{course?.title}</p>
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
