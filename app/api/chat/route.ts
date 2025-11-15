import { askChatbot } from "@/lib/services/groq-chatbot-service"
import { createClient } from "@/lib/supabase/server"

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { messages }: { messages: Array<{ role: 'system' | 'user' | 'assistant'; content?: string; parts?: Array<{ type: string; text: string }> }> } = await req.json()

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

    // Create streaming response in the exact format AI SDK expects
    const encoder = new TextEncoder()
    const messageId = Date.now().toString()
    const stream = new ReadableStream({
      start(controller) {
        let isClosed = false
        let timeoutId: NodeJS.Timeout | null = null
        
        const safeEnqueue = (data: string) => {
          if (!isClosed) {
            try {
              controller.enqueue(encoder.encode(data))
            } catch (error) {
              console.log('Controller already closed, stopping stream')
              isClosed = true
              if (timeoutId) clearTimeout(timeoutId)
            }
          }
        }
        
        try {
          // Send text-start with id
          const startData = `data: {"id":"${messageId}","type":"text-start"}\n\n`
          safeEnqueue(startData)
          
          // Send text content in chunks
          const text = result.response
          const words = text.split(' ')
          
          let currentText = ''
          let index = 0
          
          const sendChunk = () => {
            if (isClosed) return
            
            if (index < words.length) {
              currentText += (index > 0 ? ' ' : '') + words[index]
              const delta = words[index] + (index < words.length - 1 ? ' ' : '')
              const deltaData = `data: {"id":"${messageId}","type":"text-delta","delta":${JSON.stringify(delta)}}\n\n`
              safeEnqueue(deltaData)
              index++
              timeoutId = setTimeout(sendChunk, 50) // Small delay between chunks
            } else {
              // Stream complete - AI SDK will reconstruct message from text-delta messages
              safeEnqueue('data: [DONE]\n\n')
              isClosed = true
              controller.close()
            }
          }
          
          sendChunk()
        } catch (error) {
          console.log('Error sending message:', error)
          isClosed = true
          if (timeoutId) clearTimeout(timeoutId)
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('Chat API error:', error)
    
    // Fallback response
    const fallbackMessage = "I'm here to help! How can I assist you with your learning today?"
    
    const encoder = new TextEncoder()
    const fallbackId = Date.now().toString()
    const stream = new ReadableStream({
      start(controller) {
        let isClosed = false
        let timeoutId: NodeJS.Timeout | null = null
        
        const safeEnqueue = (data: string) => {
          if (!isClosed) {
            try {
              controller.enqueue(encoder.encode(data))
            } catch (error) {
              console.log('Controller already closed, stopping fallback stream')
              isClosed = true
              if (timeoutId) clearTimeout(timeoutId)
            }
          }
        }
        
        try {
          // Send text-start with id
          const startData = `data: {"id":"${fallbackId}","type":"text-start"}\n\n`
          safeEnqueue(startData)
          
          // Send text content in chunks
          const words = fallbackMessage.split(' ')
          let currentText = ''
          let index = 0
          
          const sendChunk = () => {
            if (isClosed) return
            
            if (index < words.length) {
              currentText += (index > 0 ? ' ' : '') + words[index]
              const delta = words[index] + (index < words.length - 1 ? ' ' : '')
              const deltaData = `data: {"id":"${fallbackId}","type":"text-delta","delta":${JSON.stringify(delta)}}\n\n`
              safeEnqueue(deltaData)
              index++
              timeoutId = setTimeout(sendChunk, 50)
            } else {
              // Stream complete - AI SDK will reconstruct message from text-delta messages
              safeEnqueue('data: [DONE]\n\n')
              isClosed = true
              controller.close()
            }
          }
          
          sendChunk()
        } catch (error) {
          console.log('Error sending fallback message:', error)
          isClosed = true
          if (timeoutId) clearTimeout(timeoutId)
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  }
}