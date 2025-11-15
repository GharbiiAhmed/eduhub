import { NextResponse } from "next/server"

export async function GET() {
  try {
    const apiKey = process.env.QROK_API_KEY
    
    if (!apiKey) {
      return NextResponse.json({
        hasKey: false,
        keyLength: 0,
        error: "QROK_API_KEY environment variable is not set"
      })
    }

    return NextResponse.json({
      hasKey: true,
      keyLength: apiKey.length,
      keyPrefix: apiKey.substring(0, 8) + "...", // Show first 8 characters for verification
    })
  } catch (error) {
    return NextResponse.json({
      hasKey: false,
      keyLength: 0,
      error: error instanceof Error ? error.message : "Unknown error"
    })
  }
}


