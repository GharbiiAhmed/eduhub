"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Star } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface RatingDialogProps {
  courseId: string
  courseTitle: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onRatingSubmitted?: () => void
}

export function RatingDialog({
  courseId,
  courseTitle,
  open,
  onOpenChange,
  onRatingSubmitted,
}: RatingDialogProps) {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [review, setReview] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [existingRating, setExistingRating] = useState<{ rating: number; review: string } | null>(null)

  const supabase = createClient()

  useEffect(() => {
    if (open && courseId) {
      fetchExistingRating()
    }
  }, [open, courseId])

  const fetchExistingRating = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data } = await supabase
        .from("course_ratings")
        .select("rating, review")
        .eq("student_id", user.id)
        .eq("course_id", courseId)
        .single()

      if (data) {
        setExistingRating(data)
        setRating(data.rating)
        setReview(data.review || "")
      }
    } catch (error) {
      // No existing rating
      setExistingRating(null)
    }
  }

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Rating required",
        description: "Please select a rating before submitting",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("Not authenticated")
      }

      // Check if course is completed
      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("progress_percentage")
        .eq("student_id", user.id)
        .eq("course_id", courseId)
        .single()

      if (!enrollment || enrollment.progress_percentage < 100) {
        toast({
          title: "Course not completed",
          description: "You must complete the course before rating it",
          variant: "destructive",
        })
        return
      }

      // Upsert rating
      const { error } = await supabase.from("course_ratings").upsert(
        {
          student_id: user.id,
          course_id: courseId,
          rating,
          review: review.trim() || null,
        },
        { onConflict: "student_id,course_id" }
      )

      if (error) throw error

      toast({
        title: existingRating ? "Rating updated" : "Thank you for your rating!",
        description: "Your feedback helps improve our courses",
      })

      onOpenChange(false)
      if (onRatingSubmitted) {
        onRatingSubmitted()
      }
    } catch (error: any) {
      console.error("Error submitting rating:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to submit rating",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Rate This Course</DialogTitle>
          <DialogDescription>
            How would you rate "{courseTitle}"? Your feedback helps other students and instructors.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="space-y-2">
            <Label>Rating</Label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="focus:outline-none"
                >
                  <Star
                    className={cn(
                      "w-8 h-8 transition-colors",
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "fill-gray-200 text-gray-300"
                    )}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm text-muted-foreground">
                  {rating} {rating === 1 ? "star" : "stars"}
                </span>
              )}
            </div>
          </div>

          {/* Review Text */}
          <div className="space-y-2">
            <Label htmlFor="review">Review (Optional)</Label>
            <Textarea
              id="review"
              placeholder="Share your thoughts about this course..."
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={4}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || rating === 0}
            >
              {isSubmitting ? "Submitting..." : existingRating ? "Update Rating" : "Submit Rating"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


