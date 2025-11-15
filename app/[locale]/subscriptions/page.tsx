"use client"

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  CreditCard, 
  Calendar, 
  DollarSign,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  BookOpen,
  FileText,
  ArrowLeft,
  Loader2,
  TrendingUp,
  Clock
} from "lucide-react"
import { Link } from '@/i18n/routing'
import Image from "next/image"
import { toast } from "@/hooks/use-toast"
import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'

interface Subscription {
  id: string
  user_id: string
  course_id: string | null
  book_id: string | null
  stripe_subscription_id: string
  stripe_customer_id: string
  stripe_price_id: string
  status: string
  billing_cycle: 'monthly' | 'yearly'
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  canceled_at: string | null
  created_at: string
  updated_at: string
  courses?: {
    id: string
    title: string
    thumbnail_url: string | null
  } | null
  books?: {
    id: string
    title: string
    cover_url: string | null
  } | null
}

export default function SubscriptionsPage() {
  const t = useTranslations('subscriptions')
  const tCommon = useTranslations('common')
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [canceling, setCanceling] = useState<string | null>(null)
  const [resuming, setResuming] = useState<string | null>(null)
  const [userType, setUserType] = useState<'student' | 'instructor' | 'admin' | undefined>()
  const supabase = createClient()

  useEffect(() => {
    fetchSubscriptions()
    fetchUserType()
  }, [])

  const fetchUserType = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()
      
      if (profile) {
        setUserType(profile.role as 'student' | 'instructor' | 'admin')
      }
    }
  }

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch('/api/subscriptions')
      if (!response.ok) {
        throw new Error('Failed to fetch subscriptions')
      }
      const data = await response.json()
      setSubscriptions(data.subscriptions || [])
    } catch (error) {
      console.error('Error fetching subscriptions:', error)
      toast({
        title: tCommon('error'),
        description: t('failedToLoad'),
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (subscriptionId: string) => {
    setCanceling(subscriptionId)
    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to cancel subscription')
      }

      toast({
        title: tCommon('success'),
        description: t('subscriptionWillBeCanceled'),
      })

      // Refresh subscriptions
      await fetchSubscriptions()
    } catch (error) {
      console.error('Error canceling subscription:', error)
      toast({
        title: tCommon('error'),
        description: t('failedToCancelSubscription'),
        variant: "destructive"
      })
    } finally {
      setCanceling(null)
    }
  }

  const handleResume = async (subscriptionId: string) => {
    setResuming(subscriptionId)
    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}/resume`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to resume subscription')
      }

      toast({
        title: "Success",
        description: "Subscription resumed successfully",
      })

      // Refresh subscriptions
      await fetchSubscriptions()
    } catch (error) {
      console.error('Error resuming subscription:', error)
      toast({
        title: "Error",
        description: "Failed to resume subscription",
        variant: "destructive"
      })
    } finally {
      setResuming(null)
    }
  }

  const getStatusBadge = (status: string, cancelAtPeriodEnd: boolean) => {
    if (cancelAtPeriodEnd) {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          <Clock className="w-3 h-3 mr-1" />
          Canceling
        </Badge>
      )
    }

    switch (status) {
      case 'active':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        )
      case 'past_due':
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            Past Due
          </Badge>
        )
      case 'canceled':
        return (
          <Badge variant="secondary">
            <XCircle className="w-3 h-3 mr-1" />
            Canceled
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary">
            {status}
          </Badge>
        )
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const isExpired = (periodEnd: string) => {
    return new Date(periodEnd) < new Date()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        <Navigation userType={userType} />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <Navigation userType={userType} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href={userType === 'student' ? '/student/dashboard' : userType === 'instructor' ? '/instructor/dashboard' : '/admin/dashboard'}>
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('backToDashboard')}
              </Button>
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('mySubscriptions')}</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {t('manageSubscriptions')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        {subscriptions.length === 0 ? (
          <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardContent className="py-12 text-center">
              <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {t('noActiveSubscriptions')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {t('noActiveSubscriptionsDesc')}
              </p>
              <div className="flex gap-4 justify-center">
                <Button asChild>
                  <Link href="/courses">
                    <BookOpen className="w-4 h-4 mr-2" />
                    {t('browseCourses')}
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/books">
                    <FileText className="w-4 h-4 mr-2" />
                    {t('browseBooks')}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Active Subscriptions */}
            {subscriptions.filter(sub => sub.status === 'active' && !isExpired(sub.current_period_end)).length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Active Subscriptions
                </h2>
                <div className="grid gap-6">
                  {subscriptions
                    .filter(sub => sub.status === 'active' && !isExpired(sub.current_period_end))
                    .map((subscription) => (
                      <Card key={subscription.id} className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4 flex-1">
                              {subscription.courses?.thumbnail_url ? (
                                <Image
                                  src={subscription.courses.thumbnail_url}
                                  alt={subscription.courses.title}
                                  width={80}
                                  height={60}
                                  className="rounded-lg object-cover"
                                />
                              ) : subscription.books?.cover_url ? (
                                <Image
                                  src={subscription.books.cover_url}
                                  alt={subscription.books.title}
                                  width={80}
                                  height={60}
                                  className="rounded-lg object-cover"
                                />
                              ) : (
                                <div className="w-20 h-15 bg-gradient-to-br from-blue-400 to-purple-400 rounded-lg flex items-center justify-center">
                                  {subscription.courses ? (
                                    <BookOpen className="w-8 h-8 text-white" />
                                  ) : (
                                    <FileText className="w-8 h-8 text-white" />
                                  )}
                                </div>
                              )}
                              
                              <div className="flex-1">
                                <CardTitle className="mb-2">
                                  {subscription.courses?.title || subscription.books?.title || 'Unknown'}
                                </CardTitle>
                                <CardDescription>
                                  {subscription.courses ? 'Course Subscription' : 'Book Subscription'}
                                </CardDescription>
                                <div className="flex items-center gap-3 mt-3">
                                  {getStatusBadge(subscription.status, subscription.cancel_at_period_end)}
                                  <Badge variant="outline">
                                    {subscription.billing_cycle === 'monthly' ? 'Monthly' : 'Yearly'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              {subscription.cancel_at_period_end ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleResume(subscription.id)}
                                  disabled={resuming === subscription.id}
                                >
                                  {resuming === subscription.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                  ) : (
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                  )}
                                  Resume
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCancel(subscription.id)}
                                  disabled={canceling === subscription.id}
                                >
                                  {canceling === subscription.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                  ) : (
                                    <XCircle className="w-4 h-4 mr-2" />
                                  )}
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                              <Calendar className="w-5 h-5 text-blue-600" />
                              <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Current Period</p>
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                              <Clock className="w-5 h-5 text-purple-600" />
                              <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {subscription.cancel_at_period_end ? 'Cancels On' : 'Renews On'}
                                </p>
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  {formatDate(subscription.current_period_end)}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                              <TrendingUp className="w-5 h-5 text-green-600" />
                              <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Billing Cycle</p>
                                <p className="font-semibold text-gray-900 dark:text-white capitalize">
                                  {subscription.billing_cycle}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {subscription.courses && (
                            <div className="mt-4">
                              <Button variant="outline" asChild>
                                <Link href={`/student/courses/${subscription.courses.id}`}>
                                  <BookOpen className="w-4 h-4 mr-2" />
                                  View Course
                                </Link>
                              </Button>
                            </div>
                          )}
                          
                          {subscription.books && (
                            <div className="mt-4">
                              <Button variant="outline" asChild>
                                <Link href={`/student/books/${subscription.books.id}`}>
                                  <FileText className="w-4 h-4 mr-2" />
                                  View Book
                                </Link>
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            )}

            {/* Canceled/Expired Subscriptions */}
            {subscriptions.filter(sub => 
              sub.status === 'canceled' || 
              isExpired(sub.current_period_end) || 
              sub.status !== 'active'
            ).length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Past Subscriptions
                </h2>
                <div className="grid gap-6">
                  {subscriptions
                    .filter(sub => 
                      sub.status === 'canceled' || 
                      isExpired(sub.current_period_end) || 
                      sub.status !== 'active'
                    )
                    .map((subscription) => (
                      <Card key={subscription.id} className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm opacity-75">
                        <CardHeader>
                          <div className="flex items-start gap-4">
                            {subscription.courses?.thumbnail_url ? (
                              <Image
                                src={subscription.courses.thumbnail_url}
                                alt={subscription.courses.title}
                                width={80}
                                height={60}
                                className="rounded-lg object-cover"
                              />
                            ) : subscription.books?.cover_url ? (
                              <Image
                                src={subscription.books.cover_url}
                                alt={subscription.books.title}
                                width={80}
                                height={60}
                                className="rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-20 h-15 bg-gray-300 rounded-lg flex items-center justify-center">
                                {subscription.courses ? (
                                  <BookOpen className="w-8 h-8 text-gray-400" />
                                ) : (
                                  <FileText className="w-8 h-8 text-gray-400" />
                                )}
                              </div>
                            )}
                            
                            <div className="flex-1">
                              <CardTitle className="mb-2">
                                {subscription.courses?.title || subscription.books?.title || 'Unknown'}
                              </CardTitle>
                              <CardDescription>
                                {subscription.courses ? 'Course Subscription' : 'Book Subscription'}
                              </CardDescription>
                              <div className="flex items-center gap-3 mt-3">
                                {getStatusBadge(subscription.status, subscription.cancel_at_period_end)}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {subscription.canceled_at && (
                              <p>Canceled on: {formatDate(subscription.canceled_at)}</p>
                            )}
                            {isExpired(subscription.current_period_end) && (
                              <p>Expired on: {formatDate(subscription.current_period_end)}</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

