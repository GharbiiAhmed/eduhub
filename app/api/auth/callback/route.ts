import { createClient as createServiceClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { sendWelcomeEmail } from "@/lib/email"

// Handle OAuth callback and create profile if needed
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  const error = requestUrl.searchParams.get('error')
  const errorCode = requestUrl.searchParams.get('error_code')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Log for debugging
  console.log('Auth callback - URL:', request.url)
  console.log('Auth callback - next param:', next)
  console.log('Auth callback - pathname:', requestUrl.pathname)
  
  // Safety check: if pathname contains undefined, redirect to a safe URL
  if (requestUrl.pathname.includes('undefined')) {
    console.error('Invalid pathname contains undefined:', requestUrl.pathname)
    // Try to extract locale from next parameter for safe redirect
    let safeLocale = 'en'
    if (next && typeof next === 'string') {
      const localeMatch = next.match(/^\/(en|es|fr|ar|de|it|pt|ru|zh|ja|ko)(\/|$)/)
      if (localeMatch && ['en', 'es', 'fr', 'ar', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko'].includes(localeMatch[1])) {
        safeLocale = localeMatch[1]
      }
    }
    const localePrefix = safeLocale !== 'en' ? `/${safeLocale}` : ''
    const safeRedirect = `${localePrefix}/auth/login?error=invalid_callback`
    return NextResponse.redirect(new URL(safeRedirect, request.url))
  }
  
  // Handle OAuth errors from Supabase
  if (error) {
    console.error('OAuth error received:', { error, errorCode, errorDescription })
    // Extract locale from next parameter for error redirect
    let locale: string | null = null
    const validLocales = ['en', 'es', 'fr', 'ar', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko']
    if (next && typeof next === 'string') {
      const localeMatch = next.match(/^\/(en|es|fr|ar|de|it|pt|ru|zh|ja|ko)(\/|$)/)
      if (localeMatch && validLocales.includes(localeMatch[1])) {
        locale = localeMatch[1]
      }
    }
    
    // Build error redirect URL
    const localePrefix = locale && locale !== 'en' ? `/${locale}` : ''
    const errorRedirect = `${localePrefix}/auth/login?error=oauth_error&error_code=${encodeURIComponent(errorCode || 'unknown')}`
    return NextResponse.redirect(new URL(errorRedirect, request.url))
  }
  
  // Extract locale from multiple sources to ensure we preserve it correctly
  let locale: string | null = null
  const validLocales = ['en', 'es', 'fr', 'ar', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko']
  
  // First, try to extract from the request URL pathname (in case Supabase redirects with locale)
  const pathname = requestUrl.pathname
  const pathnameLocaleMatch = pathname.match(/^\/(en|es|fr|ar|de|it|pt|ru|zh|ja|ko)(\/|$)/)
  if (pathnameLocaleMatch && validLocales.includes(pathnameLocaleMatch[1])) {
    locale = pathnameLocaleMatch[1]
  }
  
  // If not found in pathname, check next parameter
  if (!locale && next && typeof next === 'string') {
    const localeMatch = next.match(/^\/(en|es|fr|ar|de|it|pt|ru|zh|ja|ko)(\/|$)/)
    if (localeMatch && validLocales.includes(localeMatch[1])) {
      locale = localeMatch[1]
    }
  }
  
  // If still not found, try to extract from referer header
  if (!locale) {
    const referer = request.headers.get('referer')
    if (referer) {
      try {
        const refererUrl = new URL(referer)
        const refererLocaleMatch = refererUrl.pathname.match(/^\/(en|es|fr|ar|de|it|pt|ru|zh|ja|ko)(\/|$)/)
        if (refererLocaleMatch && validLocales.includes(refererLocaleMatch[1])) {
          locale = refererLocaleMatch[1]
        }
      } catch (e) {
        // Invalid referer URL, ignore
      }
    }
  }
  
  // Helper function to remove locale prefix from a path (handles multiple prefixes)
  const removeLocalePrefix = (path: string): string => {
    if (!path || typeof path !== 'string') return '/'
    let cleanedPath = path
    // Keep removing locale prefixes until none are found
    let changed = true
    let iterations = 0
    const maxIterations = 10 // Safety limit
    while (changed && iterations < maxIterations) {
      iterations++
      const localeMatch = cleanedPath.match(/^\/(en|es|fr|ar|de|it|pt|ru|zh|ja|ko)(\/.*|$)/)
      if (localeMatch) {
        const rest = localeMatch[2]
        // Handle empty string or undefined rest
        if (!rest || rest === '' || rest === '/') {
          cleanedPath = '/'
          changed = false
        } else {
          cleanedPath = rest
        }
      } else {
        changed = false
      }
    }
    // Ensure we return a valid path
    return cleanedPath || '/'
  }
  
  // Helper function to build locale-aware redirect URL
  const buildRedirectUrl = (path: string): URL => {
    // Ensure path is a valid string - strict validation
    let cleanPath: string = path
    if (!cleanPath || typeof cleanPath !== 'string') {
      console.warn('Invalid path provided to buildRedirectUrl:', path, typeof path)
      cleanPath = 'dashboard'
    }
    
    // Remove any undefined string literals
    cleanPath = cleanPath.replace(/undefined/g, '')
    
    // Remove locale prefix if it exists (to avoid duplication)
    cleanPath = removeLocalePrefix(cleanPath)
    
    // Remove leading slash if present
    cleanPath = cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath
    
    // Ensure cleanPath is not empty and doesn't contain undefined
    if (!cleanPath || cleanPath === '' || cleanPath.includes('undefined')) {
      console.warn('Path is empty or contains undefined, using dashboard fallback', { originalPath: path, cleanPath })
      cleanPath = 'dashboard'
    }
    
    // Validate locale before using it - ensure it's not undefined
    const safeLocale = locale && typeof locale === 'string' && locale !== 'undefined' && validLocales.includes(locale) ? locale : null
    
    // If locale is found and it's not 'en' (default), add locale prefix
    // Note: 'en' doesn't need a prefix based on routing config (mode: 'as-needed', en: false)
    if (safeLocale && safeLocale !== 'en') {
      // Double-check that safeLocale is a valid string
      if (typeof safeLocale !== 'string' || safeLocale.includes('undefined')) {
        console.error('Invalid safeLocale:', safeLocale, { locale })
        return new URL(`/${cleanPath}`, request.url)
      }
      
      const urlPath = `/${safeLocale}/${cleanPath}`
      // Final validation - ensure no undefined in the path
      if (urlPath.includes('undefined') || !urlPath || urlPath === '/') {
        console.error('URL path contains undefined or is invalid:', urlPath, { locale, safeLocale, cleanPath })
        // Fallback to path without locale
        return new URL(`/${cleanPath}`, request.url)
      }
      return new URL(urlPath, request.url)
    }
    // Otherwise, use path without locale prefix (for English or when locale is not found)
    return new URL(`/${cleanPath}`, request.url)
  }

  if (code) {
    const supabase = await createClient()
    
    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('OAuth callback error:', error)
      return NextResponse.redirect(buildRedirectUrl('auth/login?error=oauth_error'))
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
          return NextResponse.redirect(buildRedirectUrl('auth/pending-approval'))
        }
        
        if (finalProfile.status === 'banned' || finalProfile.status === 'inactive') {
          await supabase.auth.signOut()
          return NextResponse.redirect(buildRedirectUrl('auth/login?error=account_deactivated'))
        }

        if (finalProfile.role === 'admin') {
          return NextResponse.redirect(buildRedirectUrl('admin/dashboard'))
        } else if (finalProfile.role === 'instructor') {
          return NextResponse.redirect(buildRedirectUrl('instructor/dashboard'))
        } else {
          return NextResponse.redirect(buildRedirectUrl('student/courses'))
        }
      }
    }
  }

  // Default redirect - preserve locale if found
  return NextResponse.redirect(buildRedirectUrl(next))
}

