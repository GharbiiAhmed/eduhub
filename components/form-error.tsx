import { AlertCircle } from "lucide-react"

interface FormErrorProps {
  message: string
  field?: string
}

export function FormError({ message, field }: FormErrorProps) {
  return (
    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-start gap-2">
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <div>
        {field && <p className="font-semibold capitalize">{field}</p>}
        <p>{message}</p>
      </div>
    </div>
  )
}
