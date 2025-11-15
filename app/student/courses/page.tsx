import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { redirect } from "next/navigation"
import { BookOpen, ArrowRight, Zap, Trophy } from "lucide-react"
import { AISuggestionsPanel } from "@/components/ai-suggestions-panel"

export default async function StudentCoursesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("*, courses(*)")
    .eq("student_id", user.id)
    .order("enrolled_at", { ascending: false })

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 p-8 md:p-12 border border-primary/20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 blur-3xl"></div>
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center glow-primary">
              <BookOpen className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                My Learning Journey
              </h1>
              <p className="text-muted-foreground">Continue where you left off</p>
            </div>
          </div>
        </div>
      </div>

      {enrollments && enrollments.length > 0 ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-effect rounded-2xl p-6 border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Courses Enrolled</p>
                  <p className="text-3xl font-bold text-primary">{enrollments.length}</p>
                </div>
                <BookOpen className="w-10 h-10 text-primary/30" />
              </div>
            </div>
            <div className="glass-effect rounded-2xl p-6 border-secondary/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Average Progress</p>
                  <p className="text-3xl font-bold text-secondary">
                    {Math.round(
                      enrollments.reduce((sum: number, e: any) => sum + (e.progress_percentage || 0), 0) /
                        enrollments.length,
                    )}
                    %
                  </p>
                </div>
                <Zap className="w-10 h-10 text-secondary/30" />
              </div>
            </div>
            <div className="glass-effect rounded-2xl p-6 border-accent/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-3xl font-bold text-accent">
                    {enrollments.filter((e: any) => e.progress_percentage === 100).length}
                  </p>
                </div>
                <Trophy className="w-10 h-10 text-accent/30" />
              </div>
            </div>
          </div>

          {/* Courses Grid */}
          <div>
            <h2 className="text-2xl font-bold mb-6">Your Courses</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {enrollments.map((enrollment: any) => (
                <Link key={enrollment.id} href={`/student/courses/${enrollment.courses.id}`}>
                  <div className="group glass-effect rounded-2xl overflow-hidden hover:glow-primary transition-all hover:scale-105 border-primary/20 h-full flex flex-col">
                    {/* Card Header with Gradient */}
                    <div className="h-32 bg-gradient-to-br from-primary/30 via-secondary/20 to-accent/30 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20 blur-2xl group-hover:blur-3xl transition-all"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <BookOpen className="w-12 h-12 text-primary/40 group-hover:text-primary/60 transition-colors" />
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="font-bold text-lg line-clamp-2 group-hover:text-primary transition-colors mb-2">
                        {enrollment.courses.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                        {enrollment.courses.description}
                      </p>

                      {/* Progress Bar */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-bold text-primary">{enrollment.progress_percentage}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all duration-500"
                            style={{ width: `${enrollment.progress_percentage}%` }}
                          />
                        </div>
                      </div>

                      {/* CTA Button */}
                      <Button className="w-full bg-gradient-to-r from-primary to-secondary hover:shadow-lg hover:shadow-primary/30 text-primary-foreground group/btn">
                        Continue Learning
                        <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="glass-effect rounded-3xl p-12 text-center border-primary/20 space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto">
            <BookOpen className="w-10 h-10 text-primary/40" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold">No Courses Yet</h3>
            <p className="text-muted-foreground">Start your learning journey by exploring our course catalog</p>
          </div>
          <Link href="/courses">
            <Button className="bg-gradient-to-r from-primary to-secondary hover:shadow-lg hover:shadow-primary/30 text-primary-foreground">
              Explore Courses
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      )}

      <AISuggestionsPanel
        context={`I am a student with ${enrollments?.length || 0} enrolled courses. My average progress is ${Math.round(
          (enrollments?.reduce((sum: number, e: any) => sum + (e.progress_percentage || 0), 0) || 0) /
            (enrollments?.length || 1),
        )}%. Help me optimize my learning path and suggest next steps.`}
        userType="student"
        title="AI Learning Recommendations"
      />
    </div>
  )
}
