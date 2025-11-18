import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn("[v0] Supabase environment variables not configured. Skipping middleware.")
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
      },
    },
  })

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Redirect unauthenticated users to login (but allow public routes)
    if (!user && !request.nextUrl.pathname.startsWith("/auth") && !request.nextUrl.pathname.startsWith("/")) {
      const url = request.nextUrl.clone()
      url.pathname = "/auth/login"
      return NextResponse.redirect(url)
    }

    // Check user status for authenticated users
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("status")
        .eq("id", user.id)
        .single()

      // If profile doesn't exist (user was deleted), block access and redirect to login
      // This prevents deleted users from accessing the system
      if (!profile && !request.nextUrl.pathname.startsWith("/auth")) {
        const url = request.nextUrl.clone()
        url.pathname = "/auth/login"
        // Clear auth session by signing out
        await supabase.auth.signOut()
        return NextResponse.redirect(url)
      }

      // If user is pending, redirect to pending approval page (except for auth routes and pending approval page itself)
      const pathname = request.nextUrl.pathname
      const isAuthRoute = pathname.includes("/auth/")
      const isPendingApprovalPage = pathname.includes("/pending-approval")
      const isPublicRoute = pathname === "/" || pathname.match(/^\/(en|es|fr|ar|de|it|pt|ru|zh|ja|ko)?\/?$/)
      
      if (profile?.status === 'pending' && 
          !isAuthRoute && 
          !isPendingApprovalPage &&
          !isPublicRoute) {
        const url = request.nextUrl.clone()
        // Preserve locale if present
        const locale = pathname.split('/')[1]
        if (locale && ['en', 'es', 'fr', 'ar', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko'].includes(locale)) {
          url.pathname = `/${locale}/auth/pending-approval`
        } else {
          url.pathname = "/auth/pending-approval"
        }
        return NextResponse.redirect(url)
      }

      // If user is banned or inactive, redirect to login (except for auth routes)
      if ((profile?.status === 'banned' || profile?.status === 'inactive') && 
          !request.nextUrl.pathname.startsWith("/auth")) {
        const url = request.nextUrl.clone()
        url.pathname = "/auth/login"
        return NextResponse.redirect(url)
      }
    }
  } catch (error) {
    console.warn("[v0] Error getting user in middleware:", error)
    // Continue without user info if there's an error
  }

  return supabaseResponse
}
