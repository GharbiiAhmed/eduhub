import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { redirect } from "next/navigation"

export default async function DebugEnrollmentPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get user's enrollments
  const { data: enrollments, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("*, courses(*)")
    .eq("student_id", user.id)

  // Get all courses
  const { data: courses, error: coursesError } = await supabase
    .from("courses")
    .select("*")
    .eq("status", "published")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Debug Enrollment</h1>
        <p className="text-muted-foreground">Check enrollment status and course data</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>User ID:</strong> {user.id}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Authenticated:</strong> {user ? "Yes" : "No"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available Courses ({courses?.length || 0})</CardTitle>
          <CardDescription>Published courses that can be enrolled in</CardDescription>
        </CardHeader>
        <CardContent>
          {courses && courses.length > 0 ? (
            <div className="space-y-4">
              {courses.map((course: any) => (
                <div key={course.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold">{course.title}</h3>
                      <p className="text-sm text-muted-foreground">Price: ${course.price}</p>
                      <p className="text-sm text-muted-foreground">Status: {course.status}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">ID: {course.id}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No published courses found</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Enrollments ({enrollments?.length || 0})</CardTitle>
          <CardDescription>Courses you are enrolled in</CardDescription>
        </CardHeader>
        <CardContent>
          {enrollments && enrollments.length > 0 ? (
            <div className="space-y-4">
              {enrollments.map((enrollment: any) => (
                <div key={enrollment.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold">{enrollment.courses?.title || "Unknown Course"}</h3>
                      <p className="text-sm text-muted-foreground">
                        Progress: {enrollment.progress_percentage}%
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Enrolled: {new Date(enrollment.enrolled_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Course ID: {enrollment.course_id}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No enrollments found</p>
          )}
        </CardContent>
      </Card>

      {enrollmentError && (
        <Card>
          <CardHeader>
            <CardTitle>Enrollment Error</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-red-500">{JSON.stringify(enrollmentError, null, 2)}</pre>
          </CardContent>
        </Card>
      )}

      {coursesError && (
        <Card>
          <CardHeader>
            <CardTitle>Courses Error</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-red-500">{JSON.stringify(coursesError, null, 2)}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


