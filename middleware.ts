import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import { updateSession } from "@/lib/supabase/middleware"
import { createClient } from "@/lib/supabase/server"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const intlMiddleware = createMiddleware(routing)

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Handle paths with undefined in them (malformed URLs from OAuth redirects)
  if (pathname.includes('undefined')) {
    console.error('Middleware: Detected undefined in pathname:', pathname)
    // Try to extract locale and redirect to login
    const localeMatch = pathname.match(/^\/(en|es|fr|ar|de|it|pt|ru|zh|ja|ko)/)
    const locale = localeMatch ? localeMatch[1] : 'en'
    const localePrefix = locale !== 'en' ? `/${locale}` : ''
    
    // Check if there's a code parameter (OAuth callback)
    const code = request.nextUrl.searchParams.get('code')
    const next = request.nextUrl.searchParams.get('next')
    
    if (code) {
      // This is an OAuth callback with malformed path - redirect to API callback
      const newUrl = new URL('/api/auth/callback', request.url)
      // Preserve all query parameters
      request.nextUrl.searchParams.forEach((value, key) => {
        newUrl.searchParams.set(key, value)
      })
      return NextResponse.redirect(newUrl)
    }
    
    // Otherwise redirect to login
    const redirectUrl = `${localePrefix}/auth/login?error=invalid_url`
    return NextResponse.redirect(new URL(redirectUrl, request.url))
  }
  
  // Redirect locale-prefixed API routes to non-prefixed versions
  // API routes should never have locale prefixes
  const localePrefixedApiMatch = pathname.match(/^\/(ar|fr|es|de|it|pt|ru|zh|ja|ko)\/api\/(.+)$/)
  if (localePrefixedApiMatch) {
    const apiPath = localePrefixedApiMatch[2]
    const newUrl = new URL(`/api/${apiPath}`, request.url)
    newUrl.search = request.nextUrl.search // Preserve query parameters
    return NextResponse.redirect(newUrl)
  }
  
  // Skip locale processing for API routes - they should always be accessed without locale prefix
  if (pathname.startsWith('/api/')) {
    // Just handle Supabase session for API routes
    return await updateSession(request)
  }
  
  // Handle internationalization for non-API routes
  const intlResponse = intlMiddleware(request)

  // Then handle Supabase session
  const supabaseResponse = await updateSession(request)

  // Merge responses - use intl response as base
  const response = intlResponse || supabaseResponse

  // Check maintenance mode (only for non-admin routes)
  // Skip maintenance check for admin routes, API routes, and static files
  if (
    !pathname.startsWith('/admin') &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/_next') &&
    !pathname.match(/\.(ico|png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|eot)$/)
  ) {
    try {
      const supabase = await createClient()
      
      // Get maintenance mode setting
      const { data: maintenanceSetting } = await supabase
        .from("website_settings")
        .select("setting_value")
        .eq("setting_key", "maintenance_mode")
        .eq("is_public", true)
        .single()

      if (maintenanceSetting?.setting_value === "true") {
        // Allow access to auth pages and admin pages
        if (!pathname.startsWith('/auth') && !pathname.startsWith('/admin')) {
          // Check if user is admin
          const {
            data: { user },
          } = await supabase.auth.getUser()

          if (user) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("role")
              .eq("id", user.id)
              .single()

            // Allow admins to access even during maintenance
            if (profile?.role !== "admin") {
              // Redirect to maintenance page or show maintenance message
              // For now, we'll let the client-side component handle it
              // but we could redirect here if needed
            }
          } else {
            // Non-authenticated users see maintenance
            // Client-side component will handle the display
          }
        }
      }
    } catch (error) {
      // If error checking maintenance mode, continue normally
      console.error("Error checking maintenance mode:", error)
    }
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
