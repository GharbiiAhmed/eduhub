import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params

    // Use service role client to bypass RLS for public enrollment count
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseServiceKey) {
      // Fallback to regular client if service key not available
      const { createClient: createServerClient } = await import("@/lib/supabase/server")
      const supabase = await createServerClient()
      
      const { count, error } = await supabase
        .from("enrollments")
        .select("*", { count: "exact", head: true })
        .eq("course_id", courseId)

      if (error) {
        console.error("Error counting enrollments:", error)
        return NextResponse.json({ count: 0 })
      }

      return NextResponse.json({ count: count || 0 })
    }

    // Use service role client to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Count enrollments for this course
    const { count, error } = await supabase
      .from("enrollments")
      .select("*", { count: "exact", head: true })
      .eq("course_id", courseId)

    if (error) {
      console.error("Error counting enrollments:", error)
      return NextResponse.json({ count: 0 })
    }

    return NextResponse.json({ count: count || 0 })
  } catch (error: any) {
    console.error("Error in enrollment count API:", error)
    return NextResponse.json({ count: 0 })
  }
}

