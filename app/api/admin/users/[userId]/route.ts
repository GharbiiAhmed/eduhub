import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

interface RouteContext {
  params: Promise<{
    userId: string
  }>
}

// GET - Fetch user details
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { userId } = await context.params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    // Handle profile errors properly (user might not have a profile)
    const { data: adminProfile, error: adminProfileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    // If profile doesn't exist or there's an error, user is not authorized
    if (!adminProfile || adminProfileError || adminProfile.role !== "admin") {
      return NextResponse.json({ 
        error: "Forbidden - Admin only",
        details: adminProfileError ? `Profile check failed: ${adminProfileError.message}` : "User is not an admin"
      }, { status: 403 })
    }

    // Use service role client if available to bypass RLS
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAdmin = serviceRoleKey
      ? createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey
        )
      : supabase

    // Fetch user profile
    const { data: userProfile, error: userProfileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()

    if (userProfileError || !userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ user: userProfile })
  } catch (error: any) {
    console.error("Error fetching user:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

// PATCH - Update user
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { userId } = await context.params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    // Handle profile errors properly (user might not have a profile)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    // If profile doesn't exist or there's an error, user is not authorized
    if (!profile || profileError || profile.role !== "admin") {
      return NextResponse.json({ 
        error: "Forbidden - Admin only",
        details: profileError ? `Profile check failed: ${profileError.message}` : "User is not an admin"
      }, { status: 403 })
    }

    const body = await request.json()
    const { role, status, full_name, email } = body

    // Use service role client if available to bypass RLS
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAdmin = serviceRoleKey
      ? createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey
        )
      : supabase

    // Build update object - only include fields that are provided and valid
    const updateData: any = {}
    if (role !== undefined && ['student', 'instructor', 'admin'].includes(role)) {
      updateData.role = role
    }
    if (status !== undefined && ['pending', 'approved', 'active', 'inactive', 'banned'].includes(status)) {
      updateData.status = status
    }
    if (full_name !== undefined) {
      updateData.full_name = full_name
    }
    if (email !== undefined && email) {
      updateData.email = email
    }

    // If no valid fields to update, return error
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      )
    }

    // Update user profile
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from("profiles")
      .update(updateData)
      .eq("id", userId)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating user:", updateError)
      return NextResponse.json(
        { error: updateError.message || "Failed to update user" },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      user: updatedProfile 
    })
  } catch (error: any) {
    console.error("Error updating user:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - Delete user
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  console.log(`[DELETE USER] ========== DELETE USER ENDPOINT CALLED ==========`)
  try {
    const { userId } = await context.params
    console.log(`[DELETE USER] Received userId from params: ${userId}`)
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    // Handle profile errors properly (user might not have a profile)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    // If profile doesn't exist or there's an error, user is not authorized
    if (!profile || profileError || profile.role !== "admin") {
      return NextResponse.json({ 
        error: "Forbidden - Admin only",
        details: profileError ? `Profile check failed: ${profileError.message}` : "User is not an admin"
      }, { status: 403 })
    }

    // Prevent admin from deleting themselves
    if (userId === user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      )
    }

    // Use service role client - REQUIRED for deleting auth users
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      console.error("[DELETE USER] ❌ SUPABASE_SERVICE_ROLE_KEY is not set in environment variables")
      console.error("[DELETE USER] Environment check:", {
        hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        nodeEnv: process.env.NODE_ENV
      })
      return NextResponse.json(
        { 
          error: "Service role key not configured. Cannot delete auth user.",
          details: "SUPABASE_SERVICE_ROLE_KEY environment variable is missing. Please configure it in your deployment environment (Netlify)."
        },
        { status: 500 }
      )
    }
    
    console.log(`[DELETE USER] Service role key found: ${serviceRoleKey.substring(0, 10)}...`)

    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
    
    // Verify service role client is working
    console.log(`[DELETE USER] Service role client created. Testing connection...`)
    try {
      const { data: testUser, error: testError } = await supabaseAdmin.auth.admin.getUserById(userId)
      if (testError && testError.status !== 404) {
        console.error("[DELETE USER] Service role client test failed:", testError)
        return NextResponse.json(
          { 
            error: `Service role client error: ${testError.message}`,
            details: "Cannot proceed with deletion. Service role key may be invalid."
          },
          { status: 500 }
        )
      }
      console.log(`[DELETE USER] Service role client verified. User exists: ${!!testUser?.user}`)
    } catch (testErr: any) {
      console.error("[DELETE USER] Service role client test exception:", testErr)
      return NextResponse.json(
        { 
          error: `Service role client error: ${testErr.message}`,
          details: "Cannot proceed with deletion."
        },
        { status: 500 }
      )
    }

    // First verify the user exists before attempting deletion
    console.log(`[DELETE USER] Verifying user exists: ${userId}`)
    const { data: userBeforeDelete, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId)
    
    if (getUserError && getUserError.status !== 404) {
      console.error("[DELETE USER] Error fetching user:", getUserError)
      return NextResponse.json(
        { 
          error: `Failed to fetch user: ${getUserError.message}`,
          details: "Cannot delete user that cannot be accessed"
        },
        { status: 500 }
      )
    }
    
    if (!userBeforeDelete?.user) {
      console.log(`[DELETE USER] User not found - may already be deleted`)
      return NextResponse.json(
        { 
          error: "User not found",
          details: "User may have already been deleted"
        },
        { status: 404 }
      )
    }
    
    console.log(`[DELETE USER] User found: ${userBeforeDelete.user.email}`)
    console.log(`[DELETE USER] Attempting to delete auth user: ${userId}`)
    console.log(`[DELETE USER] This will automatically cascade delete profile and all associated data`)
    console.log(`[DELETE USER] Service role key configured: ${!!serviceRoleKey}`)
    console.log(`[DELETE USER] Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)
    
    // Delete auth user - this will CASCADE delete the profile and all associated data
    // The profiles table has: id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
    let deleteResult
    try {
      console.log(`[DELETE USER] Calling supabaseAdmin.auth.admin.deleteUser(${userId})...`)
      deleteResult = await supabaseAdmin.auth.admin.deleteUser(userId)
      console.log(`[DELETE USER] deleteUser call completed. Result:`, {
        hasError: !!deleteResult.error,
        error: deleteResult.error ? {
          message: deleteResult.error.message,
          status: deleteResult.error.status,
          name: deleteResult.error.name
        } : null,
        data: deleteResult.data
      })
    } catch (deleteException: any) {
      console.error("[DELETE USER] ❌ Exception thrown during deleteUser call:", deleteException)
      console.error("[DELETE USER] Exception details:", {
        message: deleteException.message,
        stack: deleteException.stack,
        name: deleteException.name
      })
      return NextResponse.json(
        { 
          error: `Exception deleting auth user: ${deleteException.message}`,
          details: "An exception was thrown during the deleteUser call",
          userId: userId
        },
        { status: 500 }
      )
    }
    
    if (deleteResult.error) {
      console.error("[DELETE USER] ❌ Error deleting auth user:", deleteResult.error)
      console.error("[DELETE USER] Error details:", {
        message: deleteResult.error.message,
        status: deleteResult.error.status,
        name: deleteResult.error.name
      })
      return NextResponse.json(
        { 
          error: `Failed to delete auth user: ${deleteResult.error.message}`,
          errorCode: deleteResult.error.status,
          details: "Auth user deletion failed. Profile and associated data were NOT deleted.",
          userId: userId
        },
        { status: 500 }
      )
    }
    
    console.log(`[DELETE USER] ✅ Auth user deletion API call succeeded (no error returned)`)
    
    // Wait a moment for cascade deletions to propagate
    console.log(`[DELETE USER] Waiting for cascade deletions to propagate...`)
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Verify deletion (auth user and profile should both be gone due to CASCADE)
    console.log(`[DELETE USER] Verifying deletion...`)
    const { data: authCheck, error: authCheckError } = await supabaseAdmin.auth.admin.getUserById(userId)
    const { data: profileCheck, error: profileCheckError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single()
    
    const authDeleted = !authCheck?.user
    const profileDeleted = !profileCheck
    
    console.log(`[DELETE USER] Verification results:`, {
      authDeleted,
      profileDeleted,
      authCheckError: authCheckError?.status,
      profileCheckError: profileCheckError?.code
    })
    
    if (authDeleted && profileDeleted) {
      console.log(`[DELETE USER] ✅ Both auth user and profile successfully deleted`)
      return NextResponse.json({ 
        success: true,
        message: "User deleted successfully. Profile and all associated data were automatically removed via CASCADE.",
        deleted: {
          authUser: true,
          profile: true,
          associatedData: true
        }
      })
    } else if (!authDeleted) {
      console.error(`[DELETE USER] ❌ Auth user still exists after deletion attempt`)
      return NextResponse.json({
        success: false,
        error: "Auth user deletion failed - user still exists",
        deleted: {
          authUser: false,
          profile: profileDeleted
        },
        details: "The deleteUser API call returned success but the user still exists. Profile deletion status: " + (profileDeleted ? "deleted" : "still exists")
      }, { status: 500 })
    } else {
      // Auth deleted but profile still exists (shouldn't happen with CASCADE)
      console.error(`[DELETE USER] ⚠️ Auth user deleted but profile still exists (CASCADE may not have triggered)`)
      return NextResponse.json({
        success: false,
        warning: "Auth user deleted but profile still exists",
        deleted: {
          authUser: true,
          profile: false
        },
        details: "This should not happen - profile should be automatically deleted via CASCADE when auth user is deleted"
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error("Error deleting user:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

