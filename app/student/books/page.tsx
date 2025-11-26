import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { redirect } from "next/navigation"
import { BookOpen, Download, Eye, ArrowRight, Trophy, Zap } from "lucide-react"
import { RefreshBooksButton } from "./refresh-button"

export const revalidate = 10 // Revalidate every 10 seconds

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
    const { data: purchases, error: purchasesError } = await supabase
      .from("book_purchases")
      .select("*")
      .eq("student_id", user.id)
      .order("purchased_at", { ascending: false })

    if (purchasesError) {
      console.error("Error fetching book purchases:", purchasesError)
    }

    // Get book details for purchases
    const bookIds = purchases?.map(p => p.book_id).filter(Boolean) || []
    const { data: booksData, error: booksError } = bookIds.length > 0
      ? await supabase
          .from("books")
          .select("*")
          .in("id", bookIds)
      : { data: null, error: null }

    if (booksError) {
      console.error("Error fetching books:", booksError)
    }

    // Map book purchases with book data and filter out purchases with missing books
    const purchasesWithBooks = purchases?.map(purchase => {
      const book = booksData?.find(b => b.id === purchase.book_id) || null
      return {
        ...purchase,
        books: book
      }
    }).filter(p => p.books !== null) || []

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
            <RefreshBooksButton />
          </div>
        </div>
      </div>

      {purchasesWithBooks && purchasesWithBooks.length > 0 ? (
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
                          {new Date(purchase.purchased_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Price Paid:</span>
                        <span className="font-medium">${purchase.price_paid}</span>
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
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              const link = document.createElement('a')
                              link.href = purchase.books.pdf_url
                              link.download = `${purchase.books.title}.pdf`
                              link.click()
                            }}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
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
    // Return a safe fallback UI
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
              <RefreshBooksButton />
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
          <Link href="/books">
            <Button className="bg-gradient-to-r from-primary to-secondary hover:shadow-lg hover:shadow-primary/30 text-primary-foreground">
              Browse Books
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    )
  }
}
