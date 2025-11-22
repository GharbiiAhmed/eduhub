"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Link } from '@/i18n/routing'
import { useEffect, useState } from "react"
import { useTranslations } from 'next-intl'
import { 
  Moon, Sun, Sparkles, BookOpen, Users, Award, ArrowRight, Zap, Shield, Rocket, LogOut,
  Star, PlayCircle, Clock, TrendingUp, CheckCircle2, Video, MessageSquare, GraduationCap,
  Globe, Heart, ThumbsUp, ChevronRight, Download, ShoppingCart, Eye, UserPlus, Search,
  ArrowLeft
} from "lucide-react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { useAuth } from "@/lib/hooks/use-auth"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from '@/i18n/routing'
import { Navigation } from "@/components/navigation"
import Image from "next/image"

interface Course {
  id: string
  title: string
  description: string
  thumbnail_url: string | null
  price: number
  instructor_id: string
  created_at: string
  students_count?: number
  rating?: number | null
  average_rating?: number | null
  total_ratings?: number
  instructor_name?: string
  recent_review?: {
    rating: number
    review: string | null
    student_name: string | null
  }
}

interface Book {
  id: string
  title: string
  author: string
  description: string
  cover_url: string | null
  price: number
  purchases_count?: number
}

export default function Home() {
  const t = useTranslations('home')
  const tCommon = useTranslations('common')
  const tForums = useTranslations('forums')
  const tMeetings = useTranslations('meetings')
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { user, loading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  
  // Stats
  const [stats, setStats] = useState({
    courses: 0,
    students: 0,
    instructors: 0,
    books: 0
  })
  
  // Featured content
  const [featuredCourses, setFeaturedCourses] = useState<Course[]>([])
  const [featuredBooks, setFeaturedBooks] = useState<Book[]>([])
  const [recentRatings, setRecentRatings] = useState<Array<{
    id: string
    rating: number
    review: string | null
    student_name: string | null
    course_title: string
    course_id: string
    created_at: string
  }>>([])
  const [topInstructors, setTopInstructors] = useState<Array<{
    id: string
    full_name: string | null
    email: string
    avatar_url: string | null
    bio: string | null
    average_rating: number | null
    total_ratings: number | null
    courses_count: number
    students_count: number
  }>>([])
  const [loadingContent, setLoadingContent] = useState(true)

  useEffect(() => {
    setMounted(true)
    const isDarkMode = document.documentElement.classList.contains("dark")
    setIsDark(isDarkMode)
    fetchHomeData()
  }, [])

  const fetchHomeData = async () => {
    try {
      setLoadingContent(true)
      
      // Fetch stats
      const [coursesResult, studentsResult, instructorsResult, booksResult] = await Promise.all([
        supabase.from("courses").select("*", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "instructor"),
        supabase.from("books").select("*", { count: "exact", head: true })
      ])

      setStats({
        courses: coursesResult.count || 0,
        students: studentsResult.count || 0,
        instructors: instructorsResult.count || 0,
        books: booksResult.count || 0
      })

      // Fetch featured courses (most enrolled)
      const { data: allCourses } = await supabase
        .from("courses")
        .select("id, title, description, thumbnail_url, price, instructor_id, created_at")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(20)

      if (allCourses) {
        const coursesWithData = await Promise.all(
          allCourses.map(async (course) => {
            const { count: enrollmentsCount } = await supabase
              .from("enrollments")
              .select("*", { count: "exact", head: true })
              .eq("course_id", course.id)

            return {
              ...course,
              students_count: enrollmentsCount || 0
            }
          })
        )

        // Sort by enrollment count and take top 6
        const sorted = coursesWithData.sort((a, b) => (b.students_count || 0) - (a.students_count || 0))
        setFeaturedCourses(sorted.slice(0, 6))
      }

      // Fetch featured books (most purchased)
      const { data: allBooks } = await supabase
        .from("books")
        .select("id, title, author, description, cover_url, price, created_at")
        .order("created_at", { ascending: false })
        .limit(20)

      if (allBooks) {
        const booksWithData = await Promise.all(
          allBooks.map(async (book) => {
            const { count: purchasesCount } = await supabase
              .from("book_purchases")
              .select("*", { count: "exact", head: true })
              .eq("book_id", book.id)

            return {
              ...book,
              purchases_count: purchasesCount || 0
            }
          })
        )

        // Sort by purchase count and take top 6
        const sorted = booksWithData.sort((a, b) => (b.purchases_count || 0) - (a.purchases_count || 0))
        setFeaturedBooks(sorted.slice(0, 6))
      }

      // Fetch recent ratings/reviews
      const { data: ratings } = await supabase
        .from("course_ratings")
        .select("id, rating, review, student_id, course_id, created_at")
        .not("review", "is", null)
        .order("created_at", { ascending: false })
        .limit(6)

      if (ratings) {
        const ratingsWithDetails = await Promise.all(
          ratings.map(async (rating) => {
            // Get student name
            const { data: student } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", rating.student_id)
              .single()

            // Get course title
            const { data: course } = await supabase
              .from("courses")
              .select("title")
              .eq("id", rating.course_id)
              .single()

            return {
              id: rating.id,
              rating: rating.rating,
              review: rating.review,
              student_name: student?.full_name || null,
              course_title: course?.title || "Unknown Course",
              course_id: rating.course_id,
              created_at: rating.created_at
            }
          })
        )

        setRecentRatings(ratingsWithDetails)
      }

      // Fetch top instructors
      const { data: instructors } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, bio, average_rating, total_ratings")
        .eq("role", "instructor")
        .not("average_rating", "is", null)
        .gt("average_rating", 0)
        .order("average_rating", { ascending: false })
        .limit(6)

      if (instructors) {
        const instructorsWithStats = await Promise.all(
          instructors.map(async (instructor) => {
            // Get courses count
            const { count: coursesCount } = await supabase
              .from("courses")
              .select("*", { count: "exact", head: true })
              .eq("instructor_id", instructor.id)
              .eq("status", "published")

            // Get total students count (from enrollments)
            const { data: instructorCourses } = await supabase
              .from("courses")
              .select("id")
              .eq("instructor_id", instructor.id)
              .eq("status", "published")

            const courseIds = instructorCourses?.map(c => c.id) || []
            let studentsCount = 0
            if (courseIds.length > 0) {
              const { count } = await supabase
                .from("enrollments")
                .select("*", { count: "exact", head: true })
                .in("course_id", courseIds)
              studentsCount = count || 0
            }

            return {
              id: instructor.id,
              full_name: instructor.full_name,
              email: instructor.email,
              avatar_url: instructor.avatar_url,
              bio: instructor.bio,
              average_rating: instructor.average_rating,
              total_ratings: instructor.total_ratings,
              courses_count: coursesCount || 0,
              students_count: studentsCount
            }
          })
        )

        // Sort by rating and student count
        const sorted = instructorsWithStats.sort((a, b) => {
          const ratingDiff = (b.average_rating || 0) - (a.average_rating || 0)
          if (ratingDiff !== 0) return ratingDiff
          return (b.students_count || 0) - (a.students_count || 0)
        })

        setTopInstructors(sorted)
      }
    } catch (error) {
      console.error("Error fetching home data:", error)
    } finally {
      setLoadingContent(false)
    }
  }

  const toggleTheme = () => {
    if (!mounted) return
    const html = document.documentElement
    const isDarkMode = html.classList.contains("dark")

    if (isDarkMode) {
      html.classList.remove("dark")
      localStorage.setItem("theme", "light")
      setIsDark(false)
    } else {
      html.classList.add("dark")
      localStorage.setItem("theme", "dark")
      setIsDark(true)
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price)
  }

  return (
    <main className="min-h-screen bg-background overflow-hidden">
      {/* Animated background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-secondary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-96 h-96 bg-accent/20 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Navigation */}
      <Navigation userType={user?.user_metadata?.role || undefined} user={user} />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-4 sm:space-y-6 md:space-y-8 relative z-10">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/30 hover:border-secondary/50 transition-colors">
                  <Zap className="w-4 h-4 text-secondary" />
                  <span className="text-sm font-semibold text-secondary">{t('welcomeToFuture')}</span>
                </div>
                <h1 className="text-6xl lg:text-7xl font-bold leading-tight tracking-tight">
                  {t('title')}
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed max-w-xl">
                  {t('subtitle')}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                {user ? (
                  <>
                    <Link href="/student/courses" className="group">
                      <Button
                        size="lg"
                        className="w-full sm:w-auto bg-gradient-to-r from-primary to-secondary hover:shadow-2xl hover:shadow-primary/40 transition-all duration-300 group-hover:scale-105 text-base font-semibold"
                      >
                        {t('browseCourses')}
                        <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                    <Link href="/books">
                      <Button
                        size="lg"
                        variant="outline"
                        className="w-full sm:w-auto border-2 hover:bg-muted bg-transparent transition-all duration-300 hover:scale-105 text-base font-semibold"
                      >
                        {t('browseBooks')}
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/auth/sign-up" className="group">
                      <Button
                        size="lg"
                        className="w-full sm:w-auto bg-gradient-to-r from-primary to-secondary hover:shadow-2xl hover:shadow-primary/40 transition-all duration-300 group-hover:scale-105 text-base font-semibold"
                      >
                        {t('getStarted')}
                        <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                    <Link href="/auth/login">
                      <Button
                        size="lg"
                        variant="outline"
                        className="w-full sm:w-auto border-2 hover:bg-muted bg-transparent transition-all duration-300 hover:scale-105 text-base font-semibold"
                      >
                        {t('signIn')}
                      </Button>
                    </Link>
                  </>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 pt-8">
                {[
                  { value: stats.courses, label: tCommon('courses'), suffix: "+" },
                  { value: stats.students, label: tCommon('students'), suffix: "+" },
                  { value: stats.instructors, label: tCommon('instructors'), suffix: "+" },
                  { value: stats.books, label: tCommon('books'), suffix: "+" },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className="space-y-2 p-4 rounded-lg bg-card/50 backdrop-blur-sm border border-border hover:border-primary/50 transition-colors"
                  >
                    <div className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      {loadingContent ? "..." : `${stat.value}${stat.suffix}`}
                    </div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative h-96 lg:h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-secondary/30 to-accent/30 rounded-3xl blur-3xl"></div>
              <div className="relative glass-effect rounded-3xl p-4 sm:p-6 md:p-8 h-full flex flex-col justify-center items-center space-y-4 sm:space-y-6 md:space-y-8 border-2 border-primary/20 hover:border-primary/40 transition-colors">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-2xl shadow-primary/40 animate-bounce">
                  <BookOpen className="w-12 h-12 text-primary-foreground" />
                </div>
                <div className="text-center space-y-3">
                  <h3 className="text-3xl font-bold">{t('startLearning')}</h3>
                  <p className="text-muted-foreground text-lg">{t('startLearningDesc')}</p>
                </div>
                <div className="flex gap-2">
                  <Rocket className="w-5 h-5 text-accent" />
                  <Shield className="w-5 h-5 text-secondary" />
                  <Zap className="w-5 h-5 text-primary" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Courses Section */}
      {featuredCourses.length > 0 && (
        <section className="relative py-20 px-6 border-t border-border overflow-hidden">
          {/* Floating background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float"></div>
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float-slow"></div>
          </div>
          <div className="max-w-6xl mx-auto relative z-10">
            <div className="flex items-center justify-between mb-12">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg blur opacity-75"></div>
                <div className="relative">
                  <h2 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">{t('featuredCourses')}</h2>
                  <p className="text-muted-foreground">{t('mostPopular')}</p>
                </div>
              </div>
              <Link href="/courses">
                <Button variant="outline" className="group backdrop-blur-sm bg-card/50 border-2 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300">
                  {t('viewAll')}
                  <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
            <Carousel
              opts={{
                align: "start",
                loop: true,
                dragFree: true,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {featuredCourses.map((course, index) => (
                  <CarouselItem key={course.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                    <Link href={`/courses/${course.id}`}>
                      <Card className="group relative overflow-hidden hover:shadow-2xl hover:shadow-primary/30 transition-all duration-500 hover:scale-[1.03] hover:border-primary/50 cursor-pointer h-full animate-float backdrop-blur-sm bg-card/80 border-2" style={{ animationDelay: `${index * 0.1}s` }}>
                        {/* Floating glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 group-hover:from-primary/10 group-hover:via-primary/5 group-hover:to-secondary/10 transition-all duration-500 opacity-0 group-hover:opacity-100"></div>
                        <div className="relative h-48 w-full overflow-hidden rounded-t-lg">
                          {course.thumbnail_url ? (
                            <Image
                              src={course.thumbnail_url}
                              alt={course.title}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                              <BookOpen className="w-16 h-16 text-primary/50" />
                            </div>
                          )}
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-primary/90 text-primary-foreground">
                              {formatPrice(course.price)}
                            </Badge>
                          </div>
                        </div>
                        <CardHeader className="relative z-10">
                          <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
                            {course.title}
                          </CardTitle>
                          <CardDescription className="line-clamp-2">
                            {course.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="relative z-10">
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span>{course.students_count || 0} {t('students')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <PlayCircle className="w-4 h-4" />
                              <span>{tCommon('view')}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-2 md:left-4 bg-background/80 backdrop-blur-sm border-2 hover:bg-primary/10 hover:border-primary/50" />
              <CarouselNext className="right-2 md:right-4 bg-background/80 backdrop-blur-sm border-2 hover:bg-primary/10 hover:border-primary/50" />
            </Carousel>
          </div>
        </section>
      )}

      {/* Featured Books Section */}
      {featuredBooks.length > 0 && (
        <section className="relative py-20 px-6 border-t border-border bg-muted/30 overflow-hidden">
          {/* Floating background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 right-10 w-80 h-80 bg-accent/10 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float-slow"></div>
            <div className="absolute bottom-20 left-10 w-96 h-96 bg-primary/10 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float"></div>
          </div>
          <div className="max-w-6xl mx-auto relative z-10">
            <div className="flex items-center justify-between mb-12">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 to-primary/20 rounded-lg blur opacity-75"></div>
                <div className="relative">
                  <h2 className="text-4xl font-bold mb-2 bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">{t('featuredBooks')}</h2>
                  <p className="text-muted-foreground">{t('bestSelling')}</p>
                </div>
              </div>
              <Link href="/books">
                <Button variant="outline" className="group backdrop-blur-sm bg-card/50 border-2 hover:border-accent/50 hover:bg-accent/5 transition-all duration-300">
                  {t('viewAll')}
                  <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
            <Carousel
              opts={{
                align: "start",
                loop: true,
                dragFree: true,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {featuredBooks.map((book, index) => (
                  <CarouselItem key={book.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                    <Link href={`/books/${book.id}`}>
                      <Card className="group relative overflow-hidden hover:shadow-2xl hover:shadow-accent/30 transition-all duration-500 hover:scale-[1.03] hover:border-accent/50 cursor-pointer h-full animate-float backdrop-blur-sm bg-card/80 border-2" style={{ animationDelay: `${index * 0.1}s` }}>
                        {/* Floating glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-accent/0 via-accent/0 to-primary/0 group-hover:from-accent/10 group-hover:via-accent/5 group-hover:to-primary/10 transition-all duration-500 opacity-0 group-hover:opacity-100"></div>
                        <div className="relative h-64 w-full overflow-hidden rounded-t-lg">
                          {book.cover_url ? (
                            <Image
                              src={book.cover_url}
                              alt={book.title}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center">
                              <BookOpen className="w-16 h-16 text-accent/50" />
                            </div>
                          )}
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-accent/90 text-accent-foreground">
                              {formatPrice(book.price)}
                            </Badge>
                          </div>
                        </div>
                        <CardHeader className="relative z-10">
                          <CardTitle className="line-clamp-2 group-hover:text-accent transition-colors">
                            {book.title}
                          </CardTitle>
                          <CardDescription className="line-clamp-1">
                            {tCommon('author')}: {book.author}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="relative z-10">
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <ShoppingCart className="w-4 h-4" />
                              <span>{book.purchases_count || 0} {t('purchases')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Eye className="w-4 h-4" />
                              <span>{tCommon('view')}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-2 md:left-4 bg-background/80 backdrop-blur-sm border-2 hover:bg-accent/10 hover:border-accent/50" />
              <CarouselNext className="right-2 md:right-4 bg-background/80 backdrop-blur-sm border-2 hover:bg-accent/10 hover:border-accent/50" />
            </Carousel>
          </div>
        </section>
      )}

      {/* Ratings List Section */}
      {recentRatings.length > 0 && (
        <section className="relative py-20 px-6 border-t border-border bg-muted/30 overflow-hidden">
          {/* Floating background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-1/2 w-96 h-96 bg-secondary/10 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float"></div>
            <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-primary/10 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float-slow"></div>
          </div>
          <div className="max-w-6xl mx-auto relative z-10">
            <div className="flex items-center justify-between mb-12">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-secondary/20 to-primary/20 rounded-lg blur opacity-75"></div>
                <div className="relative">
                  <h2 className="text-4xl font-bold mb-2 bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">{t('recentRatings')}</h2>
                  <p className="text-muted-foreground">{t('whatStudentsSay')}</p>
                </div>
              </div>
            </div>
            <Carousel
              opts={{
                align: "start",
                loop: true,
                dragFree: true,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {recentRatings.map((rating, index) => (
                  <CarouselItem key={rating.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                    <Card className="group relative overflow-hidden hover:shadow-2xl hover:shadow-secondary/30 transition-all duration-500 hover:scale-[1.03] hover:border-secondary/50 animate-float backdrop-blur-sm bg-card/80 border-2" style={{ animationDelay: `${index * 0.1}s` }}>
                      {/* Floating glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-secondary/0 via-secondary/0 to-primary/0 group-hover:from-secondary/10 group-hover:via-secondary/5 group-hover:to-primary/10 transition-all duration-500 opacity-0 group-hover:opacity-100"></div>
                      <CardHeader className="relative z-10">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-primary-foreground font-bold shadow-lg shadow-secondary/30 group-hover:shadow-secondary/50 transition-shadow duration-300">
                              {(rating.student_name || tCommon('anonymous')).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-sm group-hover:text-secondary transition-colors">{rating.student_name || tCommon('anonymous')}</p>
                              <Link href={`/courses/${rating.course_id}`} className="text-xs text-muted-foreground hover:text-secondary transition-colors">
                                {rating.course_title}
                              </Link>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 transition-all duration-300 ${
                                  i < rating.rating
                                    ? 'fill-yellow-400 text-yellow-400 group-hover:scale-110'
                                    : 'text-gray-300'
                                }`}
                                style={{ transitionDelay: `${i * 0.05}s` }}
                              />
                            ))}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="relative z-10">
                        <p className="text-muted-foreground leading-relaxed line-clamp-4 group-hover:text-foreground/90 transition-colors">
                          "{rating.review}"
                        </p>
                        <p className="text-xs text-muted-foreground mt-3">
                          {new Date(rating.created_at).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-2 md:left-4 bg-background/80 backdrop-blur-sm border-2 hover:bg-secondary/10 hover:border-secondary/50" />
              <CarouselNext className="right-2 md:right-4 bg-background/80 backdrop-blur-sm border-2 hover:bg-secondary/10 hover:border-secondary/50" />
            </Carousel>
          </div>
        </section>
      )}

      {/* Top Instructors Section */}
      {topInstructors.length > 0 && (
        <section className="relative py-20 px-6 border-t border-border overflow-hidden">
          {/* Floating background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 right-10 w-80 h-80 bg-primary/10 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float"></div>
            <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent/10 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float-slow"></div>
          </div>
          <div className="max-w-6xl mx-auto relative z-10">
            <div className="flex items-center justify-between mb-12">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg blur opacity-75"></div>
                <div className="relative">
                  <h2 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{t('topInstructors')}</h2>
                  <p className="text-muted-foreground">{t('meetOurExperts')}</p>
                </div>
              </div>
            </div>
            <Carousel
              opts={{
                align: "start",
                loop: true,
                dragFree: true,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {topInstructors.map((instructor, index) => (
                  <CarouselItem key={instructor.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                    <Card className="group relative overflow-hidden hover:shadow-2xl hover:shadow-primary/30 transition-all duration-500 hover:scale-[1.03] hover:border-primary/50 animate-float backdrop-blur-sm bg-card/80 border-2" style={{ animationDelay: `${index * 0.1}s` }}>
                      {/* Floating glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-accent/0 group-hover:from-primary/10 group-hover:via-primary/5 group-hover:to-accent/10 transition-all duration-500 opacity-0 group-hover:opacity-100"></div>
                      <CardHeader className="relative z-10">
                        <div className="flex flex-col items-center text-center space-y-4">
                          <div className="relative">
                            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground text-2xl font-bold shadow-lg shadow-primary/30 group-hover:shadow-primary/50 transition-shadow duration-300 overflow-hidden">
                              {instructor.avatar_url ? (
                                <Image
                                  src={instructor.avatar_url}
                                  alt={instructor.full_name || instructor.email}
                                  fill
                                  className="object-cover rounded-full"
                                />
                              ) : (
                                <span>{(instructor.full_name || instructor.email).charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            {index < 3 && (
                              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                                {index + 1}
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                              {instructor.full_name || instructor.email}
                            </h3>
                            {instructor.bio && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {instructor.bio}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="relative z-10">
                        <div className="space-y-3">
                          {instructor.average_rating && instructor.average_rating > 0 && (
                            <div className="flex items-center justify-center gap-2">
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${
                                      i < Math.round(instructor.average_rating || 0)
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-sm font-semibold">
                                {instructor.average_rating.toFixed(1)}
                              </span>
                              {instructor.total_ratings && instructor.total_ratings > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  ({instructor.total_ratings})
                                </span>
                              )}
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                            <div className="text-center">
                              <div className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                                {instructor.courses_count}
                              </div>
                              <div className="text-xs text-muted-foreground">{tCommon('courses')}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                                {instructor.students_count >= 1000 
                                  ? `${(instructor.students_count / 1000).toFixed(1)}K`
                                  : instructor.students_count}
                              </div>
                              <div className="text-xs text-muted-foreground">{tCommon('students')}</div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-2 md:left-4 bg-background/80 backdrop-blur-sm border-2 hover:bg-primary/10 hover:border-primary/50" />
              <CarouselNext className="right-2 md:right-4 bg-background/80 backdrop-blur-sm border-2 hover:bg-primary/10 hover:border-primary/50" />
            </Carousel>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="relative py-20 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-5xl font-bold">{t('whyChoose')}</h2>
            <p className="text-xl text-muted-foreground">{t('whyChooseSubtitle')}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: BookOpen,
                title: t('expertCourses'),
                description: t('expertCoursesDesc'),
                color: "from-primary to-secondary",
              },
              {
                icon: Users,
                title: t('community'),
                description: t('communityDesc'),
                color: "from-secondary to-accent",
              },
              {
                icon: Award,
                title: t('certificates'),
                description: t('certificatesDesc'),
                color: "from-accent to-primary",
              },
              {
                icon: Video,
                title: t('liveMeetings'),
                description: t('liveMeetingsDesc'),
                color: "from-primary to-accent",
              },
              {
                icon: MessageSquare,
                title: t('directMessaging'),
                description: t('directMessagingDesc'),
                color: "from-secondary to-primary",
              },
              {
                icon: Download,
                title: t('digitalBooks'),
                description: t('digitalBooksDesc'),
                color: "from-accent to-secondary",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="glass-effect rounded-2xl p-4 sm:p-6 md:p-8 hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300 hover:scale-105 hover:border-primary/50 group cursor-pointer"
              >
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:shadow-xl transition-shadow`}
                >
                  <feature.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative py-20 px-6 border-t border-border bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-5xl font-bold">{t('howItWorks')}</h2>
            <p className="text-xl text-muted-foreground">{t('howItWorksSubtitle')}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {[
              {
                step: "01",
                icon: UserPlus,
                title: t('createAccount'),
                description: t('createAccountDesc'),
              },
              {
                step: "02",
                icon: Search,
                title: t('browseEnroll'),
                description: t('browseEnrollDesc'),
              },
              {
                step: "03",
                icon: GraduationCap,
                title: t('startLearning'),
                description: t('startLearningDesc'),
              },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="glass-effect rounded-2xl p-4 sm:p-6 md:p-8 text-center space-y-3 sm:space-y-4 hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300 hover:scale-105">
                  <div className="text-6xl font-bold text-primary/20 absolute top-4 right-4">
                    {item.step}
                  </div>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto shadow-lg">
                    <item.icon className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-2xl font-bold">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <ArrowRight className="w-8 h-8 text-primary/50" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="gradient-primary rounded-3xl p-12 text-center space-y-6 shadow-2xl shadow-primary/30 border border-primary/20 relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <h2 className="text-4xl font-bold text-primary-foreground">{t('readyToTransform')}</h2>
              <p className="text-lg text-primary-foreground/90">{t('readyToTransformSubtitle')}</p>
              {!user && (
                <Link href="/auth/sign-up">
                  <Button
                    size="lg"
                    className="mt-6 bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-semibold transition-all duration-300 hover:scale-105"
                  >
                    {t('startFreeTrial')}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6 relative z-10 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-4 sm:gap-6 md:gap-8 mb-4 sm:mb-6 md:mb-8">
            <div>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-primary" />
                EduHub
              </h3>
              <p className="text-muted-foreground text-sm">
                {t('subtitle')}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{tCommon('platform')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/courses" className="hover:text-primary transition-colors">{tCommon('courses')}</Link></li>
                <li><Link href="/books" className="hover:text-primary transition-colors">{tCommon('books')}</Link></li>
                <li><Link href="/student/forums" className="hover:text-primary transition-colors">{tForums('title')}</Link></li>
                <li><Link href="/student/meetings" className="hover:text-primary transition-colors">{tMeetings('title')}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{tCommon('company')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-primary transition-colors">{tCommon('about')}</Link></li>
                <li><Link href="/contact" className="hover:text-primary transition-colors">{tCommon('contact')}</Link></li>
                <li><Link href="/privacy" className="hover:text-primary transition-colors">{tCommon('privacy')}</Link></li>
                <li><Link href="/terms" className="hover:text-primary transition-colors">{tCommon('terms')}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{tCommon('connect')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-primary transition-colors">Twitter</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">LinkedIn</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Facebook</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Discord</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center text-muted-foreground text-sm">
            <p>&copy; 2025 EduHub. {tCommon('allRightsReserved')}</p>
          </div>
        </div>
      </footer>
    </main>
  )
}




