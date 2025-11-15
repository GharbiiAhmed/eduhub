import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET - Fetch all published articles (public) or all articles (for admins/instructors)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const section = searchParams.get("section") // 'website' or 'courses'
    const categoryId = searchParams.get("categoryId")
    const status = searchParams.get("status") // 'published', 'draft', or null for all
    const search = searchParams.get("search")

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
        )
      `)
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: false })

    // Filter by section
    if (section) {
      query = query.eq("section", section)
    }

    // Filter by category
    if (categoryId) {
      query = query.eq("category_id", categoryId)
    }

    // Filter by status - only show published to non-admins/instructors
    if (!isAdmin && !isInstructor) {
      query = query.eq("status", "published")
    } else if (status) {
      query = query.eq("status", status)
    }

    // Search filter
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%,excerpt.ilike.%${search}%`)
    }

    const { data: articles, error } = await query

    if (error) {
      console.error("Error fetching articles:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ articles: articles || [] })
  } catch (error: any) {
    console.error("Error in GET /api/help/articles:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create a new article (admin for website, instructor for courses)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
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

    const body = await request.json()
    const { title, slug, content, excerpt, categoryId, section, status, orderIndex, tags } = body

    // Validate section permissions
    if (section === "website" && profile.role !== "admin") {
      return NextResponse.json({ error: "Only admins can create website articles" }, { status: 403 })
    }

    if (section === "courses" && profile.role !== "instructor") {
      return NextResponse.json({ error: "Only instructors can create courses articles" }, { status: 403 })
    }

    // Create article
    const { data: article, error: articleError } = await supabase
      .from("help_articles")
      .insert({
        title,
        slug,
        content,
        excerpt,
        category_id: categoryId || null,
        section,
        status: status || "draft",
        order_index: orderIndex || 0,
        author_id: user.id,
      })
      .select()
      .single()

    if (articleError) {
      console.error("Error creating article:", articleError)
      return NextResponse.json({ error: articleError.message }, { status: 500 })
    }

    // Add tags if provided
    if (tags && Array.isArray(tags) && tags.length > 0) {
      const tagInserts = tags.map((tag: string) => ({
        article_id: article.id,
        tag: tag.trim(),
      }))

      const { error: tagsError } = await supabase.from("help_article_tags").insert(tagInserts)

      if (tagsError) {
        console.error("Error adding tags:", tagsError)
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({ article, success: true })
  } catch (error: any) {
    console.error("Error in POST /api/help/articles:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}



















