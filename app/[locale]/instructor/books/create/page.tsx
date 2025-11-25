"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
  User, 
  FileText,
  Package,
  Download,
  CheckCircle,
  AlertCircle,
  Zap,
  Sparkles,
  Image,
  Link as LinkIcon,
  CreditCard
} from "lucide-react"
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { FileUpload } from "@/components/instructor/file-upload"

export default function CreateBookPage() {
  const t = useTranslations('books')
  const tCommon = useTranslations('common')

  const [formData, setFormData] = useState({
    title: "",
    author: "",
    description: "",
    isbn: "",
    price: "0",
    category: "programming",
    language: "english",
    pages: "",
    publicationYear: "",
    publisher: "",
    physicalAvailable: true,
    digitalAvailable: true,
    coverUrl: "",
    pdfUrl: "",
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
    { value: "fiction", label: t('fiction') },
    { value: "non-fiction", label: t('nonFiction') },
    { value: "other", label: tCommon('other') }
  ]

  const languages = [
    { value: "english", label: t('english') },
    { value: "spanish", label: t('spanish') },
    { value: "french", label: t('french') },
    { value: "german", label: t('german') },
    { value: "chinese", label: t('chinese') },
    { value: "japanese", label: t('japanese') },
    { value: "arabic", label: t('arabic') },
    { value: "other", label: tCommon('other') }
  ]

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleCreateBook = async (e: React.FormEvent) => {
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
        throw new Error("Book title is required")
      }
      if (!formData.author.trim()) {
        throw new Error("Author name is required")
      }
      if (!formData.description.trim()) {
        throw new Error("Book description is required")
      }

      const insertData: any = {
        instructor_id: user.id,
        title: formData.title.trim(),
        author: formData.author.trim(),
        description: formData.description.trim(),
        isbn: formData.isbn.trim() || null,
        price: Number.parseFloat(formData.price) || 0,
        // Note: category, language, pages, publication_year, and publisher 
        // are not in the database schema, so they are excluded
        physical_available: formData.physicalAvailable,
        digital_available: formData.digitalAvailable,
        cover_url: formData.coverUrl.trim() || null,
        pdf_url: formData.pdfUrl.trim() || null,
        subscription_enabled: formData.subscriptionEnabled,
        subscription_type: formData.subscriptionType,
      }

      // Only include subscription prices if subscription is enabled
      if (formData.subscriptionEnabled) {
        insertData.monthly_price = Number.parseFloat(formData.monthlyPrice) || 0
        insertData.yearly_price = Number.parseFloat(formData.yearlyPrice) || 0
      } else {
        insertData.monthly_price = 0
        insertData.yearly_price = 0
      }

      const { data, error: insertError } = await supabase
        .from("books")
        .insert(insertData)
        .select()
        .single()

      if (insertError) throw insertError

      setSuccess(true)
      setTimeout(() => {
        router.push(`/instructor/books/${data.id}`)
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
            href="/instructor/books"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {tCommon('backToBooks')}
          </Link>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                {t('addNewBook')}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {t('shareYourKnowledgeThroughBooks')}
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
                  <Sparkles className="w-5 h-5 mr-2 text-green-600" />
                  {t('bookInformation')}
                </CardTitle>
                <CardDescription>
                  {t('fillInTheDetailsAboutYourBook')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateBook} className="space-y-6">
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
                          {t('bookCreatedSuccessfully')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('basicInformation')}</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Title */}
                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="title" className="text-sm font-semibold">
                          {t('bookTitle')} *
                        </Label>
                        <Input
                          id="title"
                          placeholder={t('completeGuideToWebDevelopment')}
                          required
                          value={formData.title}
                          onChange={(e) => handleInputChange('title', e.target.value)}
                          disabled={isLoading}
                          className="h-11"
                        />
                      </div>

                      {/* Author */}
                      <div className="space-y-2">
                        <Label htmlFor="author" className="text-sm font-semibold flex items-center">
                          <User className="w-4 h-4 mr-1" />
                          {t('author')} *
                        </Label>
                        <Input
                          id="author"
                          placeholder={t('johnDoe')}
                          required
                          value={formData.author}
                          onChange={(e) => handleInputChange('author', e.target.value)}
                          disabled={isLoading}
                          className="h-11"
                        />
                      </div>

                      {/* Publisher */}
                      <div className="space-y-2">
                        <Label htmlFor="publisher" className="text-sm font-semibold">
                          {t('publisher')}
                        </Label>
                        <Input
                          id="publisher"
                          placeholder={t('techPublishingHouse')}
                          value={formData.publisher}
                          onChange={(e) => handleInputChange('publisher', e.target.value)}
                          disabled={isLoading}
                          className="h-11"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-sm font-semibold flex items-center">
                        <FileText className="w-4 h-4 mr-1" />
                        {t('description')} *
                      </Label>
                      <Textarea
                        id="description"
                        placeholder={t('describeYourBookWhatReadersWillLearn')}
                        rows={5}
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Book Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('bookDetails')}</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* ISBN */}
                      <div className="space-y-2">
                        <Label htmlFor="isbn" className="text-sm font-semibold">
                          {t('isbn')}
                        </Label>
                        <Input
                          id="isbn"
                          placeholder={t('isbnPlaceholder')}
                          value={formData.isbn}
                          onChange={(e) => handleInputChange('isbn', e.target.value)}
                          disabled={isLoading}
                          className="h-11"
                        />
                      </div>

                      {/* Pages */}
                      <div className="space-y-2">
                        <Label htmlFor="pages" className="text-sm font-semibold">
                          {t('pages')}
                        </Label>
                        <Input
                          id="pages"
                          type="number"
                          placeholder={t('pagesPlaceholder')}
                          min="1"
                          value={formData.pages}
                          onChange={(e) => handleInputChange('pages', e.target.value)}
                          disabled={isLoading}
                          className="h-11"
                        />
                      </div>

                      {/* Publication Year */}
                      <div className="space-y-2">
                        <Label htmlFor="year" className="text-sm font-semibold">
                          {t('publicationYear')}
                        </Label>
                        <Input
                          id="year"
                          type="number"
                          placeholder={t('publicationYearPlaceholder')}
                          min="1900"
                          max="2030"
                          value={formData.publicationYear}
                          onChange={(e) => handleInputChange('publicationYear', e.target.value)}
                          disabled={isLoading}
                          className="h-11"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                      {/* Language */}
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">{t('language')}</Label>
                        <Select value={formData.language} onValueChange={(value) => handleInputChange('language', value)}>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder={t('selectLanguage')} />
                          </SelectTrigger>
                          <SelectContent>
                            {languages.map((language) => (
                              <SelectItem key={language.value} value={language.value}>
                                {language.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Pricing & Availability */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('pricingAndAvailability')}</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="price" className="text-sm font-semibold flex items-center">
                        <DollarSign className="w-4 h-4 mr-1" />
                        {t('oneTimePrice')} *
                      </Label>
                      <Input
                        id="price"
                        type="number"
                        placeholder="0"
                        min="0"
                        step="0.01"
                        required
                        value={formData.price}
                        onChange={(e) => handleInputChange('price', e.target.value)}
                        disabled={isLoading}
                        className="h-11"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('setToZeroForFreeBook')}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">{t('availability')}</Label>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3 p-3 border rounded-lg">
                          <Checkbox
                            id="physical"
                            checked={formData.physicalAvailable}
                            onCheckedChange={(checked) => handleInputChange('physicalAvailable', checked as boolean)}
                            disabled={isLoading}
                          />
                          <div className="flex-1">
                            <Label htmlFor="physical" className="font-medium cursor-pointer flex items-center">
                              <Package className="w-4 h-4 mr-2" />
                              {t('physicalBookAvailable')}
                            </Label>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {t('studentsCanPurchasePhysicalCopies')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 border rounded-lg">
                          <Checkbox
                            id="digital"
                            checked={formData.digitalAvailable}
                            onCheckedChange={(checked) => handleInputChange('digitalAvailable', checked as boolean)}
                            disabled={isLoading}
                          />
                          <div className="flex-1">
                            <Label htmlFor="digital" className="font-medium cursor-pointer flex items-center">
                              <Download className="w-4 h-4 mr-2" />
                              {t('digitalPdfAvailable')}
                            </Label>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {t('studentsCanDownloadPdfVersion')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Subscription Settings */}
                    <div className="border-t pt-6 space-y-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="subscription_enabled"
                          checked={formData.subscriptionEnabled}
                          onCheckedChange={(checked) => handleInputChange('subscriptionEnabled', checked as boolean)}
                          disabled={isLoading}
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
                              <Label htmlFor="monthly_price">{t('monthlyPrice')}</Label>
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
                              <Label htmlFor="yearly_price">{t('yearlyPrice')}</Label>
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
                  </div>

                  {/* Media Uploads */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('mediaAndResources')}</h3>
                    
                    <div className="space-y-6">
                      {/* Cover Image Upload */}
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold flex items-center">
                          <Image className="w-4 h-4 mr-1" />
                          {t('coverImage')}
                        </Label>
                        <FileUpload
                          bucket="book-covers"
                          type="image"
                          label={t('uploadCoverImage')}
                          description={t('uploadBookCoverImage')}
                          maxSize={10}
                          currentUrl={formData.coverUrl}
                          onUploadComplete={(url) => handleInputChange('coverUrl', url)}
                        />
                        <div className="text-sm text-muted-foreground">
                          {t('orEnterImageUrl')}
                        </div>
                        <Input
                          id="coverUrl"
                          placeholder="https://example.com/book-cover.jpg"
                          value={formData.coverUrl}
                          onChange={(e) => handleInputChange('coverUrl', e.target.value)}
                          disabled={isLoading}
                          className="h-11"
                        />
                      </div>

                      {/* PDF Upload */}
                      {formData.digitalAvailable && (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold flex items-center">
                            <FileText className="w-4 h-4 mr-1" />
                            {t('pdfFile')}
                          </Label>
                          <FileUpload
                            bucket="book-pdfs"
                            type="pdf"
                            label={t('uploadPdfFile')}
                            description={t('uploadBookPdfFile')}
                            maxSize={100}
                            currentUrl={formData.pdfUrl}
                            onUploadComplete={(url) => handleInputChange('pdfUrl', url)}
                          />
                          <div className="text-sm text-muted-foreground">
                            {t('orEnterPdfUrl')}
                          </div>
                          <Input
                            id="pdfUrl"
                            placeholder="https://example.com/book.pdf"
                            value={formData.pdfUrl}
                            onChange={(e) => handleInputChange('pdfUrl', e.target.value)}
                            disabled={isLoading}
                            className="h-11"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-6">
                    <Button
                      type="submit"
                      disabled={isLoading || success}
                      className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:shadow-lg hover:shadow-green-600/30 text-white font-semibold"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {t('creatingBook')}
                        </>
                      ) : success ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {t('bookCreated')}
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          {t('createBook')}
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
                  <BookOpen className="w-5 h-5 mr-2 text-green-600" />
                  {t('bookCreationTips')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-green-600 text-xs font-semibold">1</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{t('compellingTitle')}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {t('useClearDescriptiveTitles')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 text-xs font-semibold">2</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{t('detailedDescription')}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {t('explainWhatReadersWillLearn')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-purple-600 text-xs font-semibold">3</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{t('qualityContent')}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {t('ensureBookProvidesValue')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-orange-600 text-xs font-semibold">4</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{t('professionalPresentation')}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {t('useHighQualityCoverImages')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('nextSteps')}</h4>
                  <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                    <p>• {t('uploadBookCoverImage')}</p>
                    <p>• {t('addPdfFileForDigitalVersion')}</p>
                    <p>• {t('setUpPricingAndAvailability')}</p>
                    <p>• {t('previewBookListing')}</p>
                    <p>• {t('publishToMarketplace')}</p>
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