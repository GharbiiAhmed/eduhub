import { createClient } from "@/lib/supabase/server"

export async function getCurrentUser() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    return user
  } catch (error) {
    console.error("[v0] Error getting current user:", error)
    return null
  }
}

export async function getUserProfile() {
  try {
    const user = await getCurrentUser()
    if (!user) return null

    const supabase = await createClient()
    const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

    if (error) {
      console.error("[v0] Error fetching profile:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("[v0] Error in getUserProfile:", error)
    return null
  }
}

export async function getEnrolledCourses(userId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("enrollments")
      .select(
        `
        id,
        enrolled_at,
        progress_percentage,
        courses:course_id (
          id,
          title,
          description,
          thumbnail_url,
          price
        )
      `,
      )
      .eq("student_id", userId)

    if (error) {
      console.error("[v0] Error fetching enrolled courses:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Error in getEnrolledCourses:", error)
    return []
  }
}

export async function getPublishedCourses() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("courses")
      .select(
        `
        id,
        title,
        description,
        thumbnail_url,
        price,
        instructor_id,
        profiles:instructor_id (
          full_name,
          avatar_url
        )
      `,
      )
      .eq("status", "published")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching published courses:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Error in getPublishedCourses:", error)
    return []
  }
}
