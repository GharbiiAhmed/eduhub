import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Link } from '@/i18n/routing'
import { redirect } from '@/i18n/routing'
import { getTranslations } from 'next-intl/server'

export default async function InstructorBooksPage() {
  const t = await getTranslations('books')
  const tCommon = await getTranslations('common')

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('myBooks')}</h1>
          <p className="text-sm sm:text-base text-muted-foreground">{t('manageBooksAndSales')}</p>
        </div>
        <Link href="/instructor/books/create">
          <Button className="w-full sm:w-auto">{t('addBook')}</Button>
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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">{tCommon('price')}:</span>
                  <span className="font-medium">${book.price}</span>
                </div>
                <div className="flex gap-2 text-xs">
                  {book.physical_available && (
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded">{t('physical')}</span>
                  )}
                  {book.digital_available && (
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded">{t('digital')}</span>
                  )}
                </div>
                <Link href={`/instructor/books/${book.id}`}>
                  <Button className="w-full bg-transparent" variant="outline">
                    {t('editBook')}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-4 sm:pt-6 text-center">
            <p className="text-muted-foreground mb-4">{t('noBooksAddedYet')}</p>
            <Link href="/instructor/books/create">
              <Button>{t('addYourFirstBook')}</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
