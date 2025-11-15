import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { redirect } from "next/navigation"
import CourseModulesSection from "@/components/instructor/course-modules-section"
import CourseSettingsSection from "@/components/instructor/course-settings-section"

export default async function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const supabase = await createClient()
  const { courseId } = await params

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .eq("instructor_id", user.id)
    .single()

  if (!course) {
    redirect("/instructor/courses")
  }

  const { data: modules } = await supabase
    .from("modules")
    .select("*")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{course.title}</h1>
          <p className="text-muted-foreground">Manage course content and settings</p>
        </div>
        <Link href="/instructor/courses">
          <Button variant="outline">Back to Courses</Button>
        </Link>
      </div>

      <Tabs defaultValue="modules" className="w-full">
        <TabsList>
          <TabsTrigger value="modules">Modules & Lessons</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="modules" className="space-y-4">
          <CourseModulesSection courseId={courseId} modules={modules || []} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <CourseSettingsSection course={course} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
