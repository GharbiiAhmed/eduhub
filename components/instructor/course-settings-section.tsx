"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { useState, useEffect } from "react"
import { useTranslations } from 'next-intl'
import { FileUpload } from "@/components/instructor/file-upload"

interface Course {
  id: string
  title: string
  description: string
  price: number
  status: string
  thumbnail_url?: string | null
  subscription_enabled?: boolean
  monthly_price?: number
  yearly_price?: number
  subscription_type?: 'one_time' | 'subscription' | 'both'
}

export default function CourseSettingsSection({ course }: { course: Course }) {
  const t = useTranslations('courses')
  const tCommon = useTranslations('common')
  const [title, setTitle] = useState(course.title)
  const [description, setDescription] = useState(course.description || "")
  const [price, setPrice] = useState(course.price.toString())
  const [status, setStatus] = useState(course.status)
  const [thumbnailUrl, setThumbnailUrl] = useState(course.thumbnail_url || "")
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(course.subscription_enabled || false)
  const [monthlyPrice, setMonthlyPrice] = useState(course.monthly_price?.toString() || "0")
  const [yearlyPrice, setYearlyPrice] = useState(course.yearly_price?.toString() || "0")
  const [subscriptionType, setSubscriptionType] = useState(course.subscription_type || 'one_time')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Fetch latest course data
  useEffect(() => {
    const fetchCourse = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("courses")
        .select("*")
        .eq("id", course.id)
        .single()

      if (data) {
        setSubscriptionEnabled(data.subscription_enabled || false)
        setMonthlyPrice(data.monthly_price?.toString() || "0")
        setYearlyPrice(data.yearly_price?.toString() || "0")
        setSubscriptionType(data.subscription_type || 'one_time')
      }
    }
    fetchCourse()
  }, [course.id])

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const updateData: any = {
        title,
        description,
        price: Number.parseFloat(price),
        status,
        thumbnail_url: thumbnailUrl || null,
        subscription_enabled: subscriptionEnabled,
        subscription_type: subscriptionType,
      }

      // Only include subscription prices if subscription is enabled
      if (subscriptionEnabled) {
        updateData.monthly_price = Number.parseFloat(monthlyPrice) || 0
        updateData.yearly_price = Number.parseFloat(yearlyPrice) || 0
      } else {
        // Clear subscription prices if disabled
        updateData.monthly_price = 0
        updateData.yearly_price = 0
      }

      const { error: updateError } = await supabase
        .from("courses")
        .update(updateData)
        .eq("id", course.id)

      if (updateError) throw updateError

      // If course was just published, notify enrolled students
      if (status === 'published' && course.status !== 'published') {
        try {
          const { data: enrollments } = await supabase
            .from('enrollments')
            .select('student_id')
            .eq('course_id', course.id)

          if (enrollments && enrollments.length > 0) {
            const studentIds = enrollments.map(e => e.student_id)
            
            // Send email notifications to enrolled students
            try {
              await fetch('/api/courses/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  courseId: course.id,
                  courseTitle: title
                })
              }).catch(err => console.error('Failed to send course published emails:', err))
            } catch (emailError) {
              console.error('Error sending course published emails:', emailError)
            }

            // Create in-app notifications
            await fetch('/api/notifications/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userIds: studentIds,
                type: 'course_published',
                title: 'New Course Available',
                message: `The course "${title}" is now available for you to start learning!`,
                link: `/student/courses/${course.id}`,
                relatedId: course.id,
                relatedType: 'course'
              })
            }).catch(err => console.error('Failed to create notifications:', err))
          }
        } catch (err) {
          console.error('Error creating course published notifications:', err)
        }
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('anErrorOccurred'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('courseSettings')}</CardTitle>
        <CardDescription>{t('updateYourCourseInformation')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleUpdateCourse} className="space-y-6">
          <div className="grid gap-2">
            <Label htmlFor="title">{t('courseTitle')}</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">{tCommon('description')}</Label>
            <Textarea id="description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="price">{t('oneTimePriceUsd')}</Label>
            <Input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{t('setToZeroForFreeCourse')}</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="status">{tCommon('status')}</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">{tCommon('draft')}</SelectItem>
                <SelectItem value="published">{tCommon('published')}</SelectItem>
                <SelectItem value="archived">{t('archived')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <FileUpload
            bucket="course-thumbnails"
            folder={`course-${course.id}`}
            type="image"
            label={t('courseThumbnail')}
            description={t('uploadThumbnailDescription')}
            maxSize={5}
            currentUrl={thumbnailUrl}
            onUploadComplete={(url) => setThumbnailUrl(url)}
          />

          {/* Subscription Settings */}
          <div className="border-t pt-6 space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="subscription_enabled"
                checked={subscriptionEnabled}
                onCheckedChange={(checked) => setSubscriptionEnabled(checked as boolean)}
              />
              <Label htmlFor="subscription_enabled" className="text-base font-semibold cursor-pointer">
                {t('enableSubscriptionPricing')}
              </Label>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('allowStudentsToPayMonthlyOrYearly')}
            </p>

            {subscriptionEnabled && (
              <div className="space-y-4 pl-6 border-l-2 border-blue-200 dark:border-blue-800">
                <div className="grid gap-2">
                  <Label htmlFor="subscription_type">{t('paymentOptions')}</Label>
                  <Select value={subscriptionType} onValueChange={setSubscriptionType}>
                    <SelectTrigger id="subscription_type">
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
                      value={monthlyPrice}
                      onChange={(e) => setMonthlyPrice(e.target.value)}
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
                      value={yearlyPrice}
                      onChange={(e) => setYearlyPrice(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('recurringYearlyPayment')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-green-600">{t('courseUpdatedSuccessfully')}</p>}

          <Button type="submit" disabled={isLoading}>
            {isLoading ? t('saving') : t('saveChanges')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
