/**
 * Quick script to delete orphaned user
 * 
 * Usage:
 * node scripts/051_quick_delete_user.js <SUPABASE_URL> <SERVICE_ROLE_KEY> <USER_ID>
 * 
 * Example:
 * node scripts/051_quick_delete_user.js https://xxx.supabase.co eyJxxx... 6680c6a7-5470-47c1-918e-f8ca11e89754
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.argv[2]
const serviceRoleKey = process.argv[3]
const userId = process.argv[4]

if (!supabaseUrl || !serviceRoleKey || !userId) {
  console.error('Usage: node scripts/051_quick_delete_user.js <SUPABASE_URL> <SERVICE_ROLE_KEY> <USER_ID>')
  console.error('\nExample:')
  console.error('node scripts/051_quick_delete_user.js https://xxx.supabase.co eyJxxx... 6680c6a7-5470-47c1-918e-f8ca11e89754')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function deleteUser() {
  try {
    console.log(`Deleting user: ${userId}...`)
    
    // Verify user doesn't have a profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (profile) {
      console.error('❌ User has a profile. Cannot delete orphaned user.')
      process.exit(1)
    }

    // Get user info
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId)
    const email = userData?.user?.email || 'unknown'
    console.log(`User email: ${email}`)

    // Delete the auth user
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (error) {
      console.error('❌ Error:', error.message)
      process.exit(1)
    }

    console.log(`✅ Successfully deleted user: ${userId} (${email})`)
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    process.exit(1)
  }
}

deleteUser()

