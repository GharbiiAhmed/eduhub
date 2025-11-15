"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { Navigation } from "@/components/navigation"

export function SignUpSuccessClient() {
  const t = useTranslations('auth')

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <Navigation />

      <div className="flex-1 flex items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{t('checkYourEmail')}</CardTitle>
            <CardDescription>{t('confirmationLinkSent')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-6">
              {t('checkEmailAndClick')}
            </p>
            <Link href="/auth/login">
              <Button className="w-full">{t('backToLogin')}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  )
}

