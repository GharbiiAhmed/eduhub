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
import { useRouter } from '@/i18n/routing'
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
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

export default function CreateCoursePage() {
  const t = useTranslations('courses')
  const tCommon = useTranslations('common')

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
    { value: "programming", label: t('programmingDevelopment') },
    { value: "design", label: t('designCreative') },
    { value: "business", label: t('businessEntrepreneurship') },
    { value: "marketing", label: t('marketingSales') },
    { value: "data", label: t('dataScienceAnalytics') },
    { value: "ai", label: t('aiMachineLearning') },
    { value: "photography", label: t('photographyVideo') },
    { value: "music", label: t('musicAudio') },
    { value: "health", label: t('healthFitness') },
    { value: "language", label: t('languageLearning') },
    { value: "other", label: tCommon('other') }
  ]

  const difficulties = [
    { value: "beginner", label: t('beginner'), description: t('noPriorExperienceRequired') },
    { value: "intermediate", label: t('intermediate'), description: t('someExperienceRecommended') },
    { value: "advanced", label: t('advanced'), description: t('strongFoundationRequired') }
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

      // Build insert data - start with absolutely required fields only
      // Based on schema: instructor_id (NOT NULL), title (NOT NULL), status (NOT NULL)
      const insertData: any = {
        instructor_id: user.id,
        title: formData.title.trim(),
        status: "draft",
      }

      // Add description if provided (optional in schema)
      if (formData.description.trim()) {
        insertData.description = formData.description.trim()
      }

      // Add price (has default 0, but include it)
      insertData.price = Number.parseFloat(formData.price) || 0

      // Try to add optional fields - if they don't exist in DB, Supabase will ignore them
      // But if they have CHECK constraints, we need to be careful
      try {
        if (formData.category) {
          insertData.category = formData.category
        }
        if (formData.difficulty) {
          insertData.difficulty = formData.difficulty
        }
        if (formData.estimatedDuration) {
          insertData.estimated_duration = formData.estimatedDuration
        }
        if (formData.language) {
          insertData.language = formData.language
        }

        // Subscription fields - check if columns exist first
        // If subscription_type has a CHECK constraint, make sure value is valid
        const validSubscriptionTypes = ['one_time', 'subscription', 'both']
        const subscriptionType = validSubscriptionTypes.includes(formData.subscriptionType) 
          ? formData.subscriptionType 
          : 'one_time'
        
        insertData.subscription_enabled = formData.subscriptionEnabled || false
        insertData.subscription_type = subscriptionType
        
        // Subscription prices
        insertData.monthly_price = formData.subscriptionEnabled 
          ? (Number.parseFloat(formData.monthlyPrice) || 0)
          : 0
        insertData.yearly_price = formData.subscriptionEnabled
          ? (Number.parseFloat(formData.yearlyPrice) || 0)
          : 0
      } catch (fieldError) {
        console.warn("Error adding optional fields, continuing with required fields only:", fieldError)
      }

      console.log("Attempting to insert course:", insertData)

      const { data, error: insertError } = await supabase
        .from("courses")
        .insert(insertData)
        .select()
        .single()

      if (insertError) {
        // Build detailed error message
        let errorMessage = insertError.message || "Failed to create course"
        
        if (insertError.details) {
          errorMessage += `\nDetails: ${insertError.details}`
        }
        if (insertError.hint) {
          errorMessage += `\nHint: ${insertError.hint}`
        }
        if (insertError.code) {
          errorMessage += `\nCode: ${insertError.code}`
        }
        
        console.error("Course creation error - Full details:", {
          error: insertError,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code,
          insertData: JSON.stringify(insertData, null, 2)
        })
        
        throw new Error(errorMessage)
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
            {t('backToDashboard')}
          </Link>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                {t('createNewCourse')}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {t('shareYourKnowledgeAndStartTeaching')}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-blue-600" />
                  {t('courseInformation')}
                </CardTitle>
                <CardDescription>
                  {t('fillInTheDetailsAboutYourCourse')}
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
                          {t('courseCreatedSuccessfully')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Course Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-semibold">
                      {t('courseTitle')} *
                    </Label>
                    <Input
                      id="title"
                      placeholder={t('completeWebDevelopmentBootcamp')}
                      required
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      disabled={isLoading}
                      className="h-11"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('chooseClearDescriptiveTitle')}
                    </p>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-semibold">
                      {t('courseDescription')} *
                    </Label>
                    <Textarea
                      id="description"
                      placeholder={t('describeWhatStudentsWillLearn')}
                      rows={6}
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      disabled={isLoading}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('writeCompellingDescription')}
                    </p>
                  </div>

                  {/* Course Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Price */}
                    <div className="space-y-2">
                      <Label htmlFor="price" className="text-sm font-semibold flex items-center">
                        <DollarSign className="w-4 h-4 mr-1" />
                        {t('oneTimePriceUsd')}
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
                        {t('setToZeroForFreeCourse')}
                      </p>
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold flex items-center">
                        <Tag className="w-4 h-4 mr-1" />
                        {t('category')}
                      </Label>
                      <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder={t('selectCategory')} />
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
                        {t('difficultyLevel')}
                      </Label>
                      <Select value={formData.difficulty} onValueChange={(value) => handleInputChange('difficulty', value)}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder={t('selectDifficulty')} />
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
                        {t('estimatedDuration')}
                      </Label>
                      <Input
                        id="duration"
                        placeholder={t('estimatedDurationPlaceholder')}
                        value={formData.estimatedDuration}
                        onChange={(e) => handleInputChange('estimatedDuration', e.target.value)}
                        disabled={isLoading}
                        className="h-11"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('howLongWillItTakeToComplete')}
                      </p>
                    </div>
                  </div>

                  {/* Language */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">{t('courseLanguage')}</Label>
                    <Select value={formData.language} onValueChange={(value) => handleInputChange('language', value)}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder={t('selectLanguage')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="english">{t('english')}</SelectItem>
                        <SelectItem value="spanish">{t('spanish')}</SelectItem>
                        <SelectItem value="french">{t('french')}</SelectItem>
                        <SelectItem value="german">{t('german')}</SelectItem>
                        <SelectItem value="chinese">{t('chinese')}</SelectItem>
                        <SelectItem value="japanese">{t('japanese')}</SelectItem>
                        <SelectItem value="arabic">{t('arabic')}</SelectItem>
                        <SelectItem value="other">{tCommon('other')}</SelectItem>
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
                        {t('enableSubscriptionPricing')}
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('allowStudentsToPayMonthlyOrYearly')}
                    </p>

                    {formData.subscriptionEnabled && (
                      <div className="space-y-4 pl-6 border-l-2 border-blue-200 dark:border-blue-800">
                        <div className="grid gap-2">
                          <Label htmlFor="subscription_type">{t('paymentOptions')}</Label>
                          <Select 
                            value={formData.subscriptionType} 
                            onValueChange={(value: 'one_time' | 'subscription' | 'both') => handleInputChange('subscriptionType', value)}
                          >
                            <SelectTrigger id="subscription_type" className="h-11">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="both">{t('oneTimePlusSubscription')}</SelectItem>
                              <SelectItem value="subscription">{t('subscriptionOnly')}</SelectItem>
                              <SelectItem value="one_time">{t('oneTimeOnly')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            {t('choosePaymentOptions')}
                          </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="grid gap-2">
                            <Label htmlFor="monthly_price">{t('monthlyPriceUsd')}</Label>
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
                            <p className="text-xs text-muted-foreground">{t('recurringMonthlyPayment')}</p>
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor="yearly_price">{t('yearlyPriceUsd')}</Label>
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
                              {t('recurringYearlyPayment')}
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
                          {t('creatingCourse')}
                        </>
                      ) : success ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {t('courseCreated')}
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          {t('createCourse')}
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
                  {t('courseCreationTips')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 text-xs font-semibold">1</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{t('clearTitle')}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {t('useSpecificDescriptiveTitles')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-green-600 text-xs font-semibold">2</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{t('compellingDescription')}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {t('focusOnOutcomesAndBenefits')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-purple-600 text-xs font-semibold">3</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{t('rightPricing')}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {t('researchSimilarCourses')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-orange-600 text-xs font-semibold">4</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{t('qualityContent')}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {t('planYourCurriculumCarefully')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('nextSteps')}</h4>
                  <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                    <p>• {t('addCourseModulesAndLessons')}</p>
                    <p>• {t('uploadCourseMaterials')}</p>
                    <p>• {t('createQuizzesAndAssignments')}</p>
                    <p>• {t('setUpCourseSettings')}</p>
                    <p>• {t('previewAndPublish')}</p>
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