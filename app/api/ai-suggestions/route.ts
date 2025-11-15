import { askChatbot } from "@/lib/services/groq-chatbot-service"
import { createClient } from "@/lib/supabase/server"
import { getPublishedCourses } from "@/lib/supabase/auth-helpers"

export async function POST(req: Request) {
  try {
    const { context, userType } = await req.json()

    if (!context) {
      return Response.json({ error: "Context required" }, { status: 400 })
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Build enhanced context with course information
    let enhancedContext = context

    if (userType === "student") {
      try {
        // Get enrolled courses
        const { data: enrollments } = await supabase
          .from("enrollments")
          .select("*, courses(title, description, category, difficulty)")
          .eq("student_id", user.id)

        // Get available courses
        const availableCourses = await getPublishedCourses()

        // Build detailed context
        const enrolledCoursesInfo = enrollments?.map((e: any) => {
          const course = e.courses
          return `- "${course?.title || 'Unknown'}" (Progress: ${e.progress_percentage}%)`
        }).join('\n') || 'None'

        const availableCoursesList = availableCourses
          .slice(0, 10) // Limit to first 10 for context
          .map((c: any) => `- "${c.title}"${c.price === 0 ? ' (Free)' : ` ($${c.price})`}`)
          .join('\n') || 'None available'

        enhancedContext = `${context}

ENROLLED COURSES:
${enrolledCoursesInfo}

AVAILABLE COURSES TO EXPLORE:
${availableCoursesList}

Please provide specific, actionable recommendations based on:
1. The student's current progress and completed courses
2. Suggested next courses that would complement their learning
3. Learning strategies to optimize their path
4. Specific course recommendations with brief explanations of why they would be beneficial

Be specific and helpful - avoid generic responses.`
      } catch (error) {
        console.warn('Error fetching course data for context:', error)
        // Continue with original context if course data fetch fails
      }
    }

    // Use Groq chatbot service - it already has a comprehensive system prompt
    // The enhanced context we built above will provide the necessary details
    try {
      const result = await askChatbot(user, enhancedContext)
      
      return Response.json({ suggestion: result.response })
    } catch (error) {
      console.error('Error generating AI suggestion:', error)
      return Response.json({ 
        error: "Failed to generate suggestions",
        suggestion: "I apologize, but I'm having trouble generating recommendations right now. Please try again later or contact support."
      }, { status: 500 })
    }
  } catch (error) {
    console.error("AI suggestions error:", error)
    return Response.json({ error: "Failed to generate suggestions" }, { status: 500 })
  }
}
