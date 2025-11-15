import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { redirect } from "next/navigation"

export default async function InstructorBooksPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: books } = await supabase
    .from("books")
    .select("*")
    .eq("instructor_id", user.id)
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Books</h1>
          <p className="text-muted-foreground">Manage your books and sales</p>
        </div>
        <Link href="/instructor/books/create">
          <Button>Add Book</Button>
        </Link>
      </div>

      {books && books.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => (
            <Card key={book.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="line-clamp-2">{book.title}</CardTitle>
                <CardDescription className="line-clamp-1">{book.author}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Price:</span>
                  <span className="font-medium">${book.price}</span>
                </div>
                <div className="flex gap-2 text-xs">
                  {book.physical_available && (
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded">Physical</span>
                  )}
                  {book.digital_available && (
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded">Digital</span>
                  )}
                </div>
                <Link href={`/instructor/books/${book.id}`}>
                  <Button className="w-full bg-transparent" variant="outline">
                    Edit Book
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">You haven&apos;t added any books yet</p>
            <Link href="/instructor/books/create">
              <Button>Add Your First Book</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
