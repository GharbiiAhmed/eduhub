import { createClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"
import { NextRequest, NextResponse } from "next/server"

interface RouteContext {
  params: Promise<{
    subscriptionId: string
  }>
}

// POST - Cancel subscription
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { subscriptionId } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify subscription belongs to user
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("id", subscriptionId)
      .eq("user_id", user.id)
      .single()

    if (subError || !subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
    }

    // Cancel subscription in Stripe
    if (stripe && subscription.stripe_subscription_id) {
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: true,
      })
    }

    // Update subscription in database
    await supabase
      .from("subscriptions")
      .update({
        cancel_at_period_end: true,
      })
      .eq("id", subscriptionId)

    return NextResponse.json({ success: true, message: "Subscription will be canceled at the end of the billing period" })
  } catch (error: unknown) {
    console.error("Error canceling subscription:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

