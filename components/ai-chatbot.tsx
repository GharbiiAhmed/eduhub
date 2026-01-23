"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Loader2, X, MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface AIChatbotProps {
  userType?: "student" | "instructor" | "admin"
  onClose?: () => void
}

export function AIChatbot({ userType = "student", onClose }: AIChatbotProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (error) => {
      console.error('useChat error:', error)
    },
    onFinish: (message) => {
      console.log('useChat finished:', message)
    }
  })

  useEffect(() => {
    console.log('Messages updated:', messages)
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const handleSend = () => {
    if (input.trim()) {
      console.log('Sending message:', input)
      sendMessage({ text: input })
      setInput("")
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center justify-center text-primary-foreground z-40"
        aria-label="Open AI Chatbot"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    )
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[600px] shadow-2xl z-50 flex flex-col border-primary/20 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-secondary text-primary-foreground p-4 rounded-t-lg flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <div>
            <h3 className="font-semibold">GOMYCOURS AI Assistant</h3>
            <p className="text-xs opacity-90">Always here to help</p>
          </div>
        </div>
        <button
          onClick={() => {
            setIsOpen(false)
            onClose?.()
          }}
          className="hover:bg-white/20 p-1 rounded transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0 p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
            <MessageCircle className="w-12 h-12 text-muted-foreground opacity-50" />
            <div>
              <p className="font-semibold text-foreground">Welcome to GOMYCOURS AI</p>
              <p className="text-sm text-muted-foreground">Ask me anything about courses, learning, or the platform</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-xs px-4 py-2 rounded-lg",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-none"
                    : "bg-muted text-foreground rounded-bl-none",
                )}
              >
                <p className="text-sm whitespace-pre-wrap break-words">
                  {message.parts
                    .filter((part) => part.type === "text")
                    .map((part) => (part as any).text)
                    .join("")}
                </p>
              </div>
            </div>
          ))
        )}
        {status === "in_progress" && (
          <div className="flex gap-3">
            <div className="bg-muted text-foreground px-4 py-2 rounded-lg rounded-bl-none">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border p-4 space-y-3 flex-shrink-0 bg-background">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask me anything..."
            disabled={status === "in_progress"}
            className="h-10 flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={status === "in_progress" || !input.trim()}
            size="sm"
            className="bg-gradient-to-r from-primary to-secondary hover:shadow-lg flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center">Powered by AI • Always learning</p>
      </div>
    </Card>
  )
}
