import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { sendWelcomeEmail } from "@/lib/email"

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
      .select('id, email, role, status, full_name')
      .eq('id', userId)
      .single()

    // Always use upsert to ensure profile exists with correct data
    // This handles both creation and update in one operation
    // Fetch user email from auth.users if profile doesn't exist
    let userEmail = ''
    if (!existingProfile || fetchError) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId)
      userEmail = authUser?.user?.email || ''
    } else {
      userEmail = existingProfile.email || ''
    }
    
    // Determine role and status from request or existing profile or defaults
    const userRole = body.role || existingProfile?.role || 'student'
    const userStatus = status || existingProfile?.status || (userRole === 'instructor' ? 'pending' : 'approved')
    
    // Prepare data for upsert - always include full_name
    // Use provided fullName, or keep existing, or use empty string
    const finalFullName = fullName !== null && fullName !== undefined 
      ? fullName 
      : (existingProfile?.full_name !== null && existingProfile?.full_name !== undefined 
          ? existingProfile.full_name 
          : '')
    
    const profileData: any = {
      id: userId,
      email: userEmail,
      role: userRole,
      status: userStatus,
      full_name: finalFullName
    }
    
    // Use upsert to create or update the profile
    // Service role bypasses RLS, so this will work regardless of trigger
    const { data: upsertedProfile, error: upsertError } = await supabaseAdmin
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' })
      .select()
      .single()
    
    if (upsertError) {
      console.error('Profile upsert error:', upsertError)
      console.error('Profile data attempted:', profileData)
      return NextResponse.json(
        { 
          error: upsertError.message,
          details: upsertError,
          attemptedData: profileData
        },
        { status: 500 }
      )
    }

    // Send welcome email if this is a new profile (didn't exist before)
    const isNewProfile = !existingProfile || fetchError
    if (isNewProfile && userEmail && upsertedProfile) {
      try {
        console.log(`[UPDATE PROFILE] Sending welcome email to ${userEmail}`)
        const emailResult = await sendWelcomeEmail(
          userEmail,
          finalFullName || 'User',
          userRole
        )
        
        if (emailResult.success) {
          console.log(`✅ Welcome email sent successfully to ${userEmail}`)
        } else {
          console.error(`❌ Failed to send welcome email:`, emailResult.error)
        }
      } catch (emailError: any) {
        console.error("❌ Exception sending welcome email:", emailError)
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({ 
      success: true,
      message: "Profile updated successfully",
      profile: upsertedProfile
    })
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    )
  }
}

