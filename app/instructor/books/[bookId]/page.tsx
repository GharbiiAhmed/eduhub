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
import { useRouter } from "next/navigation"
import { FileUpload } from "@/components/instructor/file-upload"

export default function BookDetailPage({ params }: { params: Promise<{ bookId: string }> }) {
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
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Edit Book</h1>
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Book Details</CardTitle>
          <CardDescription>Update your book information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveBook} className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="title">Book Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="author">Author</Label>
              <Input id="author" value={author} onChange={(e) => setAuthor(e.target.value)} required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="isbn">ISBN</Label>
              <Input id="isbn" value={isbn} onChange={(e) => setIsbn(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="price">One-Time Price (USD)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">Set to $0 for a free book</p>
            </div>

            <div className="grid gap-2">
              <Label>Cover Image</Label>
              <FileUpload
                bucket="book-covers"
                folder={`book-${bookId}`}
                type="image"
                label="Upload Cover Image"
                description="Upload a book cover image (JPG, PNG, max 10MB)"
                maxSize={10}
                currentUrl={coverUrl}
                onUploadComplete={(url) => setCoverUrl(url)}
              />
              <div className="text-sm text-muted-foreground">
                Or enter image URL
              </div>
              <Input
                id="coverUrl"
                placeholder="https://example.com/cover.jpg"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
              />
            </div>

            {digitalAvailable && (
              <div className="grid gap-2">
                <Label>PDF File</Label>
                <FileUpload
                  bucket="book-pdfs"
                  folder={`book-${bookId}`}
                  type="pdf"
                  label="Upload PDF File"
                  description="Upload the book PDF file (max 100MB)"
                  maxSize={100}
                  currentUrl={pdfUrl}
                  onUploadComplete={(url) => setPdfUrl(url)}
                />
                <div className="text-sm text-muted-foreground">
                  Or enter PDF URL
                </div>
                <Input
                  id="pdfUrl"
                  placeholder="https://example.com/book.pdf"
                  value={pdfUrl}
                  onChange={(e) => setPdfUrl(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-3">
              <Label>Availability</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="physical"
                  checked={physicalAvailable}
                  onCheckedChange={(checked) => setPhysicalAvailable(checked as boolean)}
                />
                <Label htmlFor="physical" className="font-normal cursor-pointer">
                  Physical Book Available
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="digital"
                  checked={digitalAvailable}
                  onCheckedChange={(checked) => setDigitalAvailable(checked as boolean)}
                />
                <Label htmlFor="digital" className="font-normal cursor-pointer">
                  Digital (PDF) Available
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
                  Enable Subscription Pricing
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Allow students to pay monthly or yearly instead of a one-time payment
              </p>

              {subscriptionEnabled && (
                <div className="space-y-4 pl-6 border-l-2 border-blue-200 dark:border-blue-800">
                  <div className="grid gap-2">
                    <Label htmlFor="subscription_type">Payment Options</Label>
                    <Select value={subscriptionType} onValueChange={(value: 'one_time' | 'subscription' | 'both') => setSubscriptionType(value)}>
                      <SelectTrigger id="subscription_type">
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
                        value={monthlyPrice}
                        onChange={(e) => setMonthlyPrice(e.target.value)}
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
                        value={yearlyPrice}
                        onChange={(e) => setYearlyPrice(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Recurring yearly payment (typically 10 months price for 2 months free)
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-4">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Book"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
