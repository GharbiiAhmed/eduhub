"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from '@/i18n/routing'
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/lib/hooks/use-auth"
import { LoadingSpinner } from "@/components/loading-spinner"
import { FormError } from "@/components/form-error"
import { FormSuccess } from "@/components/form-success"
import { ArrowLeft, BookOpen } from "lucide-react"
import { Link } from '@/i18n/routing'
import { CourseAIAnalyzer } from "@/components/course-ai-analyzer"
import { useTranslations } from 'next-intl'

export default function CreateCoursePage() {
  const t = useTranslations()
  const tCommon = useTranslations('common')

  const router = useRouter()
  const { user, loading } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "0",
    category: "programming",
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto pt-20">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <FormError error={new Error(t('mustBeLoggedIn'))} />
            <Link href="/auth/login">
              <Button className="mt-4 w-full">{tCommon('login')}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setIsSubmitting(true)

    try {
      if (!formData.title.trim()) {
        throw new Error(t('titleRequired'))
      }
      if (!formData.description.trim()) {
        throw new Error(t('descriptionRequired'))
      }

      const supabase = createClient()
      const price = Number.parseFloat(formData.price) || 0

      const { data, error: insertError } = await supabase
        .from("courses")
        .insert([
          {
            title: formData.title,
            description: formData.description,
            price: price,
            category: formData.category,
            instructor_id: user.id,
            status: "draft",
          },
        ])
        .select()
        .single()

      if (insertError) throw insertError

      setSuccess(true)
      setTimeout(() => {
        router.push(`/instructor/courses/${data.id}`)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failedToCreateCourse'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-6">
      <Link
        href="/instructor/dashboard"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {tCommon('back')} {tCommon('dashboard')}
      </Link>

      <div className="space-y-4 sm:space-y-6 md:space-y-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold">{t('createNewCourse')}</h1>
          </div>
          <p className="text-muted-foreground">{t('shareKnowledge')}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('courseInformation')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && <FormError error={new Error(error)} />}
              {success && <FormSuccess message={t('courseCreatedSuccess')} />}

              <div className="space-y-2">
                <label className="text-sm font-semibold">{t('courseTitle')}</label>
                <Input
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder={t('courseTitlePlaceholder')}
                  disabled={isSubmitting}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">{t('description')}</label>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder={t('descriptionPlaceholder')}
                  disabled={isSubmitting}
                  rows={5}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">{t('price')} ($)</label>
                  <Input
                    name="price"
                    type="number"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    disabled={isSubmitting}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">{t('category')}</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="w-full h-11 px-3 rounded-md border border-input bg-background text-foreground"
                  >
                    <option value="programming">{t('programming')}</option>
                    <option value="design">{t('design')}</option>
                    <option value="business">{t('business')}</option>
                    <option value="marketing">{t('marketing')}</option>
                    <option value="other">{tCommon('other')}</option>
                  </select>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 bg-gradient-to-r from-primary to-secondary hover:shadow-lg hover:shadow-primary/30 text-primary-foreground font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner />
                    <span className="ml-2">{t('creatingCourse')}</span>
                  </>
                ) : (
                  t('createCourse')
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {success && (
        <div className="mt-8">
          <CourseAIAnalyzer
            courseData={{
              title: formData.title,
              description: formData.description,
              price: Number.parseFloat(formData.price) || 0,
              category: formData.category,
            }}
          />
        </div>
      )}
    </div>
  )
}
