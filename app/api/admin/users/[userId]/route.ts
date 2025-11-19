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

    // IMPORTANT: Delete auth user FIRST, then profile
    // This ensures both are deleted together, or neither is deleted
    // If auth deletion fails, we don't delete the profile (user can still access system)
    console.log(`[DELETE USER] Attempting to delete auth user: ${userId}`)
    
    try {
      // Verify user exists in auth before deletion
      const { data: userBeforeDelete, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId)
      
      if (getUserError) {
        console.error("[DELETE USER] Error fetching user before delete:", getUserError)
        return NextResponse.json(
          { 
            error: `User not found in auth: ${getUserError.message}`,
            details: "Cannot delete user that doesn't exist"
          },
          { status: 404 }
        )
      }
      
      if (!userBeforeDelete?.user) {
        console.error("[DELETE USER] User not found in auth.users")
        return NextResponse.json(
          { 
            error: "User not found in auth.users",
            details: "User may have already been deleted"
          },
          { status: 404 }
        )
      }
      
      console.log(`[DELETE USER] User found: ${userBeforeDelete.user.email}`)
      
      // Delete the auth user - try multiple times if needed
      let authDeleteError: any = null
      let deletionAttempts = 0
      const maxAttempts = 3
      let authUserDeleted = false
      
      while (deletionAttempts < maxAttempts && !authUserDeleted) {
        deletionAttempts++
        console.log(`[DELETE USER] Attempt ${deletionAttempts}/${maxAttempts}: Deleting auth user ${userId}...`)
        
        try {
          const deleteResult = await supabaseAdmin.auth.admin.deleteUser(userId)
          authDeleteError = deleteResult.error
          
          console.log(`[DELETE USER] Delete result:`, {
            hasError: !!authDeleteError,
            error: authDeleteError ? {
              message: authDeleteError.message,
              status: authDeleteError.status,
              name: authDeleteError.name
            } : null
          })
          
          if (!authDeleteError) {
            // Wait a moment for deletion to propagate
            console.log(`[DELETE USER] Waiting for deletion to propagate...`)
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            // Verify deletion succeeded
            console.log(`[DELETE USER] Verifying deletion...`)
            const { data: userAfterDelete, error: verifyError } = await supabaseAdmin.auth.admin.getUserById(userId)
            
            console.log(`[DELETE USER] Verification result:`, {
              hasError: !!verifyError,
              errorStatus: verifyError?.status,
              userExists: !!userAfterDelete?.user,
              userId: userAfterDelete?.user?.id
            })
            
            // If verifyError exists and it's a 404, user was deleted successfully
            // If verifyError is null and userAfterDelete exists, user still exists
            if (verifyError && (verifyError.status === 404 || verifyError.message?.includes('not found'))) {
              // User was deleted successfully (404 = not found)
              console.log(`[DELETE USER] ✅ Auth user deleted successfully (verified with 404): ${userId}`)
              authUserDeleted = true
              break
            } else if (!verifyError && userAfterDelete?.user) {
              // User still exists, try again
              console.log(`[DELETE USER] ⚠️ User still exists after attempt ${deletionAttempts}`)
              console.log(`[DELETE USER] User details:`, {
                id: userAfterDelete.user.id,
                email: userAfterDelete.user.email
              })
              if (deletionAttempts < maxAttempts) {
                console.log(`[DELETE USER] Retrying in 1 second...`)
                await new Promise(resolve => setTimeout(resolve, 1000))
                continue
              } else {
                authDeleteError = { 
                  message: "User still exists after all deletion attempts", 
                  status: 500,
                  details: "The deleteUser API call returned success but the user was not actually deleted"
                }
              }
            } else {
              // Unexpected state - assume success if no user found
              console.log(`[DELETE USER] ✅ Deletion appears successful (no user found in verification)`)
              authUserDeleted = true
              break
            }
          } else {
            // Error occurred, log it
            console.error(`[DELETE USER] ❌ Error on attempt ${deletionAttempts}:`, {
              message: authDeleteError.message,
              status: authDeleteError.status,
              name: authDeleteError.name
            })
            if (deletionAttempts < maxAttempts) {
              console.log(`[DELETE USER] Retrying in 1 second...`)
              await new Promise(resolve => setTimeout(resolve, 1000))
              continue
            }
          }
        } catch (deleteException: any) {
          console.error(`[DELETE USER] Exception during deletion attempt ${deletionAttempts}:`, deleteException)
          authDeleteError = {
            message: deleteException.message || "Unknown exception",
            status: 500,
            exception: deleteException.constructor?.name
          }
          if (deletionAttempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000))
            continue
          }
        }
      }
      
      // Final check: if auth user was not deleted, DO NOT proceed with profile deletion
      if (!authUserDeleted) {
        if (authDeleteError) {
          console.error("[DELETE USER] ❌ Auth user deletion failed after all attempts:", authDeleteError)
          console.error("[DELETE USER] Error details:", {
            message: authDeleteError.message,
            status: authDeleteError.status,
            attempts: deletionAttempts
          })
        } else {
          // No error but user still exists - this is a critical issue
          const { data: finalCheck, error: finalError } = await supabaseAdmin.auth.admin.getUserById(userId)
          if (!finalError && finalCheck?.user) {
            console.error("[DELETE USER] ❌ CRITICAL: User still exists after deletion attempts!")
            authDeleteError = {
              message: "User still exists after deletion attempts",
              status: 500,
              userId: userId
            }
          }
        }
        
        // DO NOT delete profile if auth user deletion failed
        return NextResponse.json(
          { 
            error: `Failed to delete auth user: ${authDeleteError?.message || "Unknown error"}`,
            errorCode: authDeleteError?.status || 500,
            details: "User profile was NOT deleted to maintain data integrity. Auth user deletion failed.",
            userId: userId,
            attempts: deletionAttempts,
            authUserDeleted: false
          },
          { status: 500 }
        )
      }
      
      // Final verification - double check before proceeding
      const { data: finalCheck, error: finalError } = await supabaseAdmin.auth.admin.getUserById(userId)
      if (!finalError && finalCheck?.user) {
        console.error("[DELETE USER] ❌ CRITICAL: User still exists after successful deletion!")
        return NextResponse.json(
          { 
            error: "Auth user deletion verification failed - user still exists",
            details: "The auth user could not be deleted. Profile was NOT deleted to maintain data integrity.",
            userId: userId
          },
          { status: 500 }
        )
      }
      
      console.log(`[DELETE USER] ✅ Auth user confirmed deleted: ${userId}`)
    } catch (error: any) {
      console.error("[DELETE USER] Exception deleting auth user:", error)
      console.error("[DELETE USER] Error stack:", error.stack)
      return NextResponse.json(
        { 
          error: `Failed to delete auth user: ${error.message || "Unknown error"}`,
          errorType: error.constructor?.name,
          details: "User profile was not deleted to maintain data integrity",
          userId: userId
        },
        { status: 500 }
      )
    }

    // Now delete the profile record (not the table, just the user's profile row)
    // This will cascade delete related data due to foreign keys
    console.log(`[DELETE USER] Deleting profile record for user: ${userId}`)
    
    const { error: deleteError, data: deleteData } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId)
      .select()

    if (deleteError) {
      console.error("[DELETE USER] Error deleting user profile:", deleteError)
      // Auth user is already deleted, but profile deletion failed
      // Log this as a critical error - user can't authenticate but profile still exists
      console.error("[DELETE USER] CRITICAL: Auth user deleted but profile deletion failed. User ID:", userId)
      return NextResponse.json(
        { 
          error: `Auth user deleted but profile deletion failed: ${deleteError.message}`,
          warning: "User cannot authenticate, but profile data remains. Manual cleanup may be required.",
          userId: userId
        },
        { status: 500 }
      )
    }

    console.log(`[DELETE USER] ✅ Profile record deleted successfully. Deleted rows:`, deleteData?.length || 0)
    
    // Final verification: Check that both auth user and profile are gone
    const { data: finalAuthCheck } = await supabaseAdmin.auth.admin.getUserById(userId)
    const { data: finalProfileCheck } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single()

    if (finalAuthCheck?.user) {
      console.error("[DELETE USER] WARNING: Auth user still exists after deletion!")
    }
    
    if (finalProfileCheck) {
      console.error("[DELETE USER] WARNING: Profile still exists after deletion!")
    }

    return NextResponse.json({ 
      success: true,
      message: "User deleted successfully",
      deleted: {
        authUser: !finalAuthCheck?.user,
        profile: !finalProfileCheck
      }
    })
  } catch (error: any) {
    console.error("Error deleting user:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

