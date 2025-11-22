import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { redirect } from '@/i18n/routing'
import { getTranslations } from 'next-intl/server'

export default async function AdminBooksPage() {
  const t = await getTranslations('books')
  const tCommon = await getTranslations('common')

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Check if user is admin
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "admin") {
    redirect("/dashboard")
  }

  // Get all books first, then fetch instructor profiles separately
  const { data: books, error: booksError } = await supabase
    .from("books")
    .select("*")
    .order("created_at", { ascending: false })
  
  if (booksError) {
    console.error('Error fetching books:', booksError)
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('bookManagement')}</h1>
          <p className="text-sm sm:text-base text-muted-foreground">{t('manageAllPlatformBooks')}</p>
        </div>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <p className="text-red-600">{t('errorLoadingBooks')}: {booksError.message}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Fetch instructor profiles for each book
  const booksWithProfiles = await Promise.all(
    (books || []).map(async (book) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", book.instructor_id)
        .single()
      
      return {
        ...book,
        instructor_profile: profile || null
      }
    })
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">{t('bookManagement')}</h1>
        <p className="text-sm sm:text-base text-muted-foreground">{t('manageAllPlatformBooks')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('allBooks')} ({booksWithProfiles.length})</CardTitle>
          <CardDescription>{t('completeListOfBooks')}</CardDescription>
        </CardHeader>
        <CardContent>
          {booksWithProfiles && booksWithProfiles.length > 0 ? (
            <div className="space-y-4">
              {booksWithProfiles.map((book: any) => (
                <div key={book.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4 last:border-b-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{book.title}</p>
                    <p className="text-sm text-muted-foreground">{tCommon('by')} {book.author}</p>
                    <p className="text-xs text-muted-foreground">
                      {tCommon('instructors')}: {book.instructor_profile?.full_name || book.instructor_profile?.email || t('unknownInstructor')}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-medium">${book.price}</p>
                      <div className="flex gap-1 text-xs">
                        {book.physical_available && <span className="bg-muted px-2 py-1 rounded">{t('physical')}</span>}
                        {book.digital_available && <span className="bg-muted px-2 py-1 rounded">{t('digital')}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">{t('noBooksFound')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
