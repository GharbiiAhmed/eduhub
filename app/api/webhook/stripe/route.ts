import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { stripe } from "@/lib/stripe"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 })
  }

  let event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (error: unknown) {
    console.error("Webhook signature verification failed:", error)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const supabase = await createClient()
  
  // Use service role client for subscription operations to bypass RLS
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabaseAdmin = supabaseServiceKey
    ? createServiceClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
    : supabase

  // Handle checkout.session.completed (for one-time payments and subscription setup)
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any

    // Check if it's a subscription or one-time payment
    if (session.mode === "subscription") {
      // Subscription will be handled by customer.subscription.created
      // But we can create enrollment/purchase here if needed
      const { userId, courseId, bookId, type } = session.metadata || {}

      if (userId && (courseId || bookId)) {
        try {
          // Create enrollment/purchase immediately for subscription
          if (courseId) {
            // Check if enrollment already exists
            const { data: existing } = await supabaseAdmin
              .from("enrollments")
              .select("id")
              .eq("student_id", userId)
              .eq("course_id", courseId)
              .single()

            if (!existing) {
              await supabaseAdmin.from("enrollments").insert({
                student_id: userId,
                course_id: courseId,
              })
            }
          }

          if (bookId) {
            // Check if purchase already exists
            const { data: existing } = await supabaseAdmin
              .from("book_purchases")
              .select("id")
              .eq("student_id", userId)
              .eq("book_id", bookId)
              .single()

            if (!existing) {
              await supabaseAdmin.from("book_purchases").insert({
                student_id: userId,
                book_id: bookId,
                purchase_type: type || "digital",
                price_paid: session.amount_total / 100,
              })
            }
          }
        } catch (error: unknown) {
          console.error("Error creating enrollment/purchase for subscription:", error)
        }
      }

      return NextResponse.json({ received: true })
    }

    // One-time payment handling
    const { userId, courseId, bookId, type } = session.metadata || {}

    try {
      const totalAmount = session.amount_total / 100
      const platformCommission = totalAmount * 0.20 // 20% platform commission
      const creatorEarnings = totalAmount * 0.80 // 80% creator earnings

      // Get creator ID (instructor for courses, author for books)
      let creatorId = null
      if (courseId) {
        const { data: course } = await supabaseAdmin
          .from("courses")
          .select("instructor_id")
          .eq("id", courseId)
          .single()
        creatorId = course?.instructor_id || null
      } else if (bookId) {
        const { data: book } = await supabaseAdmin
          .from("books")
          .select("author_id")
          .eq("id", bookId)
          .single()
        creatorId = book?.author_id || null
      }

      // Create payment record with commission breakdown
      await supabaseAdmin.from("payments").insert({
        user_id: userId,
        stripe_payment_id: session.id,
        amount: totalAmount,
        currency: session.currency,
        status: "completed",
        payment_type: courseId ? "course" : "book",
        course_id: courseId || null,
        book_id: bookId || null,
        platform_commission: platformCommission,
        creator_earnings: creatorEarnings,
      })

      // Handle course enrollment
      if (courseId) {
        await supabaseAdmin.from("enrollments").insert({
          student_id: userId,
          course_id: courseId,
        })

        // Notify user about successful enrollment
        try {
          const { data: course } = await supabaseAdmin
            .from("courses")
            .select("title")
            .eq("id", courseId)
            .single()

          await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: userId,
              type: 'course_added',
              title: 'Enrollment Successful! 🎓',
              message: `You've successfully enrolled in "${course?.title || 'the course'}". Start learning now!`,
              link: `/student/courses/${courseId}`,
              relatedId: courseId,
              relatedType: 'course'
            })
          }).catch(err => console.error('Failed to create enrollment notification:', err))
        } catch (notifError) {
          console.error('Error creating enrollment notification:', notifError)
        }
      }

      // Handle book purchase
      if (bookId) {
        await supabaseAdmin.from("book_purchases").insert({
          student_id: userId,
          book_id: bookId,
          purchase_type: type,
          price_paid: session.amount_total / 100,
        })

        // Notify user about successful book purchase
        try {
          const { data: book } = await supabaseAdmin
            .from("books")
            .select("title")
            .eq("id", bookId)
            .single()

          await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: userId,
              type: 'payment_received',
              title: 'Book Purchase Successful! 📚',
              message: `You've successfully purchased "${book?.title || 'the book'}". Access it now!`,
              link: `/books/${bookId}`,
              relatedId: bookId,
              relatedType: 'book'
            })
          }).catch(err => console.error('Failed to create book purchase notification:', err))
        } catch (notifError) {
          console.error('Error creating book purchase notification:', notifError)
        }
      }

      // Notify user about payment received
      try {
        const productName = courseId 
          ? (await supabaseAdmin.from("courses").select("title").eq("id", courseId).single()).data?.title
          : (await supabaseAdmin.from("books").select("title").eq("id", bookId).single()).data?.title

        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId,
            type: 'payment_received',
            title: 'Payment Successful! ✅',
            message: `Your payment of $${(session.amount_total / 100).toFixed(2)} for "${productName || 'your purchase'}" has been received.`,
            link: courseId ? `/student/courses/${courseId}` : `/books/${bookId}`,
            relatedId: courseId || bookId,
            relatedType: courseId ? 'course' : 'book'
          })
        }).catch(err => console.error('Failed to create payment notification:', err))
      } catch (notifError) {
        console.error('Error creating payment notification:', notifError)
      }
    } catch (error: unknown) {
      console.error("Error processing webhook:", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }

  // Handle subscription created
  if (event.type === "customer.subscription.created") {
    const subscription = event.data.object as any
    
    try {
      // Get customer to find user
      const customer = await stripe.customers.retrieve(subscription.customer as string)
      const customerEmail = (customer as any).email

      // Find user by email
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", customerEmail)
        .single()

      if (!profile) {
        console.error("User not found for subscription:", subscription.id, "email:", customerEmail)
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      // Get metadata from subscription
      const metadata = subscription.metadata || {}
      const courseId = metadata.courseId || null
      const bookId = metadata.bookId || null
      const purchaseType = metadata.type || "digital"

      // Determine billing cycle
      const billingCycle = subscription.items.data[0]?.price?.recurring?.interval === 'year' ? 'yearly' : 'monthly'

      // Calculate commission for subscription
      const subscriptionAmount = (subscription.items.data[0]?.price?.unit_amount || 0) / 100
      const platformCommission = subscriptionAmount * 0.20 // 20% platform commission
      const creatorEarnings = subscriptionAmount * 0.80 // 80% creator earnings

      // Create subscription record with commission breakdown
      await supabaseAdmin.from("subscriptions").insert({
        user_id: profile.id,
        course_id: courseId,
        book_id: bookId,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer as string,
        stripe_price_id: subscription.items.data[0]?.price?.id,
        status: subscription.status,
        billing_cycle: billingCycle,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end || false,
        platform_commission: platformCommission,
        creator_earnings: creatorEarnings,
      })

      // Create enrollment/purchase if not already created
      if (courseId) {
        const { data: existing } = await supabaseAdmin
          .from("enrollments")
          .select("id")
          .eq("student_id", profile.id)
          .eq("course_id", courseId)
          .single()

        if (!existing) {
          await supabaseAdmin.from("enrollments").insert({
            student_id: profile.id,
            course_id: courseId,
          })
        }
      }

      if (bookId) {
        const { data: existing } = await supabaseAdmin
          .from("book_purchases")
          .select("id")
          .eq("student_id", profile.id)
          .eq("book_id", bookId)
          .single()

        if (!existing) {
          await supabaseAdmin.from("book_purchases").insert({
            student_id: profile.id,
            book_id: bookId,
            purchase_type: purchaseType,
            price_paid: (subscription.items.data[0]?.price?.unit_amount || 0) / 100,
          })
        }
      }
    } catch (error: unknown) {
      console.error("Error processing subscription created:", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }

  // Handle subscription updated
  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as any

    try {
      const billingCycle = subscription.items.data[0]?.price?.recurring?.interval === 'year' ? 'yearly' : 'monthly'

      await supabaseAdmin
        .from("subscriptions")
        .update({
          status: subscription.status,
          billing_cycle: billingCycle,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end || false,
          canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
        })
        .eq("stripe_subscription_id", subscription.id)
    } catch (error: unknown) {
      console.error("Error processing subscription updated:", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }

  // Handle subscription deleted/canceled
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as any

    try {
      const { data: subData } = await supabaseAdmin
        .from("subscriptions")
        .select("user_id, course_id, book_id")
        .eq("stripe_subscription_id", subscription.id)
        .single()

      await supabaseAdmin
        .from("subscriptions")
        .update({
          status: "canceled",
          canceled_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id)

      // Notify user about subscription cancellation
      if (subData?.user_id) {
        try {
          const productName = subData.course_id
            ? (await supabaseAdmin.from("courses").select("title").eq("id", subData.course_id).single()).data?.title
            : (await supabaseAdmin.from("books").select("title").eq("id", subData.book_id).single()).data?.title

          await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: subData.user_id,
              type: 'system',
              title: 'Subscription Canceled',
              message: `Your subscription for "${productName || 'your subscription'}" has been canceled.`,
              link: '/subscriptions',
              relatedId: subData.course_id || subData.book_id,
              relatedType: subData.course_id ? 'course' : 'book'
            })
          }).catch(err => console.error('Failed to create subscription cancellation notification:', err))
        } catch (notifError) {
          console.error('Error creating subscription cancellation notification:', notifError)
        }
      }
    } catch (error: unknown) {
      console.error("Error processing subscription deleted:", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }

  // Handle invoice payment succeeded (subscription renewal)
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as any

    if (invoice.subscription) {
      try {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
        
        const { data: subData } = await supabaseAdmin
          .from("subscriptions")
          .select("user_id, course_id, book_id")
          .eq("stripe_subscription_id", subscription.id)
          .single()

        // Calculate commission for renewal payment
        const renewalAmount = (invoice.amount_paid || 0) / 100
        const platformCommission = renewalAmount * 0.20 // 20% platform commission
        const creatorEarnings = renewalAmount * 0.80 // 80% creator earnings

        // Create payment record for subscription renewal
        if (subData && renewalAmount > 0) {
          await supabaseAdmin.from("payments").insert({
            user_id: subData.user_id,
            stripe_payment_id: invoice.id,
            amount: renewalAmount,
            currency: invoice.currency || 'usd',
            status: "completed",
            payment_type: subData.course_id ? "course" : "book",
            course_id: subData.course_id || null,
            book_id: subData.book_id || null,
            platform_commission: platformCommission,
            creator_earnings: creatorEarnings,
          })
        }

        // Update subscription with new commission values for this period
        await supabaseAdmin
          .from("subscriptions")
          .update({
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            status: subscription.status,
            platform_commission: platformCommission,
            creator_earnings: creatorEarnings,
          })
          .eq("stripe_subscription_id", subscription.id)

        // Notify user about subscription renewal
        if (subData?.user_id) {
          try {
            const productName = subData.course_id
              ? (await supabaseAdmin.from("courses").select("title").eq("id", subData.course_id).single()).data?.title
              : (await supabaseAdmin.from("books").select("title").eq("id", subData.book_id).single()).data?.title

            await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/create`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: subData.user_id,
                type: 'subscription_renewal',
                title: 'Subscription Renewed! 🔄',
                message: `Your subscription for "${productName || 'your subscription'}" has been renewed successfully.`,
                link: subData.course_id ? `/student/courses/${subData.course_id}` : `/books/${subData.book_id}`,
                relatedId: subData.course_id || subData.book_id,
                relatedType: subData.course_id ? 'course' : 'book'
              })
            }).catch(err => console.error('Failed to create subscription renewal notification:', err))
          } catch (notifError) {
            console.error('Error creating subscription renewal notification:', notifError)
          }
        }
      } catch (error: unknown) {
        console.error("Error processing invoice payment succeeded:", error)
      }
    }
  }

  // Handle invoice payment failed
  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as any

    if (invoice.subscription) {
      try {
        const { data: subData } = await supabaseAdmin
          .from("subscriptions")
          .select("user_id, course_id, book_id")
          .eq("stripe_subscription_id", invoice.subscription)
          .single()

        await supabaseAdmin
          .from("subscriptions")
          .update({
            status: "past_due",
          })
          .eq("stripe_subscription_id", invoice.subscription)

        // Notify user about payment failure
        if (subData?.user_id) {
          try {
            const productName = subData.course_id
              ? (await supabaseAdmin.from("courses").select("title").eq("id", subData.course_id).single()).data?.title
              : (await supabaseAdmin.from("books").select("title").eq("id", subData.book_id).single()).data?.title

            await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/create`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: subData.user_id,
                type: 'system',
                title: 'Payment Failed ⚠️',
                message: `Your subscription payment for "${productName || 'your subscription'}" failed. Please update your payment method.`,
                link: '/subscriptions',
                relatedId: subData.course_id || subData.book_id,
                relatedType: subData.course_id ? 'course' : 'book'
              })
            }).catch(err => console.error('Failed to create payment failure notification:', err))
          } catch (notifError) {
            console.error('Error creating payment failure notification:', notifError)
          }
        }
      } catch (error: unknown) {
        console.error("Error processing invoice payment failed:", error)
      }
    }
  }

  return NextResponse.json({ received: true })
}
