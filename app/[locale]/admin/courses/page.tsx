import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { redirect } from '@/i18n/routing'
import { getTranslations } from 'next-intl/server'

export default async function AdminCoursesPage() {
  const t = await getTranslations('courses')
  const tCommon = await getTranslations('common')

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check if user is admin
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "admin") {
    redirect("/dashboard")
  }

  // Get all courses
  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('courseManagement')}</h1>
        <p className="text-muted-foreground">{t('manageAllPlatformCourses')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('allCoursesTitle')}</CardTitle>
          <CardDescription>{t('completeListOfCourses')}</CardDescription>
        </CardHeader>
        <CardContent>
          {courses && courses.length > 0 ? (
            <div className="space-y-4">
              {courses.map((course: any) => (
                <div key={course.id} className="flex items-center justify-between border-b pb-4 last:border-b-0">
                  <div>
                    <p className="font-medium">{course.title}</p>
                    <p className="text-sm text-muted-foreground">{tCommon('by')} {tCommon('instructors')}</p>
                    <p className="text-xs text-muted-foreground">{course.description?.slice(0, 100)}...</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">${course.price}</p>
                      <span className="text-xs font-medium capitalize px-2 py-1 rounded bg-muted">{course.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">{t('noCoursesFound')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
