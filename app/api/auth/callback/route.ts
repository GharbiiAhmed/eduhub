import { createClient as createServiceClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { sendWelcomeEmail } from "@/lib/email"

// Handle OAuth callback and create profile if needed
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'

  if (code) {
    const supabase = await createClient()
    
    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('OAuth callback error:', error)
      return NextResponse.redirect(new URL('/auth/login?error=oauth_error', request.url))
    }

    if (data.user) {
      // Check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role, status, full_name')
        .eq('id', data.user.id)
        .single()

      // If profile doesn't exist, create it
      const isNewUser = !profile || profileError
      if (isNewUser) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
        
        if (supabaseServiceKey) {
          const supabaseAdmin = createServiceClient(supabaseUrl, supabaseServiceKey, {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          })

          // Extract name from user metadata or email
          const fullName = data.user.user_metadata?.full_name || 
                          data.user.user_metadata?.name || 
                          data.user.email?.split('@')[0] || 
                          'User'

          // Default to student role for OAuth users
          const profileData = {
            id: data.user.id,
            email: data.user.email || '',
            role: 'student',
            status: 'approved', // Auto-approve OAuth users
            full_name: fullName
          }

          const { data: newProfile } = await supabaseAdmin
            .from('profiles')
            .upsert(profileData, { onConflict: 'id' })
            .select()
            .single()

          // Send welcome email for new OAuth users
          if (newProfile && data.user.email) {
            try {
              await sendWelcomeEmail(
                data.user.email,
                fullName,
                'student'
              )
            } catch (emailError) {
              console.error('Failed to send welcome email to OAuth user:', emailError)
              // Don't fail the request if email fails
            }
          }
        }
      }

      // Redirect based on profile role
      const { data: finalProfile } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', data.user.id)
        .single()

      if (finalProfile) {
        if (finalProfile.status === 'pending') {
          return NextResponse.redirect(new URL('/auth/pending-approval', request.url))
        }
        
        if (finalProfile.status === 'banned' || finalProfile.status === 'inactive') {
          await supabase.auth.signOut()
          return NextResponse.redirect(new URL('/auth/login?error=account_deactivated', request.url))
        }

        if (finalProfile.role === 'admin') {
          return NextResponse.redirect(new URL('/admin/dashboard', request.url))
        } else if (finalProfile.role === 'instructor') {
          return NextResponse.redirect(new URL('/instructor/dashboard', request.url))
        } else {
          return NextResponse.redirect(new URL('/student/courses', request.url))
        }
      }
    }
  }

  // Default redirect
  return NextResponse.redirect(new URL(next, request.url))
}

