import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { sendForumReplyEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { postId, content } = body

    if (!postId || !content) {
      return NextResponse.json({ error: "Post ID and content are required" }, { status: 400 })
    }

    // Use service role client if available
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAdmin = serviceRoleKey
      ? createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey
        )
      : supabase

    // Get post details
    const { data: post, error: postError } = await supabaseAdmin
      .from("forum_posts")
      .select("id, author_id, title, forum_id")
      .eq("id", postId)
      .single()

    if (postError || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Create reply
    const { data: reply, error: replyError } = await supabaseAdmin
      .from("forum_replies")
      .insert({
        post_id: postId,
        author_id: user.id,
        content,
      })
      .select()
      .single()

    if (replyError) {
      return NextResponse.json({ error: replyError.message }, { status: 500 })
    }

    // Get reply author profile
    const { data: replyAuthorProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single()

    const replyAuthor = replyAuthorProfile?.full_name || replyAuthorProfile?.email?.split('@')[0] || 'Someone'

    // Send email to post author if it's not their own post
    if (post.author_id !== user.id) {
      try {
        const { data: postAuthorProfile } = await supabaseAdmin
          .from("profiles")
          .select("email, full_name")
          .eq("id", post.author_id)
          .single()

        if (postAuthorProfile?.email) {
          try {
            const emailResult = await sendForumReplyEmail(
              postAuthorProfile.email,
              postAuthorProfile.full_name || 'User',
              post.title,
              replyAuthor,
              content,
              post.forum_id,
              postId
            )
            if (emailResult.success) {
              console.log(`✅ Forum reply email sent to ${postAuthorProfile.email}`)
            } else {
              console.error(`❌ Failed to send forum reply email:`, emailResult.error)
            }
          } catch (emailError: any) {
            console.error('Error sending forum reply email:', emailError)
          }
        }
      } catch (error) {
        console.error("Error sending forum reply email:", error)
        // Don't fail the request
      }
    }

    // Create in-app notification
    if (post.author_id !== user.id) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: post.author_id,
            type: 'forum_reply',
            title: 'New Reply to Your Post',
            message: `${replyAuthor} replied to your forum post "${post.title}".`,
            link: `/student/forums/${post.forum_id}`,
            relatedId: postId,
            relatedType: 'forum_post'
          })
        }).catch(err => console.error('Failed to create forum reply notification:', err))
      } catch (notifError) {
        console.error('Error creating forum reply notification:', notifError)
      }
    }

    return NextResponse.json({
      success: true,
      reply
    })
  } catch (error: any) {
    console.error("Error creating forum reply:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}











