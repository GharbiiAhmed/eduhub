"use client"

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import Link from "next/link"
import { 
  BookOpen, 
  ArrowRight, 
  Star, 
  Users, 
  Search, 
  Filter, 
  Grid, 
  List,
  Clock,
  Award,
  TrendingUp,
  Zap,
  ChevronDown,
  PlayCircle
} from "lucide-react"
import { Navigation } from "@/components/navigation"
import { FeatureGuard } from "@/components/feature-guard"

interface Course {
  id: string
  title: string
  description: string
  thumbnail_url: string | null
  price: number
  instructor_id: string
  created_at: string
  category?: string
  difficulty?: string
  duration?: number
  rating?: number | null
  students_count?: number
  modules_count?: number
}

export function CoursesClient() {
  const [courses, setCourses] = useState<Course[]>([])
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterDifficulty, setFilterDifficulty] = useState('all')
  const [filterPrice, setFilterPrice] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchCourses()
  }, [])

  useEffect(() => {
    filterCourses()
  }, [courses, searchTerm, sortBy, filterCategory, filterDifficulty, filterPrice])

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select(`
          id,
          title,
          description,
          thumbnail_url,
          price,
          instructor_id,
          created_at,
          average_rating,
          total_ratings
        `)
        .eq("status", "published")
        .order("created_at", { ascending: false })

      if (error) {
        console.error('Error fetching courses from database:', error)
        throw error
      }

      if (!data || data.length === 0) {
        console.log('No published courses found')
        setCourses([])
        return
      }

      // Get real counts for each course
      const coursesWithData = await Promise.all(
        data.map(async (course) => {
          try {
            // Get enrollment count
            const { count: enrollmentsCount, error: enrollmentsError } = await supabase
              .from("enrollments")
              .select("*", { count: "exact", head: true })
              .eq("course_id", course.id)

            if (enrollmentsError) {
              console.warn(`Error fetching enrollments for course ${course.id}:`, enrollmentsError)
            }

            // Get modules count
            const { count: modulesCount, error: modulesError } = await supabase
              .from("modules")
              .select("*", { count: "exact", head: true })
              .eq("course_id", course.id)

            if (modulesError) {
              console.warn(`Error fetching modules for course ${course.id}:`, modulesError)
            }

            return {
              ...course,
              rating: course.average_rating || null,
              students_count: enrollmentsCount || 0,
              modules_count: modulesCount || 0
            }
          } catch (courseError) {
            console.error(`Error processing course ${course.id}:`, courseError)
            // Return course with default values if there's an error
            return {
              ...course,
              rating: null,
              students_count: 0,
              modules_count: 0
            }
          }
        })
      )

      setCourses(coursesWithData)
    } catch (error) {
      console.error('Error fetching courses:', error)
      // Set empty array on error so UI shows "no courses" instead of loading forever
      setCourses([])
    } finally {
      setLoading(false)
    }
  }

  const filterCourses = () => {
    let filtered = [...courses]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Category filter (only if category field exists)
    if (filterCategory !== 'all') {
      filtered = filtered.filter(course => course.category === filterCategory)
    }

    // Difficulty filter (only if difficulty field exists)
    if (filterDifficulty !== 'all') {
      filtered = filtered.filter(course => course.difficulty === filterDifficulty)
    }

    // Price filter
    if (filterPrice !== 'all') {
      if (filterPrice === 'free') {
        filtered = filtered.filter(course => course.price === 0)
      } else if (filterPrice === 'paid') {
        filtered = filtered.filter(course => course.price > 0)
      } else if (filterPrice === 'under50') {
        filtered = filtered.filter(course => course.price > 0 && course.price < 50)
      } else if (filterPrice === 'over50') {
        filtered = filtered.filter(course => course.price >= 50)
      }
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
      case 'price_low':
        filtered.sort((a, b) => a.price - b.price)
        break
      case 'price_high':
        filtered.sort((a, b) => b.price - a.price)
        break
      case 'rating':
        filtered.sort((a, b) => {
          const ratingA = (a as any).average_rating ?? a.rating ?? 0
          const ratingB = (b as any).average_rating ?? b.rating ?? 0
          return ratingB - ratingA
        })
        break
      case 'students':
        filtered.sort((a, b) => (b.students_count || 0) - (a.students_count || 0))
        break
    }

    setFilteredCourses(filtered)
  }

  const categories = ['Web Development', 'Data Science', 'Design', 'Business', 'Marketing', 'Photography']
  const difficulties = ['Beginner', 'Intermediate', 'Advanced']

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <FeatureGuard feature="courses">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 p-8 md:p-12 mb-8">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-white">
                  Explore Courses
                </h1>
                <p className="text-white/90 text-lg mt-2">
                  Discover world-class learning experiences from expert instructors
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <TrendingUp className="w-6 h-6 text-white" />
                  <div>
                    <div className="text-2xl font-bold text-white">{courses.length}+</div>
                    <div className="text-white/80 text-sm">Courses Available</div>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <Users className="w-6 h-6 text-white" />
                  <div>
                    <div className="text-2xl font-bold text-white">10K+</div>
                    <div className="text-white/80 text-sm">Students Learning</div>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <Award className="w-6 h-6 text-white" />
                  <div>
                    <div className="text-2xl font-bold text-white">4.8</div>
                    <div className="text-white/80 text-sm">Average Rating</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-8 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search courses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="price_low">Price: Low to High</SelectItem>
                <SelectItem value="price_high">Price: High to Low</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="students">Most Popular</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode */}
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            {/* Advanced Filters Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Difficulty
                  </label>
                  <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      {difficulties.map((difficulty) => (
                        <SelectItem key={difficulty} value={difficulty}>
                          {difficulty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Price
                  </label>
                  <Select value={filterPrice} onValueChange={setFilterPrice}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Prices" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Prices</SelectItem>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="under50">Under $50</SelectItem>
                      <SelectItem value="over50">$50 and above</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-gray-600 dark:text-gray-400">
            Showing {filteredCourses.length} of {courses.length} courses
          </div>
          <div className="flex items-center space-x-2">
            {searchTerm && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <span>Search: "{searchTerm}"</span>
                <button
                  onClick={() => setSearchTerm('')}
                  className="ml-1 hover:text-red-500"
                >
                  ×
                </button>
              </Badge>
            )}
            {filterCategory !== 'all' && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <span>Category: {filterCategory}</span>
                <button
                  onClick={() => setFilterCategory('all')}
                  className="ml-1 hover:text-red-500"
                >
                  ×
                </button>
              </Badge>
            )}
          </div>
        </div>

        {/* Courses Grid/List */}
        {filteredCourses.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No courses found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Try adjusting your search terms or filters
            </p>
            <Button onClick={() => {
              setSearchTerm('')
              setFilterCategory('all')
              setFilterDifficulty('all')
              setFilterPrice('all')
            }}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
            : "space-y-4"
          }>
            {filteredCourses.map((course) => (
              <CourseCard key={course.id} course={course} viewMode={viewMode} />
            ))}
          </div>
        )}
        </div>
      </div>
    </FeatureGuard>
  )
}

function CourseCard({ course, viewMode }: { course: Course; viewMode: 'grid' | 'list' }) {
  if (viewMode === 'list') {
    return (
      <Card className="hover:shadow-lg transition-shadow">
        <div className="flex">
          <div className="w-48 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-l-lg flex items-center justify-center">
            {course.thumbnail_url ? (
              <img
                src={course.thumbnail_url}
                alt={course.title}
                className="w-full h-full object-cover rounded-l-lg"
              />
            ) : (
              <BookOpen className="w-12 h-12 text-white" />
            )}
          </div>
          <div className="flex-1 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {course.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {course.description}
                </p>
                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                  {course.rating && (
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span>{course.rating.toFixed(1)}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{course.students_count || 0}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <PlayCircle className="w-4 h-4" />
                    <span>{course.modules_count || 0} modules</span>
                  </div>
                  {course.duration && (
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{course.duration}h</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="ml-6 text-right">
                <div className="text-2xl font-bold text-blue-600 mb-2">
                  {course.price === 0 ? 'Free' : `$${course.price}`}
                </div>
                <Button asChild>
                  <Link href={`/courses/${course.id}`}>
                    View Course
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-105">
      <div className="relative">
        <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 rounded-t-lg overflow-hidden">
          {course.thumbnail_url ? (
            <img
              src={course.thumbnail_url}
              alt={course.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen className="w-16 h-16 text-white" />
            </div>
          )}
        </div>
        {course.category && (
          <Badge className="absolute top-3 left-3 bg-white/90 text-gray-800">
            {course.category}
          </Badge>
        )}
        {course.difficulty && (
          <Badge variant="secondary" className="absolute top-3 right-3">
            {course.difficulty}
          </Badge>
        )}
      </div>

      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
          {course.title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
          {course.description}
        </p>

        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
          {course.rating && (
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span>{course.rating.toFixed(1)}</span>
            </div>
          )}
          <div className="flex items-center space-x-1">
            <Users className="w-4 h-4" />
            <span>{course.students_count || 0}</span>
          </div>
          <div className="flex items-center space-x-1">
            <PlayCircle className="w-4 h-4" />
            <span>{course.modules_count || 0}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold text-blue-600">
            {course.price === 0 ? 'Free' : `$${course.price}`}
          </div>
          <Button asChild>
            <Link href={`/courses/${course.id}`}>
              Enroll Now
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}