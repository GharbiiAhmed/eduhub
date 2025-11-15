"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { useTranslations } from 'next-intl'
import ModuleCard from "./module-card"

interface Module {
  id: string
  title: string
  description: string
  order_index: number
}

export default function CourseModulesSection({
  courseId,
  modules: initialModules,
}: {
  courseId: string
  modules: Module[]
}) {
  const t = useTranslations('courses')
  const tCommon = useTranslations('common')
  const [modules, setModules] = useState(initialModules)
  const [newModuleTitle, setNewModuleTitle] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsCreating(true)
    setError(null)

    try {
      const { data, error: insertError } = await supabase
        .from("modules")
        .insert({
          course_id: courseId,
          title: newModuleTitle,
          order_index: modules.length,
        })
        .select()
        .single()

      if (insertError) throw insertError

      setModules([...modules, data])
      setNewModuleTitle("")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('anErrorOccurred'))
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('addNewModule')}</CardTitle>
          <CardDescription>{t('createNewModule')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateModule} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="moduleTitle">{t('moduleTitle')}</Label>
              <Input
                id="moduleTitle"
                placeholder={t('moduleTitlePlaceholder')}
                required
                value={newModuleTitle}
                onChange={(e) => setNewModuleTitle(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={isCreating}>
              {isCreating ? t('creating') : t('createModule')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {modules.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{t('modules')}</h3>
          {modules.map((module) => (
            <ModuleCard key={module.id} module={module} courseId={courseId} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">{t('noModulesYet')}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
