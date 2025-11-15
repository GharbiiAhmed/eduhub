import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { redirect } from "next/navigation"
import { 
  BookOpen, 
  Clock, 
  Search, 
  Filter, 
  Eye, 
  Edit,
  PlayCircle,
  FileText,
  Video,
  File
} from "lucide-react"

export default async function InstructorLessonsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch all courses for the instructor
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .eq("instructor_id", user.id)

  // Fetch all lessons from instructor's courses
  const courseIds = courses?.map(c => c.id) || []
  
  let lessons: any[] = []
  if (courseIds.length > 0) {
    const { data: lessonsData, error: lessonsError } = await supabase
      .from("lessons")
      .select(`
        *,
        modules!inner(
          id,
          title,
          course_id,
          courses!inner(
            id,
            title
          )
        )
      `)
      .in("modules.course_id", courseIds)
      .order("created_at", { ascending: false })

    if (!lessonsError && lessonsData) {
      lessons = lessonsData.map(lesson => {
        const module = lesson.modules as any
        const course = module?.courses as any
        
        return {
          ...lesson,
          module_title: module?.title || 'Unknown Module',
          course_id: course?.id || '',
          course_title: course?.title || 'Unknown Course'
        }
      })
    }
  }

  // Get lesson statistics
  const totalLessons = lessons.length
  const videoLessons = lessons.filter(l => l.content_type === 'video' || l.video_url).length
  const pdfLessons = lessons.filter(l => l.content_type === 'pdf' || l.pdf_url).length
  const textLessons = lessons.filter(l => l.content_type === 'text' || l.text_content).length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Manage Lessons</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            View and manage all lessons across your courses
          </p>
        </div>
        <Link href="/instructor/courses">
          <Button>
            <BookOpen className="w-4 h-4 mr-2" />
            Manage Courses
          </Button>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Lessons</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLessons}</div>
            <p className="text-xs text-muted-foreground">
              Across all courses
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Video Lessons</CardTitle>
            <Video className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{videoLessons}</div>
            <p className="text-xs text-muted-foreground">
              Video content
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PDF Lessons</CardTitle>
            <File className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pdfLessons}</div>
            <p className="text-xs text-muted-foreground">
              Document content
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Text Lessons</CardTitle>
            <FileText className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{textLessons}</div>
            <p className="text-xs text-muted-foreground">
              Text content
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lessons List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Lessons ({totalLessons})</CardTitle>
              <CardDescription>
                All lessons from your courses
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {lessons && lessons.length > 0 ? (
            <div className="space-y-4">
              {lessons.map((lesson) => (
                <div 
                  key={lesson.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      {lesson.content_type === 'video' || lesson.video_url ? (
                        <Video className="w-6 h-6 text-white" />
                      ) : lesson.content_type === 'pdf' || lesson.pdf_url ? (
                        <File className="w-6 h-6 text-white" />
                      ) : (
                        <FileText className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {lesson.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {lesson.description || 'No description'}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center space-x-1">
                          <BookOpen className="w-3 h-3" />
                          <span>{lesson.course_title}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <FileText className="w-3 h-3" />
                          <span>{lesson.module_title}</span>
                        </span>
                        {lesson.duration_minutes && (
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{lesson.duration_minutes} min</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="capitalize">
                        {lesson.content_type || 'mixed'}
                      </Badge>
                      <Link href={`/instructor/lessons/${lesson.id}`}>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      </Link>
                      <Link href={`/instructor/courses/${lesson.course_id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          View Course
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No Lessons Found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Create courses and add lessons to see them here
              </p>
              <Link href="/instructor/courses/create">
                <Button>
                  <BookOpen className="w-4 h-4 mr-2" />
                  Create Course
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

