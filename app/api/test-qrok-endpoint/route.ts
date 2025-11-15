import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { endpoint } = await request.json()
    
    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint is required" }, { status: 400 })
    }

    const apiKey = process.env.QROK_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "QROK_API_KEY not configured" }, { status: 500 })
    }

    // Test the endpoint with a simple request
    const testResponse = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: 'Hello, this is a test message.' }
        ],
        max_tokens: 10
      })
    })

    if (testResponse.ok) {
      const data = await testResponse.json()
      return NextResponse.json({ 
        success: true, 
        response: {
          status: testResponse.status,
          hasResponse: !!data,
          model: data.model || 'unknown'
        }
      })
    } else {
      const errorText = await testResponse.text()
      return NextResponse.json({ 
        success: false, 
        error: `HTTP ${testResponse.status}: ${errorText}` 
      })
    }

  } catch (error) {
    console.error('Endpoint test error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
}


