/**
 * Utility functions for creating notifications
 */

export interface CreateNotificationParams {
  userId: string
  type: 
    | 'course_added'
    | 'course_published'
    | 'lesson_added'
    | 'quiz_graded'
    | 'assignment_feedback'
    | 'message_received'
    | 'meeting_scheduled'
    | 'certificate_earned'
    | 'course_completed'
    | 'subscription_renewal'
    | 'subscription_expiring'
    | 'payment_received'
    | 'forum_reply'
    | 'announcement'
    | 'system'
  title: string
  message: string
  link?: string
  relatedId?: string
  relatedType?: string
}

/**
 * Create a notification for a user
 * This function calls the API endpoint that uses service role to bypass RLS
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    const response = await fetch('/api/notifications/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Failed to create notification:', error)
    }
  } catch (error) {
    console.error('Error creating notification:', error)
    // Don't throw - notifications are non-critical
  }
}

/**
 * Create notifications for multiple users
 */
export async function createNotificationsForUsers(
  userIds: string[],
  params: Omit<CreateNotificationParams, 'userId'>
): Promise<void> {
  const promises = userIds.map(userId =>
    createNotification({ ...params, userId })
  )
  await Promise.all(promises)
}


