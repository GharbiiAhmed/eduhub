"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function TestBookPurchasePage() {
  const [isTesting, setIsTesting] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [books, setBooks] = useState<any[]>([])
  const router = useRouter()

  const fetchBooks = async () => {
    const supabase = createClient()
    const { data } = await supabase.from("books").select("*").limit(5)
    setBooks(data || [])
  }

  const handleTestBookPurchase = async (bookId: string) => {
    setIsTesting(true)
    setError(null)
    setResult(null)

    try {
      console.log("Testing book purchase for:", bookId)
      
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId: bookId,
          type: "digital",
        }),
      })

      console.log("Book purchase response:", response.status)

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Book purchase failed: ${errorData}`)
      }

      const data = await response.json()
      console.log("Book purchase data:", data)

      if (data.free) {
        setResult("✅ Free book purchase successful! Check 'My Books' to see your purchase.")
        
        // Wait a moment then redirect to my books
        setTimeout(() => {
          router.push("/student/books")
        }, 2000)
      } else if (data.sessionId) {
        setResult("✅ Stripe checkout session created. This would redirect to Stripe.")
      } else {
        setResult("✅ Book purchase successful, but unexpected response format.")
      }

    } catch (err) {
      console.error("Test book purchase error:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsTesting(false)
    }
  }

  const handleGoToMyBooks = () => {
    router.push("/student/books")
  }

  const handleGoToBrowseBooks = () => {
    router.push("/books")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Test Book Purchase</h1>
        <p className="text-muted-foreground">Test the book purchase flow</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Books</CardTitle>
          <CardDescription>Click to test purchasing a book</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={fetchBooks} variant="outline">
            Load Books
          </Button>

          {books.length > 0 && (
            <div className="space-y-2">
              {books.map((book: any) => (
                <div key={book.id} className="flex items-center justify-between border rounded-lg p-3">
                  <div>
                    <h3 className="font-bold">{book.title}</h3>
                    <p className="text-sm text-muted-foreground">by {book.author}</p>
                    <p className="text-sm text-muted-foreground">${book.price}</p>
                  </div>
                  <Button 
                    onClick={() => handleTestBookPurchase(book.id)}
                    disabled={isTesting}
                    size="sm"
                  >
                    Test Purchase
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {result && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-bold text-green-800">Result:</h3>
              <p className="text-green-700">{result}</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-bold text-red-800">Error:</h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleGoToMyBooks}
              className="flex-1"
            >
              Go to My Books
            </Button>
            <Button 
              variant="outline" 
              onClick={handleGoToBrowseBooks}
              className="flex-1"
            >
              Browse Books
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}



