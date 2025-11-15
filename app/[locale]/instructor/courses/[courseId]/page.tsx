import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Link } from '@/i18n/routing'
import { redirect } from '@/i18n/routing'
import CourseModulesSection from "@/components/instructor/course-modules-section"
import CourseSettingsSection from "@/components/instructor/course-settings-section"
import { getTranslations } from 'next-intl/server'

export default async function CourseDetailPage({
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
          <p className="text-muted-foreground">{t('manageCourseContentAndSettings')}</p>
        </div>
        <Link href="/instructor/courses">
          <Button variant="outline">{t('backToCourses')}</Button>
        </Link>
      </div>

      <Tabs defaultValue="modules" className="w-full">
        <TabsList>
          <TabsTrigger value="modules">{t('modulesAndLessons')}</TabsTrigger>
          <TabsTrigger value="settings">{t('settings')}</TabsTrigger>
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
