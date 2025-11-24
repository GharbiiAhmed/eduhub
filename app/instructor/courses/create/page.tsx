"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { 
  BookOpen, 
  ArrowLeft, 
  Upload, 
  DollarSign, 
  Tag, 
  Clock, 
  Users, 
  Target,
  CheckCircle,
  AlertCircle,
  Zap,
  Sparkles,
  CreditCard
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"

export default function CreateCoursePage() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "0",
    category: "programming",
    difficulty: "beginner",
    estimatedDuration: "",
    language: "english",
    subscriptionEnabled: false,
    subscriptionType: "one_time" as 'one_time' | 'subscription' | 'both',
    monthlyPrice: "0",
    yearlyPrice: "0"
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const categories = [
    { value: "programming", label: "Programming & Development" },
    { value: "design", label: "Design & Creative" },
    { value: "business", label: "Business & Entrepreneurship" },
    { value: "marketing", label: "Marketing & Sales" },
    { value: "data", label: "Data Science & Analytics" },
    { value: "ai", label: "AI & Machine Learning" },
    { value: "photography", label: "Photography & Video" },
    { value: "music", label: "Music & Audio" },
    { value: "health", label: "Health & Fitness" },
    { value: "language", label: "Language Learning" },
    { value: "other", label: "Other" }
  ]

  const difficulties = [
    { value: "beginner", label: "Beginner", description: "No prior experience required" },
    { value: "intermediate", label: "Intermediate", description: "Some experience recommended" },
    { value: "advanced", label: "Advanced", description: "Strong foundation required" }
  ]

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error("Not authenticated")

      // Validation
      if (!formData.title.trim()) {
        throw new Error("Course title is required")
      }
      if (!formData.description.trim()) {
        throw new Error("Course description is required")
      }

      // Build insert data - start with required fields only
      // Build insert data - ONLY include fields that exist in the database schema
      // Based on schema: instructor_id (NOT NULL), title (NOT NULL), description, price, status (NOT NULL)
      const insertData: any = {
        instructor_id: user.id,
        title: formData.title.trim(),
        status: "draft",
        price: Number.parseFloat(formData.price) || 0,
      }

      // Add description if provided (optional in schema)
      if (formData.description.trim()) {
        insertData.description = formData.description.trim()
      }

      // DO NOT include these fields - they don't exist in the base schema:
      // - category (doesn't exist - causes PGRST204 error)
      // - difficulty (doesn't exist)
      // - estimated_duration (doesn't exist)
      // - language (doesn't exist)
      
      // Only include subscription fields if the migration script was run
      try {
        const validSubscriptionTypes = ['one_time', 'subscription', 'both']
        const subscriptionType = validSubscriptionTypes.includes(formData.subscriptionType) 
          ? formData.subscriptionType 
          : 'one_time'
        
        insertData.subscription_enabled = formData.subscriptionEnabled || false
        insertData.subscription_type = subscriptionType
        insertData.monthly_price = formData.subscriptionEnabled 
          ? (Number.parseFloat(formData.monthlyPrice) || 0)
          : 0
        insertData.yearly_price = formData.subscriptionEnabled
          ? (Number.parseFloat(formData.yearlyPrice) || 0)
          : 0
      } catch (fieldError) {
        console.warn("Subscription fields may not exist, skipping:", fieldError)
      }

      console.log("Attempting to insert course:", insertData)

      const { data, error: insertError } = await supabase
        .from("courses")
        .insert(insertData)
        .select()
        .single()

      if (insertError) {
        console.error("Course creation error:", {
          error: insertError,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code,
          insertData: insertData
        })
        throw new Error(insertError.message || insertError.details || "Failed to create course")
      }

      setSuccess(true)
      setTimeout(() => {
        router.push(`/instructor/courses/${data.id}`)
      }, 2000)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/instructor/dashboard"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                Create New Course
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Share your knowledge and start teaching today
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-blue-600" />
                  Course Information
                </CardTitle>
                <CardDescription>
                  Fill in the details about your course
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateCourse} className="space-y-6">
                  {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="flex items-center">
                        <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                        <span className="text-red-800 dark:text-red-200">{error}</span>
                      </div>
                    </div>
                  )}

                  {success && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                        <span className="text-green-800 dark:text-green-200">
                          Course created successfully! Redirecting to course editor...
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Course Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-semibold">
                      Course Title *
                    </Label>
                    <Input
                      id="title"
                      placeholder="e.g., Complete Web Development Bootcamp"
                      required
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      disabled={isLoading}
                      className="h-11"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Choose a clear, descriptive title that tells students what they'll learn
                    </p>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-semibold">
                      Course Description *
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Describe what students will learn, what projects they'll build, and what skills they'll gain..."
                      rows={6}
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      disabled={isLoading}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Write a compelling description that explains the value and outcomes of your course
                    </p>
                  </div>

                  {/* Course Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Price */}
                    <div className="space-y-2">
                      <Label htmlFor="price" className="text-sm font-semibold flex items-center">
                        <DollarSign className="w-4 h-4 mr-1" />
                        One-Time Price (USD)
                      </Label>
                      <Input
                        id="price"
                        type="number"
                        placeholder="0"
                        min="0"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => handleInputChange('price', e.target.value)}
                        disabled={isLoading}
                        className="h-11"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Set to $0 for a free course
                      </p>
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold flex items-center">
                        <Tag className="w-4 h-4 mr-1" />
                        Category
                      </Label>
                      <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.value} value={category.value}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Difficulty */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold flex items-center">
                        <Target className="w-4 h-4 mr-1" />
                        Difficulty Level
                      </Label>
                      <Select value={formData.difficulty} onValueChange={(value) => handleInputChange('difficulty', value)}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                          {difficulties.map((difficulty) => (
                            <SelectItem key={difficulty.value} value={difficulty.value}>
                              <div>
                                <div className="font-medium">{difficulty.label}</div>
                                <div className="text-xs text-gray-500">{difficulty.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Estimated Duration */}
                    <div className="space-y-2">
                      <Label htmlFor="duration" className="text-sm font-semibold flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        Estimated Duration
                      </Label>
                      <Input
                        id="duration"
                        placeholder="e.g., 20 hours"
                        value={formData.estimatedDuration}
                        onChange={(e) => handleInputChange('estimatedDuration', e.target.value)}
                        disabled={isLoading}
                        className="h-11"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        How long will it take to complete?
                      </p>
                    </div>
                  </div>

                  {/* Language */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Course Language</Label>
                    <Select value={formData.language} onValueChange={(value) => handleInputChange('language', value)}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="english">English</SelectItem>
                        <SelectItem value="spanish">Spanish</SelectItem>
                        <SelectItem value="french">French</SelectItem>
                        <SelectItem value="german">German</SelectItem>
                        <SelectItem value="chinese">Chinese</SelectItem>
                        <SelectItem value="japanese">Japanese</SelectItem>
                        <SelectItem value="arabic">Arabic</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Subscription Settings */}
                  <div className="border-t pt-6 space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="subscription_enabled"
                        checked={formData.subscriptionEnabled}
                        onCheckedChange={(checked) => handleInputChange('subscriptionEnabled', checked as boolean)}
                      />
                      <Label htmlFor="subscription_enabled" className="text-base font-semibold cursor-pointer flex items-center">
                        <CreditCard className="w-4 h-4 mr-2" />
                        Enable Subscription Pricing
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Allow students to pay monthly or yearly instead of a one-time payment
                    </p>

                    {formData.subscriptionEnabled && (
                      <div className="space-y-4 pl-6 border-l-2 border-blue-200 dark:border-blue-800">
                        <div className="grid gap-2">
                          <Label htmlFor="subscription_type">Payment Options</Label>
                          <Select 
                            value={formData.subscriptionType} 
                            onValueChange={(value: 'one_time' | 'subscription' | 'both') => handleInputChange('subscriptionType', value)}
                          >
                            <SelectTrigger id="subscription_type" className="h-11">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="both">One-Time + Subscription</SelectItem>
                              <SelectItem value="subscription">Subscription Only</SelectItem>
                              <SelectItem value="one_time">One-Time Only</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Choose whether to offer one-time payment, subscription, or both
                          </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="grid gap-2">
                            <Label htmlFor="monthly_price">Monthly Price (USD)</Label>
                            <Input
                              id="monthly_price"
                              type="number"
                              min="0"
                              step="0.01"
                              value={formData.monthlyPrice}
                              onChange={(e) => handleInputChange('monthlyPrice', e.target.value)}
                              disabled={isLoading}
                              className="h-11"
                            />
                            <p className="text-xs text-muted-foreground">Recurring monthly payment</p>
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor="yearly_price">Yearly Price (USD)</Label>
                            <Input
                              id="yearly_price"
                              type="number"
                              min="0"
                              step="0.01"
                              value={formData.yearlyPrice}
                              onChange={(e) => handleInputChange('yearlyPrice', e.target.value)}
                              disabled={isLoading}
                              className="h-11"
                            />
                            <p className="text-xs text-muted-foreground">
                              Recurring yearly payment (typically 10 months price for 2 months free)
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-6">
                    <Button
                      type="submit"
                      disabled={isLoading || success}
                      className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg hover:shadow-blue-600/30 text-white font-semibold"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Creating Course...
                        </>
                      ) : success ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Course Created!
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Create Course
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2 text-green-600" />
                  Course Creation Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 text-xs font-semibold">1</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Clear Title</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Use specific, descriptive titles that clearly communicate the course content
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-green-600 text-xs font-semibold">2</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Compelling Description</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Focus on outcomes and benefits students will gain from taking your course
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-purple-600 text-xs font-semibold">3</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Right Pricing</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Research similar courses and price competitively based on your content value
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-orange-600 text-xs font-semibold">4</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Quality Content</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Plan your curriculum carefully and create engaging, practical lessons
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Next Steps</h4>
                  <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                    <p>• Add course modules and lessons</p>
                    <p>• Upload course materials</p>
                    <p>• Create quizzes and assignments</p>
                    <p>• Set up course settings</p>
                    <p>• Preview and publish</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}