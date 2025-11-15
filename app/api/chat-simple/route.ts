import { askChatbot } from "@/lib/services/groq-chatbot-service"
import { createClient } from "@/lib/supabase/server"

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { messages }: { messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> } = await req.json()

    if (!messages || messages.length === 0) {
      return Response.json({ error: "No messages provided" }, { status: 400 })
    }

    // Get the last user message
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()
    console.log('Messages received:', messages)
    console.log('Last user message:', lastUserMessage)
    
    // Extract content from different message formats
    let query = ''
    if (lastUserMessage) {
      if (lastUserMessage.content) {
        // Standard format: { role: 'user', content: 'text' }
        query = lastUserMessage.content
      } else if (lastUserMessage.parts && Array.isArray(lastUserMessage.parts)) {
        // Gemini format: { role: 'user', parts: [{ type: 'text', text: 'text' }] }
        const textPart = lastUserMessage.parts.find((part: any) => part.type === 'text')
        if (textPart && textPart.text) {
          query = textPart.text
        }
      }
    }
    
    console.log('Extracted query:', query)
    
    if (!query || !query.trim()) {
      console.log('No valid user message found')
      return Response.json({ error: "No valid user message found" }, { status: 400 })
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log('Using query:', query.trim())
    // Use the Groq chatbot service
    const result = await askChatbot(user, query.trim())
    
    console.log('Groq response received:', result.response.substring(0, 100) + '...')

    // Return the full response immediately (non-streaming)
    return Response.json({
      success: true,
      response: result.response,
      logId: result.logId
    })

  } catch (error) {
    console.error('Chat API error:', error)
    
    // Fallback response
    const fallbackMessage = "I'm here to help! How can I assist you with your learning today?"
    
    return Response.json({
      success: true,
      response: fallbackMessage
    })
  }
}


