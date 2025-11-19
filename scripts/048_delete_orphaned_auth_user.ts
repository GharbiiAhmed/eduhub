/**
 * Script to delete orphaned auth users (users without profiles)
 * 
 * Usage:
 * 1. Set your environment variables in .env.local or .env:
 *    - NEXT_PUBLIC_SUPABASE_URL
 *    - SUPABASE_SERVICE_ROLE_KEY
 * 
 * 2. Run: npx tsx scripts/048_delete_orphaned_auth_user.ts [userId]
 * 
 * Or delete multiple users:
 * npx tsx scripts/048_delete_orphaned_auth_user.ts userId1 userId2 userId3
 */

// Load environment variables from .env files
import { config } from 'dotenv'
import { resolve } from 'path'

// Try to load .env.local first, then .env
const envPath = resolve(process.cwd(), '.env.local')
const envPathFallback = resolve(process.cwd(), '.env')

// Load .env.local if it exists, otherwise load .env
const result = config({ path: envPath })
if (result.error) {
  // If .env.local doesn't exist, try .env
  config({ path: envPathFallback })
}

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: Missing environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function deleteOrphanedUser(userId: string) {
  try {
    // First, verify the user doesn't have a profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (profile && !profileError) {
      console.error(`❌ User ${userId} has a profile. Cannot delete.`)
      return { success: false, reason: 'User has a profile' }
    }

    // Get user info before deletion
    const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId)
    
    if (getUserError) {
      console.error(`❌ Error fetching user ${userId}:`, getUserError.message)
      return { success: false, reason: getUserError.message }
    }

    const userEmail = userData?.user?.email || 'unknown'

    // Delete the auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error(`❌ Error deleting user ${userId} (${userEmail}):`, deleteError.message)
      return { success: false, reason: deleteError.message }
    }

    console.log(`✅ Successfully deleted orphaned user: ${userId} (${userEmail})`)
    return { success: true, userId, email: userEmail }
  } catch (error: any) {
    console.error(`❌ Unexpected error deleting user ${userId}:`, error.message)
    return { success: false, reason: error.message }
  }
}

async function deleteAllOrphanedUsers() {
  console.log('🔍 Finding all orphaned users...\n')

  try {
    // Get all profile IDs
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id')

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError.message)
      process.exit(1)
    }

    const profileIds = new Set(profiles?.map(p => p.id) || [])

    // Get all auth users
    let allAuthUsers: any[] = []
    let page = 1
    const perPage = 1000

    while (true) {
      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      })

      if (listError) {
        console.error('Error listing users:', listError.message)
        break
      }

      if (!users?.users || users.users.length === 0) {
        break
      }

      allAuthUsers = allAuthUsers.concat(users.users)

      if (users.users.length < perPage) {
        break
      }

      page++
    }

    // Find orphaned users
    const orphanedUsers = allAuthUsers.filter(
      authUser => !profileIds.has(authUser.id)
    )

    if (orphanedUsers.length === 0) {
      console.log('✅ No orphaned users found!')
      return
    }

    console.log(`Found ${orphanedUsers.length} orphaned user(s):\n`)
    orphanedUsers.forEach(user => {
      console.log(`  - ${user.id} (${user.email})`)
    })
    console.log()

    // Delete all orphaned users
    const results = []
    for (const user of orphanedUsers) {
      const result = await deleteOrphanedUser(user.id)
      results.push(result)
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Summary
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    console.log('\n📊 Summary:')
    console.log(`  ✅ Deleted: ${successful}`)
    console.log(`  ❌ Failed: ${failed}`)
  } catch (error: any) {
    console.error('Unexpected error:', error.message)
    process.exit(1)
  }
}

// Main execution
async function main() {
  const userIds = process.argv.slice(2)

  if (userIds.length === 0) {
    console.log('No user IDs provided. Deleting all orphaned users...\n')
    await deleteAllOrphanedUsers()
  } else if (userIds.length === 1 && userIds[0] === '--all') {
    await deleteAllOrphanedUsers()
  } else {
    // Delete specific users
    console.log(`Deleting ${userIds.length} user(s)...\n`)
    const results = []
    for (const userId of userIds) {
      const result = await deleteOrphanedUser(userId)
      results.push(result)
    }

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    console.log('\n📊 Summary:')
    console.log(`  ✅ Deleted: ${successful}`)
    console.log(`  ❌ Failed: ${failed}`)
  }
}

main().catch(console.error)

