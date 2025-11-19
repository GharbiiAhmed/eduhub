import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface RouteContext {
  params: {
    articleId: string
  }
}

// POST - Submit feedback for an article
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient()
    const { articleId } = context.params

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const body = await request.json()
    const { isHelpful, feedbackText } = body

    // Check if feedback already exists
    const { data: existingFeedback } = await supabase
      .from("help_article_feedback")
      .select("id, is_helpful")
      .eq("article_id", articleId)
      .eq("user_id", user?.id || null)
      .single()

    let feedback
    if (existingFeedback) {
      // Update existing feedback
      const { data: updatedFeedback, error: updateError } = await supabase
        .from("help_article_feedback")
        .update({
          is_helpful: isHelpful,
          feedback_text: feedbackText || null,
        })
        .eq("id", existingFeedback.id)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      feedback = updatedFeedback

      // Update article helpful counts if feedback changed
      if (existingFeedback.is_helpful !== isHelpful) {
        const { data: article } = await supabase
          .from("help_articles")
          .select("helpful_count, not_helpful_count")
          .eq("id", articleId)
          .single()

        if (article) {
          let helpfulCount = article.helpful_count || 0
          let notHelpfulCount = article.not_helpful_count || 0

          if (existingFeedback.is_helpful) {
            helpfulCount = Math.max(0, helpfulCount - 1)
          } else {
            notHelpfulCount = Math.max(0, notHelpfulCount - 1)
          }

          if (isHelpful) {
            helpfulCount += 1
          } else {
            notHelpfulCount += 1
          }

          await supabase
            .from("help_articles")
            .update({
              helpful_count: helpfulCount,
              not_helpful_count: notHelpfulCount,
            })
            .eq("id", articleId)
        }
      }
    } else {
      // Create new feedback
      const { data: newFeedback, error: insertError } = await supabase
        .from("help_article_feedback")
        .insert({
          article_id: articleId,
          user_id: user?.id || null,
          is_helpful: isHelpful,
          feedback_text: feedbackText || null,
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      feedback = newFeedback

      // Update article helpful counts
      const { data: article } = await supabase
        .from("help_articles")
        .select("helpful_count, not_helpful_count")
        .eq("id", articleId)
        .single()

      if (article) {
        const helpfulCount = (article.helpful_count || 0) + (isHelpful ? 1 : 0)
        const notHelpfulCount = (article.not_helpful_count || 0) + (isHelpful ? 0 : 1)

        await supabase
          .from("help_articles")
          .update({
            helpful_count: helpfulCount,
            not_helpful_count: notHelpfulCount,
          })
          .eq("id", articleId)
      }
    }

    return NextResponse.json({ feedback, success: true })
  } catch (error: any) {
    console.error("Error in POST /api/help/articles/[articleId]/feedback:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

























