"use client"

import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslations } from 'next-intl'
import { BookOpen, Users, Award, Target, Heart, Zap } from "lucide-react"

export default function AboutPage() {
  const t = useTranslations('about')
  const tCommon = useTranslations('common')

  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16 space-y-6">
            <h1 className="text-5xl lg:text-6xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {t('title')}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('subtitle')}
            </p>
          </div>

          {/* Mission Section */}
          <Card className="mb-12 border-2">
            <CardHeader>
              <CardTitle className="text-3xl flex items-center gap-3">
                <Target className="w-8 h-8 text-primary" />
                {t('ourMission')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed text-lg">
                {t('missionDescription')}
              </p>
            </CardContent>
          </Card>

          {/* Vision Section */}
          <Card className="mb-12 border-2">
            <CardHeader>
              <CardTitle className="text-3xl flex items-center gap-3">
                <Zap className="w-8 h-8 text-secondary" />
                {t('ourVision')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed text-lg">
                {t('visionDescription')}
              </p>
            </CardContent>
          </Card>

          {/* Values Section */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-8 text-center">{t('ourValues')}</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: BookOpen,
                  title: t('value1Title'),
                  description: t('value1Description'),
                  color: "from-primary to-secondary"
                },
                {
                  icon: Users,
                  title: t('value2Title'),
                  description: t('value2Description'),
                  color: "from-secondary to-accent"
                },
                {
                  icon: Award,
                  title: t('value3Title'),
                  description: t('value3Description'),
                  color: "from-accent to-primary"
                },
              ].map((value, index) => (
                <Card key={index} className="border-2 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${value.color} flex items-center justify-center mb-4`}>
                      <value.icon className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <CardTitle>{value.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{value.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Story Section */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-3xl flex items-center gap-3">
                <Heart className="w-8 h-8 text-accent" />
                {t('ourStory')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed text-lg mb-4">
                {t('storyDescription')}
              </p>
              <p className="text-muted-foreground leading-relaxed text-lg">
                {t('storyDescription2')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}

