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
import { FileUpload } from "@/components/instructor/file-upload"

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
              <Label>{t('coverImage')}</Label>
              <FileUpload
                bucket="book-covers"
                folder={`book-${bookId}`}
                type="image"
                label={t('uploadCoverImage')}
                description={t('uploadBookCoverImage')}
                maxSize={10}
                currentUrl={coverUrl}
                onUploadComplete={(url) => setCoverUrl(url)}
              />
              <div className="text-sm text-muted-foreground">
                {t('orEnterImageUrl')}
              </div>
              <Input
                id="coverUrl"
                placeholder={t('urlToBookCoverImage')}
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
              />
            </div>

            {digitalAvailable && (
              <div className="grid gap-2">
                <Label>{t('pdfFile')}</Label>
                <FileUpload
                  bucket="book-pdfs"
                  folder={`book-${bookId}`}
                  type="pdf"
                  label={t('uploadPdfFile')}
                  description={t('uploadBookPdfFile')}
                  maxSize={100}
                  currentUrl={pdfUrl}
                  onUploadComplete={(url) => setPdfUrl(url)}
                />
                <div className="text-sm text-muted-foreground">
                  {t('orEnterPdfUrl')}
                </div>
                <Input
                  id="pdfUrl"
                  placeholder={t('urlToPdfFile')}
                  value={pdfUrl}
                  onChange={(e) => setPdfUrl(e.target.value)}
                />
              </div>
            )}

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

      {/* Shipments Management */}
      {(physicalAvailable || book?.physical_available) && (
        <ShipmentsManager bookId={bookId} />
      )}
    </div>
  )
}

// Shipments Management Component
function ShipmentsManager({ bookId }: { bookId: string }) {
  const [purchases, setPurchases] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingPurchase, setEditingPurchase] = useState<string | null>(null)
  const [deliveryStatus, setDeliveryStatus] = useState("")
  const [trackingNumber, setTrackingNumber] = useState("")
  const [carrierName, setCarrierName] = useState("")
  const [shippingAddress, setShippingAddress] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchShipments()
  }, [bookId])

  const fetchShipments = async () => {
    try {
      const response = await fetch(`/api/instructor/books/${bookId}/shipments`)
      const data = await response.json()
      if (response.ok) {
        setPurchases(data.purchases || [])
      }
    } catch (error) {
      console.error("Error fetching shipments:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (purchase: any) => {
    setEditingPurchase(purchase.id)
    setDeliveryStatus(purchase.delivery_status || "pending")
    setTrackingNumber(purchase.tracking_number || "")
    setCarrierName(purchase.carrier_name || "")
    setShippingAddress(purchase.shipping_address || "")
  }

  const handleSave = async (purchaseId: string) => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/instructor/books/${bookId}/shipments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseId,
          deliveryStatus,
          trackingNumber: trackingNumber || null,
          carrierName: carrierName || null,
          shippingAddress: shippingAddress || null,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        await fetchShipments()
        setEditingPurchase(null)
        setTrackingNumber("")
        setCarrierName("")
        setShippingAddress("")
      } else {
        alert(data.error || "Failed to update shipment")
      }
    } catch (error) {
      console.error("Error updating shipment:", error)
      alert("Failed to update shipment")
    } finally {
      setIsSaving(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "shipped":
      case "in_transit":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "processing":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Physical Book Shipments</CardTitle>
          <CardDescription>Manage delivery status and tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Physical Book Shipments</CardTitle>
        <CardDescription>Manage delivery status and tracking for physical book orders</CardDescription>
      </CardHeader>
      <CardContent>
        {purchases.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No physical book purchases yet
          </p>
        ) : (
          <div className="space-y-4">
            {purchases.map((purchase: any) => (
              <div
                key={purchase.id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">
                        {purchase.profiles?.full_name || purchase.profiles?.email || "Unknown Student"}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(purchase.delivery_status || "pending")}`}>
                        {purchase.delivery_status || "pending"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Purchased: {purchase.purchased_at ? new Date(purchase.purchased_at).toLocaleDateString() : "N/A"}
                    </p>
                    {purchase.tracking_number && (
                      <p className="text-sm">
                        <span className="font-medium">Tracking:</span> {purchase.tracking_number}
                      </p>
                    )}
                    {purchase.carrier_name && (
                      <p className="text-sm">
                        <span className="font-medium">Carrier:</span> {purchase.carrier_name}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(purchase)}
                  >
                    {editingPurchase === purchase.id ? "Cancel" : "Update"}
                  </Button>
                </div>

                {editingPurchase === purchase.id && (
                  <div className="border-t pt-4 space-y-3 mt-3">
                    <div>
                      <Label>Delivery Status</Label>
                      <Select value={deliveryStatus} onValueChange={setDeliveryStatus}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="shipped">Shipped</SelectItem>
                          <SelectItem value="in_transit">In Transit</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Tracking Number</Label>
                      <Input
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        placeholder="Enter tracking number"
                      />
                    </div>
                    <div>
                      <Label>Carrier Name</Label>
                      <Input
                        value={carrierName}
                        onChange={(e) => setCarrierName(e.target.value)}
                        placeholder="e.g., DHL, FedEx, UPS"
                      />
                    </div>
                    <div>
                      <Label>Shipping Address</Label>
                      <Textarea
                        value={shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
                        placeholder="Enter shipping address"
                        rows={3}
                      />
                    </div>
                    <Button
                      onClick={() => handleSave(purchase.id)}
                      disabled={isSaving}
                      className="w-full"
                    >
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
