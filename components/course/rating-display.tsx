"use client"

import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface RatingDisplayProps {
  rating: number
  totalRatings?: number
  showCount?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

export function RatingDisplay({
  rating,
  totalRatings,
  showCount = true,
  size = "md",
  className,
}: RatingDisplayProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  }

  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center">
        {[...Array(fullStars)].map((_, i) => (
          <Star
            key={`full-${i}`}
            className={cn("fill-yellow-400 text-yellow-400", sizeClasses[size])}
          />
        ))}
        {hasHalfStar && (
          <div className="relative">
            <Star className={cn("text-gray-300", sizeClasses[size])} />
            <Star
              className={cn(
                "absolute left-0 top-0 fill-yellow-400 text-yellow-400 overflow-hidden",
                sizeClasses[size]
              )}
              style={{ clipPath: "inset(0 50% 0 0)" }}
            />
          </div>
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <Star
            key={`empty-${i}`}
            className={cn("fill-gray-200 text-gray-300", sizeClasses[size])}
          />
        ))}
      </div>
      {rating > 0 && (
        <span className={cn("font-medium", size === "sm" ? "text-sm" : "text-base")}>
          {rating.toFixed(1)}
        </span>
      )}
      {showCount && totalRatings !== undefined && totalRatings > 0 && (
        <span className={cn("text-muted-foreground", size === "sm" ? "text-xs" : "text-sm")}>
          ({totalRatings} {totalRatings === 1 ? "rating" : "ratings"})
        </span>
      )}
    </div>
  )
}


