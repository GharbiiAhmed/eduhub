import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface RouteContext {
  params: {
    articleId: string
  }
}

// GET - Fetch a single article
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient()
    const { articleId } = context.params

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Check if user is admin or instructor
    let isAdmin = false
    let isInstructor = false
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      isAdmin = profile?.role === "admin"
      isInstructor = profile?.role === "instructor"
    }

    // Build query
    let query = supabase
      .from("help_articles")
      .select(`
        *,
        help_categories (
          id,
          name,
          slug,
          icon
        ),
        help_article_tags (
          tag
        )
      `)
      .eq("id", articleId)
      .single()

    // If not admin/instructor, only show published articles
    if (!isAdmin && !isInstructor) {
      query = query.eq("status", "published")
    }

    const { data: article, error } = await query

    if (error) {
      console.error("Error fetching article:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 })
    }

    // Increment view count (only for published articles)
    if (article.status === "published") {
      await supabase.rpc("increment_article_view_count", { article_id: articleId }).catch(() => {
        // Fallback if function doesn't exist
        supabase
          .from("help_articles")
          .update({ view_count: (article.view_count || 0) + 1 })
          .eq("id", articleId)
          .catch(() => {})
      })
    }

    return NextResponse.json({ article })
  } catch (error: any) {
    console.error("Error in GET /api/help/articles/[articleId]:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH - Update an article
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient()
    const { articleId } = context.params

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    // Get existing article
    const { data: existingArticle, error: fetchError } = await supabase
      .from("help_articles")
      .select("section, author_id")
      .eq("id", articleId)
      .single()

    if (fetchError || !existingArticle) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 })
    }

    // Check permissions
    if (existingArticle.section === "website" && profile.role !== "admin") {
      return NextResponse.json({ error: "Only admins can update website articles" }, { status: 403 })
    }

    if (existingArticle.section === "courses" && profile.role !== "instructor") {
      return NextResponse.json({ error: "Only instructors can update courses articles" }, { status: 403 })
    }

    const body = await request.json()
    const { title, slug, content, excerpt, categoryId, status, orderIndex, tags } = body

    // Update article
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (slug !== undefined) updateData.slug = slug
    if (content !== undefined) updateData.content = content
    if (excerpt !== undefined) updateData.excerpt = excerpt
    if (categoryId !== undefined) updateData.category_id = categoryId || null
    if (status !== undefined) updateData.status = status
    if (orderIndex !== undefined) updateData.order_index = orderIndex

    const { data: article, error: updateError } = await supabase
      .from("help_articles")
      .update(updateData)
      .eq("id", articleId)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating article:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Update tags if provided
    if (tags !== undefined) {
      // Delete existing tags
      await supabase.from("help_article_tags").delete().eq("article_id", articleId)

      // Insert new tags
      if (Array.isArray(tags) && tags.length > 0) {
        const tagInserts = tags.map((tag: string) => ({
          article_id: articleId,
          tag: tag.trim(),
        }))

        await supabase.from("help_article_tags").insert(tagInserts)
      }
    }

    return NextResponse.json({ article, success: true })
  } catch (error: any) {
    console.error("Error in PATCH /api/help/articles/[articleId]:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Delete an article
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient()
    const { articleId } = context.params

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    // Get existing article
    const { data: existingArticle, error: fetchError } = await supabase
      .from("help_articles")
      .select("section")
      .eq("id", articleId)
      .single()

    if (fetchError || !existingArticle) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 })
    }

    // Check permissions
    if (existingArticle.section === "website" && profile.role !== "admin") {
      return NextResponse.json({ error: "Only admins can delete website articles" }, { status: 403 })
    }

    if (existingArticle.section === "courses" && profile.role !== "instructor") {
      return NextResponse.json({ error: "Only instructors can delete courses articles" }, { status: 403 })
    }

    // Delete article (cascade will handle tags and feedback)
    const { error: deleteError } = await supabase.from("help_articles").delete().eq("id", articleId)

    if (deleteError) {
      console.error("Error deleting article:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error in DELETE /api/help/articles/[articleId]:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}












































