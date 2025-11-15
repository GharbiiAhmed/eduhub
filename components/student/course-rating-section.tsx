"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RatingDisplay } from "@/components/course/rating-display"
import { RatingDialog } from "@/components/course/rating-dialog"
import { Star, MessageSquare } from "lucide-react"

interface CourseRatingSectionProps {
  courseId: string
  courseTitle: string
  enrollmentProgress: number
  averageRating?: number
  totalRatings?: number
}

export function CourseRatingSection({
  courseId,
  courseTitle,
  enrollmentProgress,
  averageRating = 0,
  totalRatings = 0,
}: CourseRatingSectionProps) {
  const [showRatingDialog, setShowRatingDialog] = useState(false)
  const [userRating, setUserRating] = useState<{ rating: number; review: string } | null>(null)
  const [canRate, setCanRate] = useState(false)
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    // Check if progress is 100% (handle both integer and decimal)
    console.log("CourseRatingSection - enrollmentProgress:", enrollmentProgress)
    if (enrollmentProgress >= 100) {
      console.log("CourseRatingSection - Progress is 100%, enabling rating")
      setCanRate(true)
      fetchUserRating()
      fetchReviews()
    } else {
      console.log("CourseRatingSection - Progress is not 100%, disabling rating")
      setCanRate(false)
      setLoading(false)
    }
  }, [courseId, enrollmentProgress])

  const fetchUserRating = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from("course_ratings")
        .select("rating, review")
        .eq("student_id", user.id)
        .eq("course_id", courseId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" which is fine
        console.error("Error fetching user rating:", error)
      }

      if (data) {
        setUserRating(data)
      }
    } catch (error) {
      // No rating yet or error - that's fine
      console.error("Error in fetchUserRating:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchReviews = async () => {
    try {
      const { data } = await supabase
        .from("course_ratings")
        .select(
          `
          rating,
          review,
          created_at,
          profiles!inner(full_name, avatar_url)
        `
        )
        .eq("course_id", courseId)
        .not("review", "is", null)
        .order("created_at", { ascending: false })
        .limit(5)

      if (data) {
        setReviews(data)
      }
    } catch (error) {
      console.error("Error fetching reviews:", error)
    }
  }

  const handleRatingSubmitted = () => {
    fetchUserRating()
    fetchReviews()
    // Refresh the page to update average rating
    window.location.reload()
  }

  // Always show the card, even if loading
  // The loading state is just for the user rating fetch
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Course Rating</CardTitle>
              <CardDescription>Share your experience with this course</CardDescription>
            </div>
            {averageRating > 0 && (
              <RatingDisplay rating={averageRating} totalRatings={totalRatings} size="lg" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {enrollmentProgress >= 100 ? (
            <>
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading rating options...</div>
              ) : userRating ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">You rated this course:</p>
                  <div className="flex items-center gap-2">
                    <RatingDisplay rating={userRating.rating} showCount={false} />
                    {userRating.review && (
                      <p className="text-sm text-muted-foreground italic">"{userRating.review}"</p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRatingDialog(true)}
                  >
                    Update Rating
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Congratulations on completing this course! How would you rate your experience?
                  </p>
                  <Button onClick={() => setShowRatingDialog(true)}>
                    <Star className="w-4 h-4 mr-2" />
                    Rate This Course
                  </Button>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Complete the course to rate it ({enrollmentProgress}% complete)
            </p>
          )}

          {reviews.length > 0 && (
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Recent Reviews
              </h4>
              <div className="space-y-3">
                {reviews.map((review: any, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RatingDisplay rating={review.rating} showCount={false} size="sm" />
                        <span className="text-sm font-medium">
                          {review.profiles?.full_name || "Anonymous"}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{review.review}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <RatingDialog
        courseId={courseId}
        courseTitle={courseTitle}
        open={showRatingDialog}
        onOpenChange={setShowRatingDialog}
        onRatingSubmitted={handleRatingSubmitted}
      />
    </>
  )
}

