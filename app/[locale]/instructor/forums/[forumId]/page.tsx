"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useEffect, useState, use } from "react"
import { useRouter } from '@/i18n/routing'
import { Reply, ThumbsUp, MessageSquare, User, ArrowLeft } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

interface ForumPost {
  id: string
  title: string
  content: string
  author_id: string
  author_name?: string
  created_at: string
  forum_replies?: any[]
  replies_count?: number
  likes_count?: number
  is_liked?: boolean
}

export default function InstructorForumDetailPage({
  params
}: {
  params: Promise<{ forumId: string }>
}) {
  const t = useTranslations('forums')
  const tCommon = useTranslations('common')
  const { forumId } = use(params)
  const [forum, setForum] = useState<any>(null)
  const [posts, setPosts] = useState<ForumPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [isReplying, setIsReplying] = useState(false)
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set())
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [likingPost, setLikingPost] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchForum = async () => {
      const supabase = createClient()

      try {
        const { data: forumData, error: forumError } = await supabase
          .from("forums")
          .select("*")
          .eq("id", forumId)
          .single()

        if (forumError) {
          console.error('Error fetching forum:', forumError)
          setError(forumError.message)
          setIsLoading(false)
          return
        }

        if (forumData) {
          setForum(forumData)

          const { data: postsData, error: postsError } = await supabase
            .from("forum_posts")
            .select(`
              *,
              forum_replies(*)
            `)
            .eq("forum_id", forumId)
            .order("created_at", { ascending: false })

          if (postsError) {
            console.error('Error fetching posts:', postsError)
            setError(postsError.message)
            setPosts([])
          } else if (postsData) {
            console.log('Posts fetched:', postsData.length)
            
            // Get current user for likes
            const { data: { user } } = await supabase.auth.getUser()
            
            // Get liked posts for current user
            const postIds = postsData.map((p: any) => p.id).filter(Boolean)
            let userLikedPosts = new Set<string>()
            
            if (user && postIds.length > 0) {
              const { data: likesData } = await supabase
                .from('forum_post_likes')
                .select('post_id')
                .eq('user_id', user.id)
                .in('post_id', postIds)
              
              if (likesData) {
                userLikedPosts = new Set(likesData.map((l: any) => l.post_id))
              }
            }
            
            setLikedPosts(userLikedPosts)
            
            // Get like counts for all posts
            const { data: likesData } = await supabase
              .from('forum_post_likes')
              .select('post_id')
              .in('post_id', postIds)
            
            // Count likes per post
            const likesCountMap = new Map<string, number>()
            if (likesData && likesData.length > 0) {
              likesData.forEach((like: any) => {
                const currentCount = likesCountMap.get(like.post_id) || 0
                likesCountMap.set(like.post_id, currentCount + 1)
              })
            }
            
            // Get author IDs from posts
            const postAuthorIds = [...new Set(postsData.map((p: any) => p.author_id).filter(Boolean))]
            
            // Get author IDs from replies
            const replyAuthorIds = [...new Set(
              postsData.flatMap((p: any) => 
                (p.forum_replies || []).map((r: any) => r.author_id).filter(Boolean)
              )
            )]
            
            // Combine all author IDs
            const allAuthorIds = [...new Set([...postAuthorIds, ...replyAuthorIds])]
            
            if (allAuthorIds.length > 0) {
              // Get profiles for all authors (posts and replies)
              const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .in('id', allAuthorIds)

              if (profilesError) {
                console.error('Error fetching profiles:', profilesError)
              }

              // Create profile map
              const profileMap = new Map(
                (profilesData || []).map((p: any) => [p.id, p])
              )

              // Add author names, reply counts, and like counts to posts
              const postsWithAuthors = postsData.map((post: any) => {
                const profile = profileMap.get(post.author_id)
                const authorName = profile?.full_name || profile?.email?.split('@')[0] || 'Anonymous'
                
                // Add author names to replies
                const repliesWithAuthors = (post.forum_replies || []).map((reply: any) => {
                  const replyProfile = profileMap.get(reply.author_id)
                  const replyAuthorName = replyProfile?.full_name || replyProfile?.email?.split('@')[0] || 'Anonymous'
                  return {
                    ...reply,
                    author_name: replyAuthorName
                  }
                })
                
                return {
                  ...post,
                  author_name: authorName,
                  replies_count: post.forum_replies?.length || 0,
                  likes_count: likesCountMap.get(post.id) || 0,
                  is_liked: userLikedPosts.has(post.id),
                  forum_replies: repliesWithAuthors
                }
              })

              setPosts(postsWithAuthors)
            } else {
              setPosts(postsData.map((post: any) => ({
                ...post,
                author_name: 'Anonymous',
                replies_count: post.forum_replies?.length || 0,
                likes_count: likesCountMap.get(post.id) || 0,
                is_liked: userLikedPosts.has(post.id),
                forum_replies: (post.forum_replies || []).map((reply: any) => ({
                  ...reply,
                  author_name: 'Anonymous'
                }))
              })))
            }
          } else {
            setPosts([])
          }
        }
      } catch (err: any) {
        console.error('Error in fetchForum:', err)
        setError(err.message || 'Failed to load forum')
      } finally {
        setIsLoading(false)
      }
    }

    fetchForum()
  }, [forumId])

  const handleReply = async (postId: string) => {
    if (!replyContent.trim()) {
      setError(t('pleaseEnterReply'))
      return
    }

    const supabase = createClient()
    setIsReplying(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("Not authenticated")
      }

      const { data, error: insertError } = await supabase
        .from("forum_replies")
        .insert({
          post_id: postId,
          author_id: user.id,
          content: replyContent,
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error creating reply:', insertError)
        throw insertError
      }

      // Get post author to notify them
      const { data: post } = await supabase
        .from('forum_posts')
        .select('author_id, title, forum_id')
        .eq('id', postId)
        .single()

      // Notify post author about the reply (if it's not their own post)
      if (post && post.author_id !== user.id) {
        try {
          await fetch('/api/notifications/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: post.author_id,
              type: 'forum_reply',
              title: t('newReplyToYourPost'),
              message: `Someone replied to your forum post "${post.title}".`,
              link: `/instructor/forums/${post.forum_id}`,
              relatedId: postId,
              relatedType: 'forum_post'
            })
          }).catch(err => console.error('Failed to create forum reply notification:', err))
        } catch (notifError) {
          console.error('Error creating forum reply notification:', notifError)
        }
      }

      // Get author profile for the reply
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single()

      const authorName = profile?.full_name || profile?.email?.split('@')[0] || 'Anonymous'

      // Refresh posts to get updated reply data
      const { data: updatedPostsData } = await supabase
        .from("forum_posts")
        .select(`
          *,
          forum_replies(*)
        `)
        .eq("forum_id", forumId)
        .order("created_at", { ascending: false })

      if (updatedPostsData) {
        // Get current user for likes
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        
        // Get liked posts for current user
        const postIds = updatedPostsData.map((p: any) => p.id).filter(Boolean)
        let userLikedPosts = new Set<string>()
        
        if (currentUser && postIds.length > 0) {
          const { data: userLikes } = await supabase
            .from('forum_post_likes')
            .select('post_id')
            .eq('user_id', currentUser.id)
            .in('post_id', postIds)
          
          if (userLikes) {
            userLikedPosts = new Set(userLikes.map((l: any) => l.post_id))
          }
        }
        
        setLikedPosts(userLikedPosts)
        
        // Get like counts
        const { data: likesData } = await supabase
          .from('forum_post_likes')
          .select('post_id')
          .in('post_id', postIds)
        
        const likesCountMap = new Map<string, number>()
        if (likesData && likesData.length > 0) {
          likesData.forEach((like: any) => {
            const currentCount = likesCountMap.get(like.post_id) || 0
            likesCountMap.set(like.post_id, currentCount + 1)
          })
        }
        
        // Get all author IDs
        const postAuthorIds = [...new Set(updatedPostsData.map((p: any) => p.author_id).filter(Boolean))]
        const replyAuthorIds = [...new Set(
          updatedPostsData.flatMap((p: any) => 
            (p.forum_replies || []).map((r: any) => r.author_id).filter(Boolean)
          )
        )]
        const allAuthorIds = [...new Set([...postAuthorIds, ...replyAuthorIds])]

        if (allAuthorIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', allAuthorIds)

          const profileMap = new Map(
            (profilesData || []).map((p: any) => [p.id, p])
          )

          const postsWithAuthors = updatedPostsData.map((post: any) => {
            const profile = profileMap.get(post.author_id)
            const postAuthorName = profile?.full_name || profile?.email?.split('@')[0] || 'Anonymous'
            
            const repliesWithAuthors = (post.forum_replies || []).map((reply: any) => {
              const replyProfile = profileMap.get(reply.author_id)
              const replyAuthorName = replyProfile?.full_name || replyProfile?.email?.split('@')[0] || 'Anonymous'
              return {
                ...reply,
                author_name: replyAuthorName
              }
            })
            
            return {
              ...post,
              author_name: postAuthorName,
              replies_count: post.forum_replies?.length || 0,
              likes_count: likesCountMap.get(post.id) || 0,
              is_liked: userLikedPosts.has(post.id),
              forum_replies: repliesWithAuthors
            }
          })

          setPosts(postsWithAuthors)
        } else {
          setPosts(updatedPostsData.map((post: any) => ({
            ...post,
            author_name: 'Anonymous',
            replies_count: post.forum_replies?.length || 0,
            likes_count: likesCountMap.get(post.id) || 0,
            is_liked: userLikedPosts.has(post.id),
            forum_replies: (post.forum_replies || []).map((reply: any) => ({
              ...reply,
              author_name: 'Anonymous'
            }))
          })))
        }
      }

      setReplyContent("")
      setReplyingTo(null)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred"
      console.error('Error in handleReply:', err)
      setError(errorMessage)
    } finally {
      setIsReplying(false)
    }
  }

  const toggleReplies = (postId: string) => {
    setExpandedReplies((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(postId)) {
        newSet.delete(postId)
      } else {
        newSet.add(postId)
      }
      return newSet
    })
  }

  const handleLike = async (postId: string) => {
    const supabase = createClient()
    setLikingPost(postId)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("Not authenticated")
      }

      const isLiked = likedPosts.has(postId)

      if (isLiked) {
        // Unlike: delete the like
        const { error: deleteError } = await supabase
          .from("forum_post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id)

        if (deleteError) {
          console.error('Error unliking post:', deleteError)
          throw deleteError
        }

        // Update local state
        setLikedPosts((prev) => {
          const newSet = new Set(prev)
          newSet.delete(postId)
          return newSet
        })

        // Update post likes count
        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  likes_count: (post.likes_count || 0) - 1,
                  is_liked: false,
                }
              : post
          )
        )
      } else {
        // Like: insert the like
        const { error: insertError } = await supabase
          .from("forum_post_likes")
          .insert({
            post_id: postId,
            user_id: user.id,
          })

        if (insertError) {
          console.error('Error liking post:', insertError)
          throw insertError
        }

        // Update local state
        setLikedPosts((prev) => {
          const newSet = new Set(prev)
          newSet.add(postId)
          return newSet
        })

        // Update post likes count
        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  likes_count: (post.likes_count || 0) + 1,
                  is_liked: true,
                }
              : post
          )
        )
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred"
      console.error('Error in handleLike:', err)
      setError(errorMessage)
    } finally {
      setLikingPost(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!forum) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t('forumNotFound')}</p>
        <Button asChild className="mt-4">
          <Link href="/instructor/forums">{t('backToForums')}</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{forum.title}</h1>
          <p className="text-muted-foreground">{forum.description}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/instructor/forums">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('backToForums')}
          </Link>
        </Button>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">{t('discussions')}</h2>
        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
            <p className="text-sm">{error}</p>
          </div>
        )}
        {posts.length > 0 ? (
          posts.map((post) => (
            <Card key={post.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{post.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <User className="w-4 h-4" />
                      <span>{post.author_name || 'Anonymous'}</span>
                      <span>•</span>
                      <span>{new Date(post.created_at).toLocaleDateString()}</span>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground whitespace-pre-wrap">{post.content}</p>

                <div className="flex items-center gap-4 pt-2 border-t">
                  <Dialog open={replyingTo === post.id} onOpenChange={(open) => {
                    if (!open) {
                      setReplyingTo(null)
                      setReplyContent("")
                    } else {
                      setReplyingTo(post.id)
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Reply className="w-4 h-4" />
                        {t('reply')}
                        {post.replies_count > 0 && (
                          <span className="ml-1">({post.replies_count})</span>
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t('replyToPost')}</DialogTitle>
                        <DialogDescription>
                          {t('shareYourThoughtsOnDiscussion')}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Textarea
                          placeholder={t('writeYourReply')}
                          rows={4}
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setReplyingTo(null)
                              setReplyContent("")
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={() => handleReply(post.id)}
                            disabled={isReplying || !replyContent.trim()}
                          >
                            {isReplying ? t('posting') : t('postReply')}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button 
                    variant={post.is_liked ? "default" : "ghost"}
                    size="sm" 
                    className="flex items-center gap-2"
                    onClick={() => handleLike(post.id)}
                    disabled={likingPost === post.id}
                  >
                    <ThumbsUp className={`w-4 h-4 ${post.is_liked ? 'fill-current' : ''}`} />
                    {post.is_liked ? t('liked') : t('like')}
                    {post.likes_count > 0 && (
                      <span className="ml-1">({post.likes_count})</span>
                    )}
                  </Button>

                  {post.replies_count > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleReplies(post.id)}
                      className="flex items-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      {expandedReplies.has(post.id) ? t('hide') : t('show')} {t('replies')} ({post.replies_count})
                    </Button>
                  )}
                </div>

                {expandedReplies.has(post.id) && post.forum_replies && post.forum_replies.length > 0 && (
                  <div className="space-y-3 border-t pt-4 mt-4">
                    <p className="text-sm font-semibold">{t('replies')} ({post.forum_replies.length})</p>
                    {post.forum_replies.map((reply: any) => (
                      <div key={reply.id} className="bg-muted p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {reply.author_name || 'Anonymous'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(reply.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t('noDiscussionsYet')}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

