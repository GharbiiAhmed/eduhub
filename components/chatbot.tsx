"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  AlertCircle,
  BarChart3,
  History,
  BookOpen
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  courseId?: string
  courseTitle?: string
}

interface ChatbotProps {
  courseId?: string
  courseTitle?: string
  userRole?: string
  className?: string
}

export function Chatbot({ courseId, courseTitle, userRole = 'student', className = '' }: ChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showStats, setShowStats] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Load chat history on component mount
  useEffect(() => {
    loadChatHistory()
  }, [courseId])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const loadChatHistory = async () => {
    try {
      const response = await fetch(`/api/chatbot?limit=20${courseId ? `&courseId=${courseId}` : ''}`)
      const data = await response.json()
      
      if (data.success && data.logs) {
        const chatMessages: ChatMessage[] = data.logs.map((log: any) => [
          {
            id: `${log.id}-user`,
            role: 'user' as const,
            content: log.query,
            timestamp: log.timestamp,
            courseId: log.course_id,
            courseTitle: log.courses?.title
          },
          {
            id: `${log.id}-assistant`,
            role: 'assistant' as const,
            content: log.response,
            timestamp: log.timestamp,
            courseId: log.course_id,
            courseTitle: log.courses?.title
          }
        ]).flat()
        
        setMessages(chatMessages)
      }
    } catch (error) {
      console.error('Failed to load chat history:', error)
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch('/api/chatbot/stats')
      const data = await response.json()
      
      if (data.success) {
        setStats(data.stats)
        setShowStats(true)
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
      courseId,
      courseTitle
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userMessage.content,
          courseId,
          userRole
        }),
      })

      const data = await response.json()

      if (data.success) {
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString(),
          courseId,
          courseTitle
        }

        setMessages(prev => [...prev, assistantMessage])
      } else {
        throw new Error(data.error || 'Failed to get response')
      }
    } catch (error) {
      console.error('Chatbot error:', error)
      setError(error instanceof Error ? error.message : 'Failed to send message')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bot className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">EduHub AI Assistant</CardTitle>
              {courseId && (
                <Badge variant="secondary" className="text-xs">
                  <BookOpen className="h-3 w-3 mr-1" />
                  {courseTitle || 'Course'}
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadChatHistory}
                className="h-8 w-8 p-0"
              >
                <History className="h-4 w-4" />
              </Button>
              {userRole === 'admin' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadStats}
                  className="h-8 w-8 p-0"
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <CardDescription>
            Ask me anything about courses, learning, or the platform!
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Chat Messages */}
          <ScrollArea 
            ref={scrollAreaRef}
            className="h-96 w-full border rounded-lg p-4"
          >
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Start a conversation with EduHub AI Assistant!</p>
                  <p className="text-sm mt-2">
                    Ask about courses, learning strategies, or platform features.
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-start space-x-2">
                        {message.role === 'assistant' && (
                          <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        )}
                        {message.role === 'user' && (
                          <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm whitespace-pre-wrap">
                            {message.content}
                          </p>
                          <p className={`text-xs mt-1 ${
                            message.role === 'user' 
                              ? 'text-primary-foreground/70' 
                              : 'text-muted-foreground'
                          }`}>
                            {formatTimestamp(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3 max-w-[80%]">
                    <div className="flex items-center space-x-2">
                      <Bot className="h-4 w-4" />
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">
                        AI is thinking...
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Error Message */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Input Area */}
          <div className="flex space-x-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button 
              onClick={sendMessage} 
              disabled={isLoading || !input.trim()}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Modal */}
      {showStats && stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Chatbot Statistics</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{stats.totalQueries}</p>
                <p className="text-sm text-muted-foreground">Total Queries</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{stats.totalUsers}</p>
                <p className="text-sm text-muted-foreground">Active Users</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{stats.queriesToday}</p>
                <p className="text-sm text-muted-foreground">Today</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{stats.topCourses.length}</p>
                <p className="text-sm text-muted-foreground">Active Courses</p>
              </div>
            </div>
            
            {stats.topCourses.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium mb-3">Top Courses by Queries</h4>
                <div className="space-y-2">
                  {stats.topCourses.slice(0, 5).map((course: any, index: number) => (
                    <div key={course.courseId} className="flex items-center justify-between">
                      <span className="text-sm">{course.courseTitle}</span>
                      <Badge variant="secondary">{course.queryCount}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={() => setShowStats(false)}>
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


