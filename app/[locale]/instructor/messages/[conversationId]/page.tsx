"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useEffect, useState, use } from "react"
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

interface Message {
  id: string
  content: string
  sender_id: string
  created_at: string
}

export default function InstructorConversationPage({
  params
}: {
  params: Promise<{ conversationId: string }>
}) {
  const t = useTranslations('messages')
  const tCommon = useTranslations('common')
  const { conversationId } = use(params)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchMessages = async () => {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      setCurrentUserId(user.id)

      const { data: messagesData } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })

      if (messagesData) {
        setMessages(messagesData)
      }

      setIsLoading(false)
    }

    fetchMessages()

    const supabase = createClient()
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
        },
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [conversationId, router])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsSending(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error("Not authenticated")

      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: newMessage,
      })

      if (error) throw error

      setNewMessage("")
    } catch (error: unknown) {
      console.error("Error sending message:", error)
    } finally {
      setIsSending(false)
    }
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="max-w-2xl mx-auto h-screen flex flex-col">
      <div className="flex items-center justify-between p-6 border-b">
        <h1 className="text-2xl font-bold">Conversation</h1>
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender_id === currentUserId ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-lg ${
                message.sender_id === currentUserId ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}
            >
              <p>{message.content}</p>
              <p className="text-xs opacity-70 mt-1">{new Date(message.created_at).toLocaleTimeString()}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t p-6">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            placeholder={t('typeMessage')}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            required
          />
          <Button type="submit" disabled={isSending}>
            {isSending ? "Sending..." : "Send"}
          </Button>
        </form>
      </div>
    </div>
  )
}
