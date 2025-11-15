import { createClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { courseId, bookId, type, paymentType } = await request.json()
    // paymentType: 'one_time' | 'monthly' | 'yearly'
    console.log("Checkout request:", { courseId, bookId, type, paymentType })

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.log("No user found, returning 401")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("User authenticated:", user.id)

    let product: any = null
    let amount = 0
    let description = ""
    let isSubscription = false
    let billingCycle: 'month' | 'year' | null = null

    if (courseId) {
      console.log("Processing course enrollment for:", courseId)
      const { data: course, error: courseError } = await supabase.from("courses").select("*").eq("id", courseId).single()

      if (courseError) {
        console.error("Course fetch error:", courseError)
        return NextResponse.json({ error: "Course not found" }, { status: 404 })
      }

      if (!course) {
        console.log("Course not found:", courseId)
        return NextResponse.json({ error: "Course not found" }, { status: 404 })
      }

      product = course
      description = `Course: ${course.title}`

      // Determine payment type and amount
      if (paymentType === 'monthly' && course.subscription_enabled && course.monthly_price) {
        isSubscription = true
        billingCycle = 'month'
        amount = Math.round(course.monthly_price * 100)
      } else if (paymentType === 'yearly' && course.subscription_enabled && course.yearly_price) {
        isSubscription = true
        billingCycle = 'year'
        amount = Math.round(course.yearly_price * 100)
      } else {
        // One-time payment
        amount = Math.round(course.price * 100)
      }

      console.log("Course found:", { title: course.title, paymentType, amount, isSubscription })
    } else if (bookId) {
      console.log("Processing book purchase for:", bookId)
      const { data: book, error: bookError } = await supabase.from("books").select("*").eq("id", bookId).single()

      if (bookError) {
        console.error("Book fetch error:", bookError)
        return NextResponse.json({ error: "Book not found" }, { status: 404 })
      }

      if (!book) {
        console.log("Book not found:", bookId)
        return NextResponse.json({ error: "Book not found" }, { status: 404 })
      }

      product = book
      description = `Book: ${book.title} (${type})`

      // Determine payment type and amount
      if (paymentType === 'monthly' && book.subscription_enabled && book.monthly_price) {
        isSubscription = true
        billingCycle = 'month'
        amount = Math.round(book.monthly_price * 100)
      } else if (paymentType === 'yearly' && book.subscription_enabled && book.yearly_price) {
        isSubscription = true
        billingCycle = 'year'
        amount = Math.round(book.yearly_price * 100)
      } else {
        // One-time payment
        amount = Math.round(book.price * 100)
      }

      console.log("Book found:", { title: book.title, paymentType, amount, isSubscription })
    }

    // If Stripe is not configured, treat everything as free
    if (!stripe) {
      console.log("Stripe not configured. Treating as free purchase.")
      
      if (courseId) {
        console.log("Creating free course enrollment...")
        const { data: enrollmentData, error: enrollmentError } = await supabase.from("enrollments").insert({
          student_id: user.id,
          course_id: courseId,
        }).select().single()

        if (enrollmentError) {
          console.error("Enrollment creation error:", enrollmentError)
          return NextResponse.json({ error: "Failed to create enrollment" }, { status: 500 })
        }

        console.log("Enrollment created successfully:", enrollmentData)

        // Notify user about free enrollment
        try {
          const { data: course } = await supabase
            .from("courses")
            .select("title")
            .eq("id", courseId)
            .single()

          await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
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
      } else if (bookId) {
        console.log("Creating free book purchase...")
        const { data: purchaseData, error: purchaseError } = await supabase.from("book_purchases").insert({
          student_id: user.id,
          book_id: bookId,
          purchase_type: type || "digital",
          price_paid: 0,
        }).select().single()

        if (purchaseError) {
          console.error("Book purchase creation error:", purchaseError)
          return NextResponse.json({ error: "Failed to create purchase" }, { status: 500 })
        }

        console.log("Book purchase created successfully:", purchaseData)

        // Notify user about free book purchase
        try {
          const { data: book } = await supabase
            .from("books")
            .select("title")
            .eq("id", bookId)
            .single()

          await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
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

      return NextResponse.json({ success: true, free: true })
    }

    if (amount === 0) {
      console.log("Free course/book - creating enrollment directly")
      // Free course/book - create enrollment directly
      if (courseId) {
        const { data: enrollmentData, error: enrollmentError } = await supabase.from("enrollments").insert({
          student_id: user.id,
          course_id: courseId,
        }).select().single()

        if (enrollmentError) {
          console.error("Free enrollment creation error:", enrollmentError)
          return NextResponse.json({ error: "Failed to create enrollment" }, { status: 500 })
        }

        console.log("Free enrollment created successfully:", enrollmentData)
      } else if (bookId) {
        const { data: purchaseData, error: purchaseError } = await supabase.from("book_purchases").insert({
          student_id: user.id,
          book_id: bookId,
          purchase_type: type || "digital",
          price_paid: 0,
        }).select().single()

        if (purchaseError) {
          console.error("Free book purchase creation error:", purchaseError)
          return NextResponse.json({ error: "Failed to create purchase" }, { status: 500 })
        }

        console.log("Free book purchase created successfully:", purchaseData)
      }

      return NextResponse.json({ success: true, free: true })
    }

    console.log("Creating Stripe checkout session...")
    
    // Create Stripe checkout session
    const sessionConfig: any = {
      payment_method_types: ["card"],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout/cancel`,
      metadata: {
        userId: user.id,
        courseId: courseId || "",
        bookId: bookId || "",
        type: type || "digital",
        paymentType: paymentType || "one_time",
      },
    }

    if (isSubscription && billingCycle) {
      // Subscription mode
      sessionConfig.mode = "subscription"
      sessionConfig.line_items = [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: description,
            },
            recurring: {
              interval: billingCycle,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ]
      
      // Add customer email for subscription
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", user.id)
        .single()
      
      if (profile?.email) {
        sessionConfig.customer_email = profile.email
      }
      
      // Add subscription metadata
      sessionConfig.subscription_data = {
        metadata: {
          userId: user.id,
          courseId: courseId || "",
          bookId: bookId || "",
          type: type || "digital",
          paymentType: paymentType || "one_time",
        }
      }
    } else {
      // One-time payment mode
      sessionConfig.mode = "payment"
      sessionConfig.line_items = [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: description,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ]
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)

    console.log("Stripe session created:", session.id)
    return NextResponse.json({ sessionId: session.id })
  } catch (error: unknown) {
    console.error("Checkout error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
