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

    // Use service role client if available to bypass RLS
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAdmin = serviceRoleKey
      ? createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey
        )
      : supabase

    // Fetch user profile
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()

    if (profileError || !userProfile) {
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
      return NextResponse.json(
        { error: "Service role key not configured. Cannot delete auth user." },
        { status: 500 }
      )
    }

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

    // Delete both auth user and profile
    // We'll attempt both deletions and report the results
    console.log(`[DELETE USER] Starting deletion process for user: ${userId}`)
    
    let authUserDeleted = false
    let profileDeleted = false
    let authDeleteError: any = null
    let profileDeleteError: any = null
    
    // Step 1: Delete the profile first
    console.log(`[DELETE USER] Step 1: Deleting profile record for user: ${userId}`)
    try {
      const { error: deleteError, data: deleteData } = await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", userId)
        .select()

      if (deleteError) {
        profileDeleteError = deleteError
        console.error("[DELETE USER] Error deleting profile:", deleteError)
      } else {
        profileDeleted = true
        console.log(`[DELETE USER] ✅ Profile deleted successfully. Deleted rows:`, deleteData?.length || 0)
      }
    } catch (error: any) {
      profileDeleteError = error
      console.error("[DELETE USER] Exception deleting profile:", error)
    }
    
    // Step 2: Delete the auth user
    console.log(`[DELETE USER] Step 2: Deleting auth user: ${userId}`)
    try {
      // Verify user exists in auth before deletion
      const { data: userBeforeDelete, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId)
      
      if (getUserError && getUserError.status !== 404) {
        console.error("[DELETE USER] Error fetching user before delete:", getUserError)
        authDeleteError = getUserError
      } else if (!userBeforeDelete?.user) {
        // User doesn't exist - consider it already deleted
        authUserDeleted = true
        console.log(`[DELETE USER] User not found in auth.users - may already be deleted`)
      } else {
        console.log(`[DELETE USER] User found: ${userBeforeDelete.user.email}`)
        
        // Delete the auth user - try multiple times if needed
        let deletionAttempts = 0
        const maxAttempts = 3
        
        while (deletionAttempts < maxAttempts && !authUserDeleted) {
          deletionAttempts++
          console.log(`[DELETE USER] Attempt ${deletionAttempts}/${maxAttempts}: Deleting auth user ${userId}...`)
          
          try {
            const deleteResult = await supabaseAdmin.auth.admin.deleteUser(userId)
            authDeleteError = deleteResult.error
            
            if (!authDeleteError) {
              // Wait a moment for deletion to propagate
              await new Promise(resolve => setTimeout(resolve, 1000))
              
              // Verify deletion succeeded
              const { data: userAfterDelete, error: verifyError } = await supabaseAdmin.auth.admin.getUserById(userId)
              
              if (verifyError && (verifyError.status === 404 || verifyError.message?.includes('not found'))) {
                authUserDeleted = true
                console.log(`[DELETE USER] ✅ Auth user deleted successfully: ${userId}`)
                break
              } else if (!verifyError && userAfterDelete?.user) {
                // User still exists, try again
                if (deletionAttempts < maxAttempts) {
                  await new Promise(resolve => setTimeout(resolve, 1000))
                  continue
                } else {
                  authDeleteError = { 
                    message: "User still exists after all deletion attempts", 
                    status: 500
                  }
                }
              } else {
                // Assume success if no user found
                authUserDeleted = true
                console.log(`[DELETE USER] ✅ Auth user deletion appears successful: ${userId}`)
                break
              }
            } else {
              if (deletionAttempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 1000))
                continue
              }
            }
          } catch (deleteException: any) {
            authDeleteError = {
              message: deleteException.message || "Unknown exception",
              status: 500
            }
            if (deletionAttempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 1000))
              continue
            }
          }
        }
      }
    } catch (error: any) {
      authDeleteError = error
      console.error("[DELETE USER] Exception deleting auth user:", error)
    }
    
    // Final verification
    const { data: finalAuthCheck } = await supabaseAdmin.auth.admin.getUserById(userId)
    const { data: finalProfileCheck } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single()

    const authUserActuallyDeleted = !finalAuthCheck?.user
    const profileActuallyDeleted = !finalProfileCheck

    // Return result based on what was actually deleted
    if (authUserActuallyDeleted && profileActuallyDeleted) {
      return NextResponse.json({ 
        success: true,
        message: "User and profile deleted successfully",
        deleted: {
          authUser: true,
          profile: true
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        message: "Deletion completed with some issues",
        deleted: {
          authUser: authUserActuallyDeleted,
          profile: profileActuallyDeleted
        },
        errors: {
          authUser: authDeleteError ? authDeleteError.message : (authUserActuallyDeleted ? null : "Auth user still exists"),
          profile: profileDeleteError ? profileDeleteError.message : (profileActuallyDeleted ? null : "Profile still exists")
        }
      }, { status: authUserActuallyDeleted && profileActuallyDeleted ? 200 : 500 })
    }
  } catch (error: any) {
    console.error("Error deleting user:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

