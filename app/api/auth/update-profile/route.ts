import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

// POST - Update user profile after signup (bypasses RLS using service role)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, fullName, status } = body

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId" },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    if (!supabaseServiceKey) {
      return NextResponse.json(
        { error: "Service role key not configured" },
        { status: 500 }
      )
    }

    const supabaseAdmin = createServiceClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // First, check if profile exists (trigger should have created it)
    const { data: existingProfile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    // If profile doesn't exist, create it (trigger might have failed)
    if (!existingProfile || fetchError) {
      // Fetch user email from auth.users
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId)
      const userEmail = authUser?.user?.email || ''
      
      // Determine role and status from request or defaults
      const userRole = body.role || 'student'
      const userStatus = status || (userRole === 'instructor' ? 'pending' : 'approved')
      
      const insertData: any = {
        id: userId,
        email: userEmail,
        role: userRole,
        status: userStatus,
        full_name: fullName || ''
      }
      
      const { error: insertError } = await supabaseAdmin
        .from('profiles')
        .upsert(insertData, { onConflict: 'id' })
      
      if (insertError) {
        console.error('Profile insert error:', insertError)
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 }
        )
      }
    } else {
      // Update existing profile using service role (bypasses RLS)
      const updateData: any = {}
      if (fullName) updateData.full_name = fullName
      if (status) updateData.status = status

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', userId)

      if (updateError) {
        console.error('Profile update error:', updateError)
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ 
      success: true,
      message: "Profile updated successfully"
    })
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    )
  }
}

