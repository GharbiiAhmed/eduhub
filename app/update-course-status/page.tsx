import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { redirect } from "next/navigation"

export default async function UpdateCourseStatusPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get all courses
  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false })

  async function updateCourseStatus(courseId: string, newStatus: string) {
    "use server"
    
    const supabase = await createClient()
    const { error } = await supabase
      .from("courses")
      .update({ status: newStatus })
      .eq("id", courseId)
    
    if (error) {
      console.error("Error updating course status:", error)
    } else {
      console.log(`Course ${courseId} status updated to ${newStatus}`)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Update Course Status</h1>
        <p className="text-muted-foreground">Change course status to make them visible</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Courses</CardTitle>
          <CardDescription>Click to update course status</CardDescription>
        </CardHeader>
        <CardContent>
          {courses && courses.length > 0 ? (
            <div className="space-y-4">
              {courses.map((course: any) => (
                <div key={course.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold">{course.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Current Status: <span className="font-medium capitalize">{course.status}</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <form action={async () => {
                        "use server"
                        const supabase = await createClient()
                        await supabase
                          .from("courses")
                          .update({ status: "published" })
                          .eq("id", course.id)
                      }}>
                        <Button type="submit" variant="outline" size="sm">
                          Publish
                        </Button>
                      </form>
                      <form action={async () => {
                        "use server"
                        const supabase = await createClient()
                        await supabase
                          .from("courses")
                          .update({ status: "draft" })
                          .eq("id", course.id)
                      }}>
                        <Button type="submit" variant="outline" size="sm">
                          Draft
                        </Button>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No courses found</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


