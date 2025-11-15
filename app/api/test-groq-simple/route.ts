import { askChatbot } from "@/lib/services/groq-chatbot-service"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  try {
    const { query } = await req.json()

    if (!query) {
      return Response.json({ error: "Query is required" }, { status: 400 })
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log('Testing Groq with query:', query)
    
    // Use the Groq chatbot service
    const result = await askChatbot(user, query)
    
    console.log('Groq response:', result.response)

    return Response.json({
      success: true,
      response: result.response,
      logId: result.logId
    })

  } catch (error) {
    console.error('Test API error:', error)
    return Response.json({ error: "Failed to process request" }, { status: 500 })
  }
}


