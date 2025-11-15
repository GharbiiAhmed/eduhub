import { CheckCircle } from "lucide-react"

interface FormSuccessProps {
  message: string
}

export function FormSuccess({ message }: FormSuccessProps) {
  return (
    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400 text-sm flex items-start gap-2">
      <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <p>{message}</p>
    </div>
  )
}
