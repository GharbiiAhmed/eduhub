import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { askChatbot, getChatbotLogs } from "@/lib/services/groq-chatbot-service"

// Ask chatbot endpoint
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { query, courseId } = await request.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    const result = await askChatbot(user, query.trim(), courseId)

    return NextResponse.json({
      success: true,
      response: result.response,
      logId: result.logId
    })

  } catch (error) {
    console.error("Chatbot API error:", error)
    
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      if (error.message.includes('not configured')) {
        return NextResponse.json({ error: error.message }, { status: 503 })
      }
    }

    return NextResponse.json({ 
      error: "Failed to process chatbot request" 
    }, { status: 500 })
  }
}

// Get chatbot logs endpoint
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const lang = searchParams.get('lang') || 'en'

    const logs = await getChatbotLogs(user, lang)

    return NextResponse.json({
      success: true,
      logs
    })

  } catch (error) {
    console.error("Get chatbot logs error:", error)
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    return NextResponse.json({ 
      error: "Failed to fetch chatbot logs" 
    }, { status: 500 })
  }
}
