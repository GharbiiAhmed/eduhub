import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

// POST - Cleanup orphaned auth users (users without profiles)
// This endpoint finds and deletes auth users that don't have a corresponding profile
export async function POST(request: NextRequest) {
  try {
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

    // Use service role client - REQUIRED for accessing auth.users
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: "Service role key not configured" },
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

    // Get all profile IDs
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id")

    if (profilesError) {
      return NextResponse.json(
        { error: `Failed to fetch profiles: ${profilesError.message}` },
        { status: 500 }
      )
    }

    const profileIds = new Set(profiles?.map(p => p.id) || [])

    // Get all auth users
    // Note: We can't directly query auth.users via Supabase client
    // We need to use the Admin API to list users
    // For now, we'll get users from profiles and check if any auth users exist without profiles
    // This is a limitation - we can only clean up users we know about

    // Alternative approach: Get all users from auth via Admin API
    // This requires pagination as Admin API returns users in batches
    let allAuthUsers: any[] = []
    let page = 1
    const perPage = 1000

    try {
      // Get users page by page
      while (true) {
        const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage,
        })

        if (listError) {
          console.error("Error listing users:", listError)
          break
        }

        if (!users?.users || users.users.length === 0) {
          break
        }

        allAuthUsers = allAuthUsers.concat(users.users)
        
        // If we got fewer users than perPage, we've reached the end
        if (users.users.length < perPage) {
          break
        }

        page++
      }
    } catch (error: any) {
      console.error("Error fetching auth users:", error)
      return NextResponse.json(
        { error: `Failed to fetch auth users: ${error.message}` },
        { status: 500 }
      )
    }

    // Find orphaned users (users without profiles)
    const orphanedUsers = allAuthUsers.filter(
      authUser => !profileIds.has(authUser.id)
    )

    if (orphanedUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No orphaned users found",
        deleted: 0,
      })
    }

    // Delete orphaned users
    const deleted: string[] = []
    const failed: Array<{ id: string; error: string }> = []

    for (const orphanedUser of orphanedUsers) {
      try {
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
          orphanedUser.id
        )

        if (deleteError) {
          failed.push({
            id: orphanedUser.id,
            error: deleteError.message,
          })
        } else {
          deleted.push(orphanedUser.id)
        }
      } catch (error: any) {
        failed.push({
          id: orphanedUser.id,
          error: error.message || "Unknown error",
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleanup completed. Deleted ${deleted.length} orphaned users.`,
      deleted: deleted.length,
      failed: failed.length,
      deletedUsers: deleted,
      failedUsers: failed,
      totalOrphaned: orphanedUsers.length,
    })
  } catch (error: any) {
    console.error("Error cleaning up orphaned users:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

