"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useEffect, useState, use } from "react"
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

export default function BookDetailPage({ params }: { params: Promise<{ bookId: string }> }) {
  const t = useTranslations('books')
  const tCommon = useTranslations('common')
  const { bookId } = use(params)
  const [book, setBook] = useState<any>(null)
  const [title, setTitle] = useState("")
  const [author, setAuthor] = useState("")
  const [description, setDescription] = useState("")
  const [isbn, setIsbn] = useState("")
  const [price, setPrice] = useState("0")
  const [coverUrl, setCoverUrl] = useState("")
  const [pdfUrl, setPdfUrl] = useState("")
  const [physicalAvailable, setPhysicalAvailable] = useState(true)
  const [digitalAvailable, setDigitalAvailable] = useState(true)
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(false)
  const [monthlyPrice, setMonthlyPrice] = useState("0")
  const [yearlyPrice, setYearlyPrice] = useState("0")
  const [subscriptionType, setSubscriptionType] = useState<'one_time' | 'subscription' | 'both'>('one_time')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchBook = async () => {
      const supabase = createClient()
      const { data } = await supabase.from("books").select("*").eq("id", bookId).single()

      if (data) {
        setBook(data)
        setTitle(data.title)
        setAuthor(data.author)
        setDescription(data.description || "")
        setIsbn(data.isbn || "")
        setPrice(data.price.toString())
        setCoverUrl(data.cover_url || "")
        setPdfUrl(data.pdf_url || "")
        setPhysicalAvailable(data.physical_available)
        setDigitalAvailable(data.digital_available)
        setSubscriptionEnabled(data.subscription_enabled || false)
        setMonthlyPrice(data.monthly_price?.toString() || "0")
        setYearlyPrice(data.yearly_price?.toString() || "0")
        setSubscriptionType(data.subscription_type || 'one_time')
      }
      setIsLoading(false)
    }

    fetchBook()
  }, [bookId])

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsSaving(true)
    setError(null)

    try {
      const updateData: any = {
        title,
        author,
        description,
        isbn: isbn || null,
        price: Number.parseFloat(price),
        cover_url: coverUrl || null,
        pdf_url: pdfUrl || null,
        physical_available: physicalAvailable,
        digital_available: digitalAvailable,
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
        .from("books")
        .update(updateData)
        .eq("id", bookId)

      if (updateError) throw updateError

      router.back()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : tCommon('anErrorOccurred'))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div>{tCommon('loading')}</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('editBook')}</h1>
        <Button variant="outline" onClick={() => router.back()}>
          {tCommon('back')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('bookDetails')}</CardTitle>
          <CardDescription>{t('updateYourBookInformation')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveBook} className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="title">{t('bookTitle')}</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="author">{tCommon('author')}</Label>
              <Input id="author" value={author} onChange={(e) => setAuthor(e.target.value)} required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">{tCommon('description')}</Label>
              <Textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="isbn">{t('isbn')}</Label>
              <Input id="isbn" value={isbn} onChange={(e) => setIsbn(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="price">{t('oneTimePrice')}</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">{t('setToZeroForFreeBook')}</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="coverUrl">{t('coverImageUrl')}</Label>
              <Input
                id="coverUrl"
                placeholder={t('urlToBookCoverImage')}
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pdfUrl">{t('pdfDownloadUrl')}</Label>
              <Input
                id="pdfUrl"
                placeholder={t('urlToPdfFile')}
                value={pdfUrl}
                onChange={(e) => setPdfUrl(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <Label>{t('availability')}</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="physical"
                  checked={physicalAvailable}
                  onCheckedChange={(checked) => setPhysicalAvailable(checked as boolean)}
                />
                <Label htmlFor="physical" className="font-normal cursor-pointer">
                  {t('physicalBookAvailable')}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="digital"
                  checked={digitalAvailable}
                  onCheckedChange={(checked) => setDigitalAvailable(checked as boolean)}
                />
                <Label htmlFor="digital" className="font-normal cursor-pointer">
                  {t('digitalPdfAvailable')}
                </Label>
              </div>
            </div>

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
                    <Select value={subscriptionType} onValueChange={(value: 'one_time' | 'subscription' | 'both') => setSubscriptionType(value)}>
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
                      <Label htmlFor="monthly_price">{t('monthlyPrice')}</Label>
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
                      <Label htmlFor="yearly_price">{t('yearlyPrice')}</Label>
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

            <div className="flex gap-4">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? t('saving') : t('saveBook')}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                {tCommon('cancel')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
