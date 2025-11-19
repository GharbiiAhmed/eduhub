"use client"

import React, { useState, useEffect } from 'react'
import { Link, usePathname } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  BookOpen, 
  GraduationCap, 
  Home, 
  Menu, 
  Search, 
  Settings, 
  User, 
  LogOut,
  Bell,
  HelpCircle,
  Moon,
  Sun,
  LayoutDashboard
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from '@/i18n/routing'
import { NotificationDropdown } from '@/components/notifications/notification-dropdown'
import { LanguageSwitcher } from '@/components/language-switcher'

interface NavigationProps {
  userType?: 'student' | 'instructor' | 'admin'
  user?: any
}

export function Navigation({ userType: propUserType, user: propUser }: NavigationProps) {
  const t = useTranslations()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<any>(propUser)
  const [userType, setUserType] = useState<'student' | 'instructor' | 'admin' | undefined>(propUserType)
  const [userStatus, setUserStatus] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
    const isDarkMode = document.documentElement.classList.contains("dark")
    setIsDark(isDarkMode)
  }, [])

  // Fetch user state if not provided as prop
  useEffect(() => {
    let isMounted = true

    const fetchUser = async () => {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
        
        if (!isMounted) return

        if (authError || !authUser) {
          setUser(null)
          setUserType(undefined)
          setLoading(false)
          return
        }

        setUser(authUser)

        // Fetch user profile to get role and status
        // Handle case where profile might not exist yet (during signup)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, status')
          .eq('id', authUser.id)
          .single()

        if (!isMounted) return

        // Only set profile data if it exists and there's no error
        if (!profileError && profile) {
          if (profile.role) {
            setUserType(profile.role as 'student' | 'instructor' | 'admin')
          }
          if (profile.status) {
            setUserStatus(profile.status)
          }
        }
        setLoading(false)
      } catch (error) {
        if (!isMounted) return
        console.error('Error fetching user:', error)
        setUser(null)
        setUserType(undefined)
        setLoading(false)
      }
    }

    // Only fetch if not provided as prop
    if (!propUser) {
      fetchUser()
    } else {
      setUser(propUser)
      setUserType(propUserType)
      setLoading(false)
    }

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return

      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        // Fetch profile for role and status
        // If profile doesn't exist (user was deleted), sign out immediately
        supabase
          .from('profiles')
          .select('role, status')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profile, error: profileError }) => {
            if (!isMounted) return
            // If profile doesn't exist (user was deleted), sign out immediately
            if (!profile || profileError) {
              supabase.auth.signOut()
              setUser(null)
              setUserType(undefined)
              setUserStatus(undefined)
              return
            }
            // Only set profile data if it exists and there's no error
            if (profile.role) {
              setUserType(profile.role as 'student' | 'instructor' | 'admin')
            }
            if (profile.status) {
              setUserStatus(profile.status)
            }
          })
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setUserType(undefined)
        setUserStatus(undefined)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, []) // Empty dependency array - only run once on mount

  // Sync props to state when they change (if provided)
  // Using a stable dependency structure - always include both props
  useEffect(() => {
    if (propUser !== undefined) {
      setUser(propUser)
    }
    if (propUserType !== undefined) {
      setUserType(propUserType)
    }
  }, [propUser ?? null, propUserType ?? null]) // Use null instead of undefined to keep array size constant

  const toggleTheme = () => {
    if (!mounted) return
    const html = document.documentElement
    const isDarkMode = html.classList.contains("dark")

    if (isDarkMode) {
      html.classList.remove("dark")
      localStorage.setItem("theme", "light")
      setIsDark(false)
    } else {
      html.classList.add("dark")
      localStorage.setItem("theme", "dark")
      setIsDark(true)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  // Navigation items based on user state
  const getNavigationItems = () => {
    // If user is pending, don't show any navigation items (except logout)
    if (userStatus === 'pending') {
      return []
    }

    const items = [
      { href: '/courses', label: t('common.courses'), icon: GraduationCap },
      { href: '/books', label: t('common.books'), icon: BookOpen },
    ]

    // Add Dashboard link if user is logged in and approved
    if (user && userType && userStatus !== 'pending') {
      const dashboardPath = `/${userType}/dashboard`
      items.unshift({ href: dashboardPath, label: t('common.dashboard'), icon: LayoutDashboard })
    }

    return items
  }

  const navigationItems = getNavigationItems()

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex justify-between items-center h-14">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                EduHub
              </span>
            </Link>
          </div>

          {/* Desktop Navigation - Only show for public users */}
          {navigationItems.length > 0 && (
            <div className="hidden md:flex items-center space-x-4">
              {navigationItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || 
                  (item.href !== '/' && pathname.startsWith(item.href))
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Right side - Search, Notifications, User Menu */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Search - Compact design - Only show for approved users */}
            {userStatus !== 'pending' && (
              <div className="hidden sm:block">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder={t('common.search')}
                    className="pl-8 pr-3 py-1.5 w-48 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {mounted ? (
                isDark ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            {/* Notifications - Only show for approved users */}
            {user && userStatus !== 'pending' && <NotificationDropdown userId={user.id} />}

            {/* User Menu */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email} />
                      <AvatarFallback className="text-xs">
                        {user.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.user_metadata?.full_name || user.email}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {/* Only show menu items if user is not pending */}
                  {userStatus !== 'pending' && (
                    <>
                      {userType && (
                        <DropdownMenuItem asChild>
                          <Link href={`/${userType}/dashboard`} className="flex items-center">
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            <span>{t('common.dashboard')}</span>
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <Link href="/profile" className="flex items-center">
                          <User className="mr-2 h-4 w-4" />
                          <span>{t('navigation.profile')}</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/settings" className="flex items-center">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>{t('common.settings')}</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/help" className="flex items-center">
                          <HelpCircle className="mr-2 h-4 w-4" />
                          <span>{t('navigation.help')}</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {/* Show pending message if user is pending */}
                  {userStatus === 'pending' && (
                    <>
                      <DropdownMenuItem disabled className="text-yellow-600 dark:text-yellow-400">
                        <span className="text-xs">Account pending approval</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t('common.logout')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <Button variant="ghost" size="sm" asChild className="text-sm">
                  <Link href="/auth/login">{t('common.login')}</Link>
                </Button>
                <Button size="sm" asChild className="text-sm">
                  <Link href="/auth/sign-up">{t('common.signup')}</Link>
                </Button>
              </div>
            )}

            {/* Mobile menu button */}
            {navigationItems.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden h-9 w-9 p-0"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <Menu className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && navigationItems.length > 0 && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50 dark:bg-gray-800">
              {navigationItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || 
                  (item.href !== '/' && pathname.startsWith(item.href))
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}


