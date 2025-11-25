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
import { useRouter } from "next/navigation"
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
import Link from "next/link"
import { FileUpload } from "@/components/instructor/file-upload"

export default function CreateBookPage() {
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
    { value: "fiction", label: "Fiction" },
    { value: "non-fiction", label: "Non-Fiction" },
    { value: "other", label: "Other" }
  ]

  const languages = [
    { value: "english", label: "English" },
    { value: "spanish", label: "Spanish" },
    { value: "french", label: "French" },
    { value: "german", label: "German" },
    { value: "chinese", label: "Chinese" },
    { value: "japanese", label: "Japanese" },
    { value: "arabic", label: "Arabic" },
    { value: "other", label: "Other" }
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
            Back to Books
          </Link>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                Add New Book
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Share your knowledge through digital and physical books
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
                  <Sparkles className="w-5 h-5 mr-2 text-green-600" />
                  Book Information
                </CardTitle>
                <CardDescription>
                  Fill in the details about your book
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
                          Book created successfully! Redirecting to book editor...
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Basic Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Title */}
                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="title" className="text-sm font-semibold">
                          Book Title *
                        </Label>
                        <Input
                          id="title"
                          placeholder="e.g., Complete Guide to Web Development"
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
                          Author *
                        </Label>
                        <Input
                          id="author"
                          placeholder="e.g., John Doe"
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
                          Publisher
                        </Label>
                        <Input
                          id="publisher"
                          placeholder="e.g., Tech Publishing House"
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
                        Description *
                      </Label>
                      <Textarea
                        id="description"
                        placeholder="Describe your book, what readers will learn, and why it's valuable..."
                        rows={5}
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Book Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Book Details</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* ISBN */}
                      <div className="space-y-2">
                        <Label htmlFor="isbn" className="text-sm font-semibold">
                          ISBN
                        </Label>
                        <Input
                          id="isbn"
                          placeholder="e.g., 978-3-16-148410-0"
                          value={formData.isbn}
                          onChange={(e) => handleInputChange('isbn', e.target.value)}
                          disabled={isLoading}
                          className="h-11"
                        />
                      </div>

                      {/* Pages */}
                      <div className="space-y-2">
                        <Label htmlFor="pages" className="text-sm font-semibold">
                          Pages
                        </Label>
                        <Input
                          id="pages"
                          type="number"
                          placeholder="e.g., 300"
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
                          Publication Year
                        </Label>
                        <Input
                          id="year"
                          type="number"
                          placeholder="e.g., 2024"
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

                      {/* Language */}
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Language</Label>
                        <Select value={formData.language} onValueChange={(value) => handleInputChange('language', value)}>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select language" />
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
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Pricing & Availability</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="price" className="text-sm font-semibold flex items-center">
                        <DollarSign className="w-4 h-4 mr-1" />
                        One-Time Price (USD) *
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
                        Set to $0 for a free book
                      </p>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Availability</Label>
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
                              Physical Book Available
                            </Label>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Students can purchase physical copies
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
                              Digital (PDF) Available
                            </Label>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Students can download PDF version
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
                  </div>

                  {/* Media Uploads */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Media & Resources</h3>
                    
                    <div className="space-y-6">
                      {/* Cover Image Upload */}
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold flex items-center">
                          <Image className="w-4 h-4 mr-1" />
                          Cover Image
                        </Label>
                        <FileUpload
                          bucket="book-covers"
                          type="image"
                          label="Upload Cover Image"
                          description="Upload a book cover image (JPG, PNG, max 10MB)"
                          maxSize={10}
                          currentUrl={formData.coverUrl}
                          onUploadComplete={(url) => handleInputChange('coverUrl', url)}
                        />
                        <div className="text-sm text-muted-foreground">
                          Or enter image URL
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
                            PDF File
                          </Label>
                          <FileUpload
                            bucket="book-pdfs"
                            type="pdf"
                            label="Upload PDF File"
                            description="Upload the book PDF file (max 100MB)"
                            maxSize={100}
                            currentUrl={formData.pdfUrl}
                            onUploadComplete={(url) => handleInputChange('pdfUrl', url)}
                          />
                          <div className="text-sm text-muted-foreground">
                            Or enter PDF URL
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
                          Creating Book...
                        </>
                      ) : success ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Book Created!
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Create Book
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
                  Book Creation Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-green-600 text-xs font-semibold">1</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Compelling Title</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Use clear, descriptive titles that communicate the book's value
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 text-xs font-semibold">2</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Detailed Description</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Explain what readers will learn and why your book is valuable
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-purple-600 text-xs font-semibold">3</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Quality Content</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Ensure your book provides real value and practical knowledge
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-orange-600 text-xs font-semibold">4</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Professional Presentation</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Use high-quality cover images and well-formatted content
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Next Steps</h4>
                  <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                    <p>• Upload book cover image</p>
                    <p>• Add PDF file for digital version</p>
                    <p>• Set up pricing and availability</p>
                    <p>• Preview book listing</p>
                    <p>• Publish to marketplace</p>
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