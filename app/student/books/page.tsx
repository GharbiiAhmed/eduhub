import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { redirect } from "next/navigation"
import { BookOpen, Eye, ArrowRight, Trophy, Zap } from "lucide-react"
import { DownloadButton } from "@/components/books/download-button"

export default async function StudentBooksPage() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect("/auth/login")
    }

    // Get user's book purchases - fetch separately to avoid join issues
    let purchases: any[] = []
    let booksData: any[] = []
    
    try {
      const { data: purchasesData, error: purchasesError } = await supabase
        .from("book_purchases")
        .select("*")
        .eq("student_id", user.id)
        .order("purchased_at", { ascending: false })

      if (purchasesError) {
        console.error("Error fetching book purchases:", purchasesError)
      } else {
        purchases = purchasesData || []
      }
    } catch (err) {
      console.error("Exception fetching purchases:", err)
      purchases = []
    }

    // Get book details for purchases
    const bookIds = purchases.map(p => p?.book_id).filter(Boolean) || []
    
    if (bookIds.length > 0) {
      try {
        const { data: books, error: booksError } = await supabase
          .from("books")
          .select("*")
          .in("id", bookIds)

        if (booksError) {
          console.error("Error fetching books:", booksError)
        } else {
          booksData = books || []
        }
      } catch (err) {
        console.error("Exception fetching books:", err)
        booksData = []
      }
    }

    // Map book purchases with book data and filter out purchases with missing books
    // Ensure all data is serializable (no functions, no circular references)
    const purchasesWithBooks = purchases
      .filter(p => p && p.book_id && typeof p.book_id === 'string') // Filter out invalid purchases
      .map(purchase => {
        try {
          const book = booksData.find(b => b && b.id === purchase.book_id) || null
          if (!book) {
            return null
          }
          // Create a clean, serializable object
          return {
            id: purchase.id,
            student_id: purchase.student_id,
            book_id: purchase.book_id,
            purchase_type: purchase.purchase_type || 'digital',
            price_paid: Number(purchase.price_paid) || 0,
            purchased_at: purchase.purchased_at || new Date().toISOString(),
            books: {
              id: book.id,
              title: book.title || 'Unknown Book',
              author: book.author || 'Unknown Author',
              cover_url: book.cover_url || null,
              pdf_url: book.pdf_url || null,
              price: Number(book.price) || 0,
            }
          }
        } catch (err) {
          console.error("Error mapping purchase:", err)
          return null
        }
      })
      .filter(p => p !== null) // Only include valid purchases

    return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 p-8 md:p-12 border border-primary/20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 blur-3xl"></div>
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center glow-primary">
              <BookOpen className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                My Library
              </h1>
              <p className="text-muted-foreground">Access your purchased books and resources</p>
            </div>
          </div>
        </div>
      </div>

      {purchasesWithBooks && Array.isArray(purchasesWithBooks) && purchasesWithBooks.length > 0 ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-effect rounded-2xl p-6 border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Books Owned</p>
                  <p className="text-3xl font-bold text-primary">{purchasesWithBooks.length}</p>
                </div>
                <BookOpen className="w-10 h-10 text-primary/30" />
              </div>
            </div>
            <div className="glass-effect rounded-2xl p-6 border-secondary/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Digital Books</p>
                  <p className="text-3xl font-bold text-secondary">
                    {purchasesWithBooks.filter((p: any) => p.purchase_type === 'digital' || p.purchase_type === 'both').length}
                  </p>
                </div>
                <Zap className="w-10 h-10 text-secondary/30" />
              </div>
            </div>
            <div className="glass-effect rounded-2xl p-6 border-accent/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Physical Books</p>
                  <p className="text-3xl font-bold text-accent">
                    {purchasesWithBooks.filter((p: any) => p.purchase_type === 'physical' || p.purchase_type === 'both').length}
                  </p>
                </div>
                <Trophy className="w-10 h-10 text-accent/30" />
              </div>
            </div>
          </div>

          {/* Books Grid */}
          <div>
            <h2 className="text-2xl font-bold mb-6">Your Books</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {purchasesWithBooks.map((purchase: any) => (
                <Card key={purchase.id} className="group hover:shadow-lg transition-all hover:scale-105 border-primary/20 cursor-pointer">
                  <Link href={`/student/books/${purchase.book_id}`}>
                    <CardHeader>
                      <div className="aspect-[3/4] bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 rounded-lg flex items-center justify-center mb-4">
                        {purchase.books?.cover_url ? (
                          <img
                            src={purchase.books.cover_url}
                            alt={purchase.books.title}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <BookOpen className="w-16 h-16 text-primary/40" />
                        )}
                      </div>
                      <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
                        {purchase.books?.title || "Unknown Book"}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        by {purchase.books?.author || "Unknown Author"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Purchase Type:</span>
                        <span className="font-medium capitalize">{purchase.purchase_type}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Purchased:</span>
                        <span className="font-medium">
                          {purchase.purchased_at ? new Date(purchase.purchased_at).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Price Paid:</span>
                        <span className="font-medium">${purchase.price_paid || 0}</span>
                      </div>

                      <div className="flex gap-2">
                        {(purchase.purchase_type === 'digital' || purchase.purchase_type === 'both') && purchase.books?.pdf_url && (
                          <Link href={purchase.books.pdf_url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" className="flex-1 bg-gradient-to-r from-primary to-secondary hover:shadow-lg hover:shadow-primary/30 text-primary-foreground">
                              <Eye className="w-4 h-4 mr-2" />
                              Read PDF
                            </Button>
                          </Link>
                        )}
                        {(purchase.purchase_type === 'digital' || purchase.purchase_type === 'both') && purchase.books?.pdf_url && (
                          <DownloadButton 
                            pdfUrl={purchase.books.pdf_url}
                            title={purchase.books.title || 'book'}
                          />
                        )}
                      </div>

                      {purchase.purchase_type === 'physical' && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800">
                            📦 Physical book will be shipped to your address
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="glass-effect rounded-3xl p-12 text-center border-primary/20 space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto">
            <BookOpen className="w-10 h-10 text-primary/40" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold">No Books Yet</h3>
            <p className="text-muted-foreground">Start building your library by exploring our book collection</p>
          </div>
          <Link href="/books">
            <Button className="bg-gradient-to-r from-primary to-secondary hover:shadow-lg hover:shadow-primary/30 text-primary-foreground">
              Browse Books
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
  } catch (error: any) {
    console.error("Error in StudentBooksPage:", error)
    // Return a safe fallback UI without RefreshBooksButton to avoid import issues
    return (
      <div className="space-y-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 p-8 md:p-12 border border-primary/20">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 blur-3xl"></div>
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center glow-primary">
                <BookOpen className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  My Library
                </h1>
                <p className="text-muted-foreground">Access your purchased books and resources</p>
              </div>
            </div>
          </div>
        </div>
        <div className="glass-effect rounded-3xl p-12 text-center border-primary/20 space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto">
            <BookOpen className="w-10 h-10 text-primary/40" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold">Error Loading Books</h3>
            <p className="text-muted-foreground">Please try refreshing the page</p>
          </div>
          <div className="flex gap-2 justify-center">
            <Link href="/student/books">
              <Button className="bg-gradient-to-r from-primary to-secondary hover:shadow-lg hover:shadow-primary/30 text-primary-foreground">
                Refresh Page
              </Button>
            </Link>
            <Link href="/books">
              <Button variant="outline">
                Browse Books
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }
}
