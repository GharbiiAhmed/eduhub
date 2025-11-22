import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Link } from '@/i18n/routing'
import { redirect } from '@/i18n/routing'
import { BookOpen, Download, Eye, ArrowLeft, Calendar, DollarSign, Package } from "lucide-react"
import { getTranslations } from 'next-intl/server'

export default async function StudentBookDetailPage({
  params }: { params: Promise<{ bookId: string }> }) {
  const t = await getTranslations()
  const tCommon = await getTranslations('common')
  const { bookId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get the book purchase details
  const { data: purchase } = await supabase
    .from("book_purchases")
    .select("*, books(*)")
    .eq("student_id", user.id)
    .eq("book_id", bookId)
    .single()

  if (!purchase) {
    redirect("/student/books")
  }

  const book = purchase.books

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/student/books">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to My Books
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{book?.title}</h1>
            <p className="text-muted-foreground">by {book?.author}</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
        {/* Book Cover and Actions */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Book Cover</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-[3/4] bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 rounded-lg flex items-center justify-center mb-6">
                {book?.cover_url ? (
                  <img
                    src={book.cover_url}
                    alt={book.title}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <BookOpen className="w-24 h-24 text-primary/40" />
                )}
              </div>

              <div className="space-y-3">
                {(purchase.purchase_type === 'digital' || purchase.purchase_type === 'both') && book?.pdf_url && (
                  <Link href={book.pdf_url} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full bg-gradient-to-r from-primary to-secondary hover:shadow-lg hover:shadow-primary/30 text-primary-foreground">
                      <Eye className="w-4 h-4 mr-2" />
                      Read PDF Online
                    </Button>
                  </Link>
                )}
                
                {(purchase.purchase_type === 'digital' || purchase.purchase_type === 'both') && book?.pdf_url && (
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => {
                      const link = document.createElement('a')
                      link.href = book.pdf_url
                      link.download = `${book.title}.pdf`
                      link.click()
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                )}

                {purchase.purchase_type === 'physical' && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-blue-800">Physical Book</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      Your physical book will be shipped to your registered address.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Book Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Purchase Information */}
          <Card>
            <CardHeader>
              <CardTitle>Purchase Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Purchased:</span>
                  </div>
                  <p className="font-medium">{new Date(purchase.purchased_at).toLocaleDateString()}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Price Paid:</span>
                  </div>
                  <p className="font-medium">${purchase.price_paid}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Type:</span>
                  </div>
                  <p className="font-medium capitalize">{purchase.purchase_type}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">ISBN:</span>
                  </div>
                  <p className="font-medium">{book?.isbn || "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Book Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {book?.description || "No description available for this book."}
              </p>
            </CardContent>
          </Card>

          {/* Book Details */}
          <Card>
            <CardHeader>
              <CardTitle>Book Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Author:</span>
                  <span className="font-medium">{book?.author}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ISBN:</span>
                  <span className="font-medium">{book?.isbn || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Digital Available:</span>
                  <span className="font-medium">{book?.digital_available ? "Yes" : "No"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Physical Available:</span>
                  <span className="font-medium">{book?.physical_available ? "Yes" : "No"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}



