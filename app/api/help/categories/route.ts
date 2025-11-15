import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET - Fetch all categories
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const section = searchParams.get("section") // 'website' or 'courses'

    let query = supabase
      .from("help_categories")
      .select("*")
      .order("order_index", { ascending: true })
      .order("name", { ascending: true })

    if (section) {
      query = query.eq("section", section)
    }

    const { data: categories, error } = await query

    if (error) {
      console.error("Error fetching categories:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ categories: categories || [] })
  } catch (error: any) {
    console.error("Error in GET /api/help/categories:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create a new category
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
    const { name, slug, description, icon, section, orderIndex } = body

    // Validate section permissions
    if (section === "website" && profile.role !== "admin") {
      return NextResponse.json({ error: "Only admins can create website categories" }, { status: 403 })
    }

    if (section === "courses" && profile.role !== "instructor") {
      return NextResponse.json({ error: "Only instructors can create courses categories" }, { status: 403 })
    }

    // Create category
    const { data: category, error: categoryError } = await supabase
      .from("help_categories")
      .insert({
        name,
        slug,
        description,
        icon,
        section,
        order_index: orderIndex || 0,
      })
      .select()
      .single()

    if (categoryError) {
      console.error("Error creating category:", categoryError)
      return NextResponse.json({ error: categoryError.message }, { status: 500 })
    }

    return NextResponse.json({ category, success: true })
  } catch (error: any) {
    console.error("Error in POST /api/help/categories:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


















