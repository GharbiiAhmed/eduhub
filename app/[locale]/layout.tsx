import type React from "react"
import type { Metadata } from "next"
import { Geist } from "next/font/google"
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { AIChatbot } from "@/components/ai-chatbot"
import { SettingsProvider } from "@/contexts/settings-context"
import { WebsiteSettingsProvider } from "@/contexts/website-settings-context"
import { MaintenanceMode } from "@/components/maintenance-mode"
import { Analytics } from "@vercel/analytics/next"

const _geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "EduHub - Learn & Grow",
  description: "The modern e-learning platform for courses and books",
  generator: "v0.app",
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ locale: string }>
}>) {
  const { locale } = await params

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound()
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages()

  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme') || 'light';
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`${_geist.className} font-sans antialiased bg-background text-foreground`}>
        <NextIntlClientProvider messages={messages}>
          <SettingsProvider>
            <WebsiteSettingsProvider>
              {children}
              <MaintenanceMode />
              <AIChatbot />
              <Analytics />
            </WebsiteSettingsProvider>
          </SettingsProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}





