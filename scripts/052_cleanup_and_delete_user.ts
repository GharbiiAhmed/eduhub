/**
 * Script to cleanup related data and delete orphaned auth user
 * This script first removes all related data, then deletes the user
 * 
 * Usage:
 * npx tsx scripts/052_cleanup_and_delete_user.ts <USER_ID>
 */

// Load environment variables
import { config } from 'dotenv'
import { resolve } from 'path'

const envPath = resolve(process.cwd(), '.env.local')
const envPathFallback = resolve(process.cwd(), '.env')
const result = config({ path: envPath })
if (result.error) {
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

async function cleanupRelatedData(userId: string) {
  console.log('🧹 Cleaning up related data...\n')
  
  const tables = [
    { name: 'enrollments', column: 'student_id' },
    { name: 'book_purchases', column: 'student_id' },
    { name: 'payments', column: 'user_id' },
    { name: 'messages', column: 'sender_id', orColumn: 'receiver_id' },
    { name: 'forum_posts', column: 'author_id' },
    { name: 'lesson_progress', column: 'student_id' },
    { name: 'quiz_attempts', column: 'student_id' },
    { name: 'quiz_answers', column: 'student_id' },
    { name: 'certificates', column: 'student_id' },
    { name: 'lesson_notes', column: 'student_id' },
    { name: 'note_replies', column: 'author_id' },
    { name: 'conversations', column: 'participant_1_id', orColumn: 'participant_2_id' },
    { name: 'course_ratings', column: 'student_id' },
    { name: 'notifications', column: 'user_id' },
    { name: 'user_settings', column: 'user_id' },
    { name: 'subscriptions', column: 'user_id' },
    { name: 'chatbot_logs', column: 'user_id' },
    { name: 'assignments', column: 'instructor_id' },
    { name: 'assignment_submissions', column: 'student_id' },
    { name: 'meetings', column: 'instructor_id' },
    { name: 'meeting_participants', column: 'student_id' },
    { name: 'announcements', column: 'author_id' },
    { name: 'announcement_reads', column: 'user_id' },
    { name: 'help_articles', column: 'author_id' },
    { name: 'help_article_feedback', column: 'user_id' },
  ]

  let totalDeleted = 0

  for (const table of tables) {
    try {
      let query = supabaseAdmin.from(table.name).delete()
      
      if (table.orColumn) {
        // Handle tables with OR conditions (like messages, conversations)
        const { error: error1 } = await query.eq(table.column, userId)
        if (!error1) {
          const { error: error2 } = await supabaseAdmin
            .from(table.name)
            .delete()
            .eq(table.orColumn, userId)
          if (error2 && error2.code !== 'PGRST116') {
            console.log(`  ⚠️  ${table.name}: ${error2.message}`)
          } else {
            totalDeleted++
          }
        } else if (error1.code !== 'PGRST116') {
          console.log(`  ⚠️  ${table.name}: ${error1.message}`)
        } else {
          totalDeleted++
        }
      } else {
        const { error } = await query.eq(table.column, userId)
        if (error && error.code !== 'PGRST116') {
          console.log(`  ⚠️  ${table.name}: ${error.message}`)
        } else {
          totalDeleted++
        }
      }
    } catch (error: any) {
      // Table might not exist, skip it
      if (!error.message.includes('does not exist')) {
        console.log(`  ⚠️  ${table.name}: ${error.message}`)
      }
    }
  }

  console.log(`✅ Cleaned up data from ${totalDeleted} table(s)\n`)
  return totalDeleted
}

async function deleteUser(userId: string) {
  try {
    console.log(`🗑️  Deleting user: ${userId}...\n`)

    // Get user info
    const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId)
    
    if (getUserError) {
      console.error(`❌ Error fetching user: ${getUserError.message}`)
      return { success: false, reason: getUserError.message }
    }

    const userEmail = userData?.user?.email || 'unknown'
    console.log(`User email: ${userEmail}\n`)

    // Verify user doesn't have a profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (profile) {
      console.error('❌ User has a profile. Cannot delete orphaned user.')
      return { success: false, reason: 'User has a profile' }
    }

    // Clean up related data first
    await cleanupRelatedData(userId)

    // Try to delete the auth user
    console.log('🗑️  Attempting to delete auth user...')
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error(`❌ Error deleting user: ${deleteError.message}`)
      console.error(`\n💡 This might be due to:`)
      console.error(`   - Active sessions that need to be cleared`)
      console.error(`   - Database constraints or triggers`)
      console.error(`   - Supabase internal data`)
      console.error(`\n💡 Try:`)
      console.error(`   1. Wait a few minutes and try again`)
      console.error(`   2. Check Supabase dashboard for any active sessions`)
      console.error(`   3. Contact Supabase support if the issue persists`)
      return { success: false, reason: deleteError.message }
    }

    console.log(`✅ Successfully deleted user: ${userId} (${userEmail})`)
    return { success: true, userId, email: userEmail }
  } catch (error: any) {
    console.error(`❌ Unexpected error: ${error.message}`)
    return { success: false, reason: error.message }
  }
}

// Main execution
const userId = process.argv[2]

if (!userId) {
  console.error('Usage: npx tsx scripts/052_cleanup_and_delete_user.ts <USER_ID>')
  process.exit(1)
}

deleteUser(userId)
  .then(result => {
    if (result.success) {
      console.log('\n✅ User deleted successfully!')
      process.exit(0)
    } else {
      console.log('\n❌ Failed to delete user')
      process.exit(1)
    }
  })
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })





















