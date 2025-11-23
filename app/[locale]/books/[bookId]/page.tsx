"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEffect, useState, use } from "react"
import { useRouter } from '@/i18n/routing'
import { 
  BookOpen, 
  User, 
  DollarSign,
  Download,
  Package,
  Star,
  CheckCircle,
  AlertCircle,
  Calendar,
  FileText,
  ShoppingCart,
  ArrowLeft,
  Sparkles,
  Award,
  Globe
} from "lucide-react"
import { Navigation } from "@/components/navigation"
import { ErrorBoundary } from "@/components/error-boundary"
import { ApiErrorHandler } from "@/components/api-error-handler"
import { Link } from '@/i18n/routing'
import Image from "next/image"
import { useTranslations } from 'next-intl'

const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

export default function BookDetailPage({
  params
}: {
  params: Promise<{ bookId: string }>
}) {
  const t = useTranslations('books')
  const tCommon = useTranslations('common')
  const { bookId } = use(params)
  const [book, setBook] = useState<any>(null)
  const [instructor, setInstructor] = useState<any>(null)
  const [purchaseType, setPurchaseType] = useState("digital")
  const [paymentType, setPaymentType] = useState<'one_time' | 'monthly' | 'yearly'>('one_time')
  const [isLoading, setIsLoading] = useState(true)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchBook = async () => {
      try {
        if (!isValidUUID(bookId)) {
          throw new Error("Invalid book ID format")
        }

        const supabase = createClient()
        const { data: bookData, error: bookError } = await supabase
          .from("books")
          .select("*, subscription_enabled, subscription_type, monthly_price, yearly_price")
          .eq("id", bookId)
          .single()

        if (bookError) throw bookError
        if (!bookData) throw new Error("Book not found")

        setBook(bookData)

        // Set default purchase type based on availability
        if (bookData.digital_available) {
          setPurchaseType("digital")
        } else if (bookData.physical_available) {
          setPurchaseType("physical")
        }

        // Set default payment type based on subscription settings
        if (bookData.subscription_enabled) {
          if (bookData.subscription_type === 'subscription') {
            // If subscription only, default to monthly if available, otherwise yearly
            setPaymentType(bookData.monthly_price && bookData.monthly_price > 0 ? 'monthly' : 'yearly')
          } else if (bookData.subscription_type === 'both') {
            // If both options available, default to one-time
            setPaymentType('one_time')
          }
        }

        // Fetch instructor profile if available
        if (bookData.instructor_id) {
          const { data: instructorData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", bookData.instructor_id)
            .single()

          if (instructorData) {
            setInstructor(instructorData)
          }
        }
      } catch (err) {
        console.error("Error fetching book:", err)
        setError(err instanceof Error ? err : new Error("Failed to load book"))
      } finally {
        setIsLoading(false)
      }
    }

    fetchBook()
  }, [bookId])

  const handlePurchase = async () => {
    setIsPurchasing(true)

    try {
      const response = await fetch("/api/checkout/paymee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId: bookId,
          type: purchaseType || "digital",
          paymentType: paymentType || "one_time",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.error || data.message || `Failed to process purchase (${response.status})`
        console.error("Checkout error:", { status: response.status, data })
        throw new Error(errorMsg)
      }

      if (data.error) {
        console.error("Checkout error in response:", data)
        throw new Error(data.error)
      }

      if (data.free) {
        router.push("/dashboard")
        return
      }

      // Redirect to Paymee payment page
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl
      } else {
        throw new Error("Payment URL not received")
      }
    } catch (err) {
      console.error("Purchase error:", err)
      setError(err instanceof Error ? err : new Error("Purchase failed"))
    } finally {
      setIsPurchasing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error || !book) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ApiErrorHandler error={error || new Error("Book not found")} onRetry={() => window.location.reload()} />
        </div>
      </div>
    )
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <Navigation />
      <ErrorBoundary>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
          <Link href="/books">
            <Button variant="ghost" className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {tCommon('backToBooks')}
            </Button>
          </Link>

          {/* Hero Section */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 p-4 sm:p-6 md:p-8 lg:p-12 mb-4 sm:mb-6 md:mb-8 shadow-2xl">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
            
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 items-center">
              {/* Book Cover */}
              <div className="flex items-center justify-center">
                {book.cover_url ? (
                  <div className="relative w-full max-w-sm">
                    <Image
                      src={book.cover_url}
                      alt={book.title}
                      width={400}
                      height={600}
                      className="rounded-2xl shadow-2xl object-cover w-full h-auto"
                    />
                    <div className="absolute -inset-4 bg-gradient-to-br from-blue-400 to-purple-400 rounded-2xl blur-2xl opacity-30 -z-10"></div>
                  </div>
                ) : (
                  <div className="w-full max-w-sm h-[600px] bg-gradient-to-br from-blue-400 to-purple-400 rounded-2xl shadow-2xl flex items-center justify-center">
                    <BookOpen className="w-32 h-32 text-white/80" />
                  </div>
                )}
              </div>

              {/* Book Info */}
              <div className="text-white space-y-6">
                <div>
                  <Badge className="mb-4 bg-white/20 text-white border-white/30 backdrop-blur-sm">
                    <BookOpen className="w-3 h-3 mr-1" />
                    Digital Book
                  </Badge>
                  <h1 className="text-4xl md:text-5xl font-bold mb-3">{book.title}</h1>
                  <div className="flex items-center gap-3 text-white/90 text-lg">
                    <User className="w-5 h-5" />
                    <span className="font-medium">{book.author}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-5 h-5 text-white/80" />
                      <span className="text-white/80 text-sm">Price</span>
                    </div>
                    <div className="text-3xl font-bold text-white">
                      {book.price === 0 ? "Free" : formatPrice(book.price)}
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-white/80" />
                      <span className="text-white/80 text-sm">Format</span>
                    </div>
                    <div className="text-lg font-semibold text-white">
                      {book.digital_available ? "PDF" : "Physical"}
                    </div>
                  </div>
                </div>

                {book.isbn && (
                  <div className="flex items-center gap-2 text-white/80">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">ISBN: {book.isbn}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    About This Book
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                    {book.description || "No description available for this book."}
                  </p>
                </CardContent>
              </Card>

              {/* Book Details */}
              <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                    Book Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Author</span>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">{book.author}</span>
                    </div>

                    {book.isbn && (
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">ISBN</span>
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white">{book.isbn}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Download className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Digital Available</span>
                      </div>
                      <Badge variant={book.digital_available ? "default" : "secondary"}>
                        {book.digital_available ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <AlertCircle className="w-3 h-3 mr-1" />
                        )}
                        {book.digital_available ? "Yes" : "No"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Physical Available</span>
                      </div>
                      <Badge variant={book.physical_available ? "default" : "secondary"}>
                        {book.physical_available ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <AlertCircle className="w-3 h-3 mr-1" />
                        )}
                        {book.physical_available ? "Yes" : "No"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Instructor Section */}
              {instructor && (
                <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5 text-green-600" />
                      About the Author
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-xl font-bold">
                        {instructor.full_name?.charAt(0) || instructor.email?.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                          {instructor.full_name || "Instructor"}
                        </h3>
                        {instructor.bio && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {instructor.bio}
                          </p>
                        )}
                        {instructor.average_rating && instructor.average_rating > 0 && (
                          <div className="flex items-center gap-1 mt-2">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium text-sm">{instructor.average_rating.toFixed(1)}</span>
                            {instructor.total_ratings && instructor.total_ratings > 0 && (
                              <span className="text-xs text-muted-foreground">
                                ({instructor.total_ratings} ratings)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Purchase Sidebar */}
            <div className="lg:col-span-1">
              <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                    Purchase Options
                  </CardTitle>
                  <CardDescription>Choose your preferred format</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Pricing Options */}
                  {book.subscription_enabled && (book.subscription_type === 'both' || book.subscription_type === 'subscription') ? (
                    <div className="space-y-4">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Choose Payment Plan</p>
                      <div className="space-y-3">
                        {(book.subscription_type === 'both' || book.subscription_type === 'one_time') && book.price !== null && (
                          <div 
                            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              paymentType === 'one_time' 
                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' 
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                            onClick={() => setPaymentType('one_time')}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-semibold text-gray-900 dark:text-white">One-Time Payment</div>
                                <div className="text-2xl font-bold text-blue-600 mt-1">
                                  {book.price === 0 ? 'Free' : formatPrice(book.price)}
                                </div>
                              </div>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                paymentType === 'one_time' ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                              }`}>
                                {paymentType === 'one_time' && <div className="w-3 h-3 rounded-full bg-white"></div>}
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Pay once, lifetime access</p>
                          </div>
                        )}
                        
                        {book.monthly_price && book.monthly_price > 0 && (
                          <div 
                            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              paymentType === 'monthly' 
                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' 
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                            onClick={() => setPaymentType('monthly')}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                  Monthly Subscription
                                  <Badge variant="secondary" className="text-xs">Recurring</Badge>
                                </div>
                                <div className="text-2xl font-bold text-blue-600 mt-1">
                                  {formatPrice(book.monthly_price)}
                                  <span className="text-sm font-normal text-gray-500">/month</span>
                                </div>
                              </div>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                paymentType === 'monthly' ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                              }`}>
                                {paymentType === 'monthly' && <div className="w-3 h-3 rounded-full bg-white"></div>}
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Billed monthly, cancel anytime</p>
                          </div>
                        )}
                        
                        {book.yearly_price && book.yearly_price > 0 && (
                          <div 
                            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              paymentType === 'yearly' 
                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' 
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                            onClick={() => setPaymentType('yearly')}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                  Yearly Subscription
                                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Save 17%</Badge>
                                </div>
                                <div className="text-2xl font-bold text-blue-600 mt-1">
                                  {formatPrice(book.yearly_price)}
                                  <span className="text-sm font-normal text-gray-500">/year</span>
                                </div>
                              </div>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                paymentType === 'yearly' ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                              }`}>
                                {paymentType === 'yearly' && <div className="w-3 h-3 rounded-full bg-white"></div>}
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Billed yearly, cancel anytime</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl">
                      <div className="text-sm text-muted-foreground mb-2">Price</div>
                      <div className="text-4xl font-bold text-gray-900 dark:text-white">
                        {book.price === 0 ? "Free" : formatPrice(book.price)}
                      </div>
                    </div>
                  )}

                  {/* Purchase Type Selection */}
                  {(book.physical_available || book.digital_available) && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Select Format
                      </label>
                      <Select value={purchaseType} onValueChange={setPurchaseType}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {book.digital_available && (
                            <SelectItem value="digital">
                              <div className="flex items-center gap-2">
                                <Download className="w-4 h-4" />
                                <span>Digital (PDF)</span>
                              </div>
                            </SelectItem>
                          )}
                          {book.physical_available && (
                            <SelectItem value="physical">
                              <div className="flex items-center gap-2">
                                <Package className="w-4 h-4" />
                                <span>Physical Book</span>
                              </div>
                            </SelectItem>
                          )}
                          {book.physical_available && book.digital_available && (
                            <SelectItem value="both">
                              <div className="flex items-center gap-2">
                                <BookOpen className="w-4 h-4" />
                                <span>Both Formats</span>
                              </div>
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Purchase Button */}
                  <Button 
                    size="lg" 
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg" 
                    onClick={handlePurchase} 
                    disabled={isPurchasing}
                  >
                    {isPurchasing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Purchase Now
                      </>
                    )}
                  </Button>

                  {/* Features */}
                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Instant access after purchase</span>
                    </div>
                    {book.digital_available && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>Download PDF anytime</span>
                      </div>
                    )}
                    {book.physical_available && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>Free shipping included</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>30-day money-back guarantee</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    </div>
  )
}
