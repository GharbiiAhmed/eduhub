import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Link } from '@/i18n/routing'
import { getTranslations } from 'next-intl/server'

export default function CheckoutCancelPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Purchase Cancelled</CardTitle>
          <CardDescription>Your purchase was not completed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">You can try again whenever you&apos;re ready.</p>
          <Link href="/books">
            <Button className="w-full">Back to Books</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
