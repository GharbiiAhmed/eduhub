import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { redirect } from "next/navigation"

export default async function DebugCoursesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get all courses without any joins
  const { data: courses, error } = await supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Debug Courses</h1>
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-red-500">{JSON.stringify(error, null, 2)}</pre>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Debug Courses</h1>
        <p className="text-muted-foreground">Raw course data from database</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Courses ({courses?.length || 0})</CardTitle>
          <CardDescription>Complete raw data from courses table</CardDescription>
        </CardHeader>
        <CardContent>
          {courses && courses.length > 0 ? (
            <div className="space-y-4">
              {courses.map((course: any) => (
                <div key={course.id} className="border rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-bold">{course.title}</h3>
                      <p className="text-sm text-muted-foreground">ID: {course.id}</p>
                      <p className="text-sm text-muted-foreground">Status: <span className="font-medium">{course.status}</span></p>
                      <p className="text-sm text-muted-foreground">Price: ${course.price}</p>
                      <p className="text-sm text-muted-foreground">Instructor ID: {course.instructor_id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Description:</p>
                      <p className="text-sm">{course.description || "No description"}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Created: {new Date(course.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No courses found in database</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Published Courses Only</CardTitle>
          <CardDescription>Courses with status = "published"</CardDescription>
        </CardHeader>
        <CardContent>
          {courses?.filter(c => c.status === "published").length || 0} published courses
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Course Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p>Draft: {courses?.filter(c => c.status === "draft").length || 0}</p>
            <p>Published: {courses?.filter(c => c.status === "published").length || 0}</p>
            <p>Archived: {courses?.filter(c => c.status === "archived").length || 0}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


