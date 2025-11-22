import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Link } from '@/i18n/routing'
import { redirect } from '@/i18n/routing'
import { getTranslations } from 'next-intl/server'

export default async function InstructorCoursesPage() {
  const t = await getTranslations('courses')
  const tDashboard = await getTranslations('dashboard')
  const tCommon = await getTranslations('common')

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .eq("instructor_id", user.id)
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{tDashboard('myCourses')}</h1>
          <p className="text-sm sm:text-base text-muted-foreground">{tDashboard('manageCourseContent')}</p>
        </div>
        <Link href="/instructor/courses/create">
          <Button className="w-full sm:w-auto">{t('createCourse')}</Button>
        </Link>
      </div>

      {courses && courses.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Card key={course.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                <CardDescription className="line-clamp-2">{course.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">{tCommon('status')}:</span>
                  <span className="font-medium capitalize">{course.status}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">{t('price')}:</span>
                  <span className="font-medium">${course.price}</span>
                </div>
                <Link href={`/instructor/courses/${course.id}`}>
                  <Button className="w-full bg-transparent" variant="outline">
                    {tDashboard('editCourse')}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-4 sm:pt-6 text-center">
            <p className="text-muted-foreground mb-4">{tDashboard('noCoursesYet')}</p>
            <Link href="/instructor/courses/create">
              <Button>{tDashboard('createFirstCourse')}</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
