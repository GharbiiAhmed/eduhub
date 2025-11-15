import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Link } from '@/i18n/routing'
import { redirect } from '@/i18n/routing'
import CourseModulesView from "@/components/student/course-modules-view"
import { CourseRatingSection } from "@/components/student/course-rating-section"
import { RatingDisplay } from "@/components/course/rating-display"
import { getTranslations } from 'next-intl/server'

export default async function StudentCourseDetailPage({
  params
}: {
  params: Promise<{ courseId: string }>
}) {
  const t = await getTranslations('courses')
  const tCommon = await getTranslations('common')
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
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{course?.title}</h1>
          <div className="flex items-center gap-4">
            <p className="text-muted-foreground">Progress: {enrollment.progress_percentage}%</p>
            {course?.average_rating && course.average_rating > 0 && (
              <RatingDisplay
                rating={course.average_rating}
                totalRatings={course.total_ratings || 0}
              />
            )}
          </div>
        </div>
        <Link href="/student/courses">
          <Button variant="outline">{tCommon('backToCourses')}</Button>
        </Link>
      </div>

      <Tabs defaultValue="lessons" className="w-full">
        <TabsList>
          <TabsTrigger value="lessons">Lessons</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
          {certificate && <TabsTrigger value="certificate">Certificate</TabsTrigger>}
        </TabsList>

        <TabsContent value="lessons" className="space-y-4">
          <CourseModulesView courseId={courseId} modules={modules || []} />
        </TabsContent>

        <TabsContent value="about" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>About This Course</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{course?.description}</p>
            </CardContent>
          </Card>

          <CourseRatingSection
            courseId={courseId}
            courseTitle={course?.title || ""}
            enrollmentProgress={enrollment.progress_percentage}
            averageRating={course?.average_rating || 0}
            totalRatings={course?.total_ratings || 0}
          />
        </TabsContent>

        {certificate && (
          <TabsContent value="certificate" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Certificate of Completion</CardTitle>
                <CardDescription>You have successfully completed this course</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-primary p-8 rounded-lg text-center space-y-4">
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
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
