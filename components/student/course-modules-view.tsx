"use client"

import { Card, CardContent } from "@/components/ui/card"
import { useState } from "react"
import ModuleView from "./module-view"

interface Module {
  id: string
  title: string
  description: string
  order_index: number
}

export default function CourseModulesView({ courseId, modules }: { courseId: string; modules: Module[] }) {
  const [expandedModule, setExpandedModule] = useState<string | null>(modules[0]?.id || null)

  return (
    <div className="space-y-4">
      {modules.length > 0 ? (
        modules.map((module) => (
          <ModuleView
            key={module.id}
            module={module}
            courseId={courseId}
            isExpanded={expandedModule === module.id}
            onToggle={() => setExpandedModule(expandedModule === module.id ? null : module.id)}
          />
        ))
      ) : (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No modules available yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
