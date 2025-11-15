"use client"

import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslations } from 'next-intl'
import { Shield, Lock, Eye, FileText, UserCheck, Database } from "lucide-react"

export default function PrivacyPage() {
  const t = useTranslations('privacy')
  const tCommon = useTranslations('common')

  const sections = [
    {
      icon: Database,
      title: t('dataCollectionTitle'),
      content: t('dataCollectionContent')
    },
    {
      icon: Lock,
      title: t('dataSecurityTitle'),
      content: t('dataSecurityContent')
    },
    {
      icon: Eye,
      title: t('dataUsageTitle'),
      content: t('dataUsageContent')
    },
    {
      icon: UserCheck,
      title: t('userRightsTitle'),
      content: t('userRightsContent')
    },
    {
      icon: FileText,
      title: t('cookiesTitle'),
      content: t('cookiesContent')
    },
    {
      icon: Shield,
      title: t('changesTitle'),
      content: t('changesContent')
    }
  ]

  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16 space-y-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Shield className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {t('title')}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('subtitle')}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('lastUpdated')}: {t('lastUpdatedDate')}
            </p>
          </div>

          {/* Introduction */}
          <Card className="mb-8 border-2">
            <CardContent className="pt-6">
              <p className="text-muted-foreground leading-relaxed text-lg">
                {t('introduction')}
              </p>
            </CardContent>
          </Card>

          {/* Privacy Sections */}
          <div className="space-y-6">
            {sections.map((section, index) => (
              <Card key={index} className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <section.icon className="w-6 h-6 text-primary" />
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    {section.content}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Contact Section */}
          <Card className="mt-8 border-2">
            <CardHeader>
              <CardTitle>{t('contactUs')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                {t('contactDescription')}
              </p>
              <p className="text-muted-foreground">
                <strong>{t('email')}:</strong> privacy@eduhub.com
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}

