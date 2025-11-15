// Fallback OpenAI API Client
export class OpenAIAPI {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
    this.baseUrl = 'https://api.openai.com/v1'
  }

  async chat(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>, options?: {
    model?: string
    maxTokens?: number
    temperature?: number
  }) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options?.model || 'gpt-4o-mini',
        messages: messages,
        max_tokens: options?.maxTokens || 500,
        temperature: options?.temperature || 0.7,
        stream: false
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
  }

  async generateText(prompt: string, systemPrompt?: string, options?: {
    model?: string
    maxTokens?: number
    temperature?: number
  }) {
    const messages = []
    
    if (systemPrompt) {
      messages.push({ role: 'system' as const, content: systemPrompt })
    }
    
    messages.push({ role: 'user' as const, content: prompt })

    return await this.chat(messages, options)
  }
}

// Enhanced Qrok API Client with fallback
export class QrokAPI {
  private apiKey: string
  private baseUrl: string
  private fallbackAPI: OpenAIAPI | null = null
  private hasQrok: boolean = false

  constructor(apiKey: string) {
    this.apiKey = apiKey
    const base = process.env.QROK_BASE_URL
    this.baseUrl = base || ''
    this.hasQrok = Boolean(base)
    
    // Initialize fallback if OpenAI key is available
    const openaiKey = process.env.OPENAI_API_KEY
    if (openaiKey) {
      this.fallbackAPI = new OpenAIAPI(openaiKey)
    }
  }

  async chat(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>, options?: {
    model?: string
    maxTokens?: number
    temperature?: number
  }) {
    try {
      // If Qrok base URL is not configured, immediately use fallback
      if (!this.hasQrok) {
        if (this.fallbackAPI) {
          console.log('Qrok not configured, using OpenAI fallback')
          return await this.fallbackAPI.chat(messages, options)
        }
        throw new Error('Qrok base URL not configured and no fallback available')
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options?.model || 'gpt-4o-mini',
          messages: messages,
          max_tokens: options?.maxTokens || 500,
          temperature: options?.temperature || 0.7,
          stream: false
        })
      })

      if (!response.ok) {
        throw new Error(`Qrok API error: ${response.status} ${response.statusText}`)
      }
      // Guard against HTML/error pages
      let data: any
      try {
        data = await response.json()
      } catch (e) {
        throw new Error('Invalid JSON from Qrok endpoint')
      }
      return data.choices[0].message.content
    } catch (error) {
      console.warn('Qrok API failed, trying fallback:', error)
      
      if (this.fallbackAPI) {
        console.log('Using OpenAI fallback')
        return await this.fallbackAPI.chat(messages, options)
      }
      
      throw error
    }
  }

  async streamChat(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>, options?: {
    model?: string
    maxTokens?: number
    temperature?: number
  }) {
    try {
      // If Qrok base URL is not configured, use non-streaming fallback
      if (!this.hasQrok) {
        if (this.fallbackAPI) {
          const content = await this.fallbackAPI.chat(messages, options)
          return new Response(JSON.stringify({ content }), {
            headers: { 'Content-Type': 'application/json' }
          })
        }
        throw new Error('Qrok base URL not configured and no fallback available')
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options?.model || 'gpt-4o-mini',
          messages: messages,
          max_tokens: options?.maxTokens || 500,
          temperature: options?.temperature || 0.7,
          stream: true
        })
      })

      if (!response.ok) {
        throw new Error(`Qrok API error: ${response.status} ${response.statusText}`)
      }

      return response
    } catch (error) {
      console.warn('Qrok streaming failed, using non-streaming fallback:', error)
      
      if (this.fallbackAPI) {
        // For fallback, we'll return a non-streaming response
        const content = await this.fallbackAPI.chat(messages, options)
        return new Response(JSON.stringify({ content }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }
      
      throw error
    }
  }

  async generateText(prompt: string, systemPrompt?: string, options?: {
    model?: string
    maxTokens?: number
    temperature?: number
  }) {
    const messages = []
    
    if (systemPrompt) {
      messages.push({ role: 'system' as const, content: systemPrompt })
    }
    
    messages.push({ role: 'user' as const, content: prompt })

    return await this.chat(messages, options)
  }
}

// Singleton instance
let qrokAPI: QrokAPI | null = null

export function getQrokAPI(): QrokAPI {
  if (!qrokAPI) {
    const apiKey = process.env.QROK_API_KEY
    if (!apiKey) {
      console.error('❌ QROK_API_KEY environment variable is not set')
      console.error('Please add QROK_API_KEY=your_api_key to your .env.local file')
      console.error('Make sure to restart your Next.js development server after adding the variable')
      throw new Error('QROK_API_KEY environment variable is not set. Please check your .env.local file and restart the server.')
    }
    console.log('✅ Qrok API key loaded successfully')
    qrokAPI = new QrokAPI(apiKey)
  }
  return qrokAPI
}

// Simple mock AI responses for when no API is available
export function getMockAIResponse(context: string, userType: string): string {
  const responses = {
    student: `Hello! I'm EduHub AI Assistant. Based on your message: "${context}", I'm here to help you with your learning journey! 

Here are some ways I can assist you:
• Course recommendations and learning paths
• Study strategies and tips
• Technical questions about courses
• Platform navigation help

What would you like to learn about today?`,
    
    instructor: `Hello! I'm EduHub AI Assistant for instructors. Regarding: "${context}", I can help you with:

• Course creation and content development
• Teaching strategies and student engagement
• Assessment and feedback methods
• Platform features for instructors

How can I help you improve your teaching today?`,
    
    admin: `Hello! I'm EduHub AI Assistant for administrators. About: "${context}", I can help you with:

• Platform management and analytics
• User engagement strategies
• Course quality monitoring
• System optimization

What administrative tasks can I help you with?`
  }
  
  return responses[userType as keyof typeof responses] || `Hello! I'm EduHub AI Assistant. I understand you're asking about: "${context}". 

I'm here to help with your e-learning platform needs! Whether you're a student, instructor, or admin, I can provide guidance on courses, learning strategies, and platform features.

What can I help you with today?`
}