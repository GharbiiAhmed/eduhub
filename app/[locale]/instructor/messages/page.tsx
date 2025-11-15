"use client"

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { 
  MessageSquare, 
  Search, 
  Plus, 
  Send, 
  User,
} from "lucide-react"
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

interface Conversation {
  id: string
  title: string
  participants: Array<{
    id: string
    name: string
    email: string
    role: string
  }>
  last_message: {
    content: string
    sender_name: string
    created_at: string
  }
  unread_count: number
  created_at: string
  updated_at: string
}

interface Message {
  id: string
  content: string
  sender_id: string
  sender_name: string
  sender_email: string
  created_at: string
  is_read: boolean
}

export default function InstructorMessagesPage() {
  const t = useTranslations('messages')
  const tCommon = useTranslations('common')

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [showNewConversation, setShowNewConversation] = useState(false)
  const [newConversation, setNewConversation] = useState({
    selectedCourse: '',
    selectedRecipient: ''
  })
  const [myCourses, setMyCourses] = useState<Array<{
    id: string
    title: string
  }>>([])
  const [courseStudents, setCourseStudents] = useState<Array<{
    id: string
    name: string
    email: string
  }>>([])
  const [loadingStudents, setLoadingStudents] = useState(false)

  const supabase = createClient()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  useEffect(() => {
    if (user) {
      fetchConversations()
      fetchMyCourses()

      // Subscribe to new messages for real-time updates
      const channel = supabase
        .channel('instructor-conversations-updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          (payload) => {
            // Refresh conversations to update last message
            fetchConversations()
            
            // If viewing the conversation where the message was sent, refresh messages
            if (selectedConversation && payload.new.conversation_id === selectedConversation.id) {
              fetchMessages(selectedConversation.id)
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'conversations',
          },
          () => {
            // Refresh conversations when updated_at changes
            fetchConversations()
          }
        )
        .subscribe()

      return () => {
        channel.unsubscribe()
      }
    }
  }, [user, selectedConversation])

  const fetchMyCourses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: courses } = await supabase
        .from('courses')
        .select('id, title')
        .eq('instructor_id', user.id)

      if (courses) {
        setMyCourses(courses)
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    }
  }

  const fetchCourseStudents = async (courseId: string) => {
    if (!courseId) {
      setCourseStudents([])
      return
    }

    setLoadingStudents(true)
    try {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('course_id', courseId)

      const studentIds = enrollments?.map(e => e.student_id).filter(Boolean) || []

      if (studentIds.length > 0) {
        const { data: studentsData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', studentIds)
        
        if (studentsData) {
          const students = studentsData.map((student: any) => ({
            id: student.id,
            name: student.full_name || student.email || 'Student',
            email: student.email
          }))
          setCourseStudents(students)
        }
      } else {
        setCourseStudents([])
      }
    } catch (error) {
      console.error('Error fetching course students:', error)
    } finally {
      setLoadingStudents(false)
    }
  }

  const fetchConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: conversationsData } = await supabase
        .from("conversations")
        .select("*")
        .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
        .order("updated_at", { ascending: false })

      if (conversationsData) {
        const conversationsWithDetails = await Promise.all(
          conversationsData.map(async (conv: any) => {
            const otherParticipantId = conv.participant_1_id === user.id 
              ? conv.participant_2_id 
              : conv.participant_1_id

            // Get other participant's profile
            const { data: otherProfile } = await supabase
              .from("profiles")
              .select("id, full_name, email, role")
              .eq("id", otherParticipantId)
              .single()

            // Get last message in conversation
            const { data: lastMessageData } = await supabase
              .from("messages")
              .select('id, content, sender_id, created_at')
              .eq("conversation_id", conv.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle()

            // Get sender profile if last message exists
            let senderName = ''
            if (lastMessageData?.sender_id) {
              if (lastMessageData.sender_id === user.id) {
                senderName = 'You'
              } else if (lastMessageData.sender_id === otherParticipantId) {
                // Use the other participant's name we already fetched
                senderName = otherProfile?.full_name || otherProfile?.email || 'Student'
              } else {
                // Fetch sender profile if it's someone else (shouldn't happen in 1-on-1)
                const { data: profile } = await supabase
                  .from("profiles")
                  .select("full_name, email")
                  .eq("id", lastMessageData.sender_id)
                  .single()
                senderName = profile?.full_name || profile?.email || 'User'
              }
            }

            // Count unread messages (messages not sent by current user)
            const { count: unreadCount } = await supabase
              .from("messages")
              .select("*", { count: "exact", head: true })
              .eq("conversation_id", conv.id)
              .neq("sender_id", user.id)

            const lastMessage = lastMessageData as any

            return {
              id: conv.id,
              title: otherProfile?.full_name || otherProfile?.email || 'Conversation',
              participants: [
                { id: user.id, name: 'You', email: user.email || '', role: 'instructor' },
                { 
                  id: otherParticipantId, 
                  name: otherProfile?.full_name || otherProfile?.email || 'User', 
                  email: otherProfile?.email || '', 
                  role: otherProfile?.role || 'student' 
                }
              ],
              last_message: lastMessage ? {
                content: lastMessage.content,
                sender_name: senderName,
                created_at: lastMessage.created_at
              } : {
                content: 'No messages yet',
                sender_name: '',
                created_at: conv.created_at
              },
              unread_count: unreadCount || 0,
              created_at: conv.created_at,
              updated_at: conv.updated_at
            }
          })
        )

        setConversations(conversationsWithDetails)
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (conversationId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select('id, content, sender_id, created_at')
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })

      if (messagesError) throw messagesError

      if (!messagesData || messagesData.length === 0) {
        setMessages([])
        return
      }

      // Get all unique sender IDs
      const senderIds = [...new Set(messagesData.map(msg => msg.sender_id).filter(Boolean))]

      // Fetch profiles for all senders
      let senderMap = new Map()
      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', senderIds)

        if (profiles) {
          senderMap = new Map(profiles.map((profile: any) => [profile.id, profile]))
        }
      }

      // Format messages
      const formattedMessages: Message[] = messagesData.map(msg => {
        const senderProfile = senderMap.get(msg.sender_id)
        
        // Determine sender name
        let senderName = 'Unknown'
        if (msg.sender_id === user.id) {
          senderName = 'You'
        } else if (senderProfile) {
          senderName = senderProfile.full_name || senderProfile.email || 'User'
        } else {
          // If profile not found, try to get it from the conversation participants
          if (selectedConversation) {
            const participant = selectedConversation.participants.find(p => p.id === msg.sender_id)
            if (participant) {
              senderName = participant.name
            }
          }
        }
        
        return {
          id: msg.id,
          content: msg.content,
          sender_id: msg.sender_id,
          sender_name: senderName,
          sender_email: senderProfile?.email || '',
          created_at: msg.created_at,
          is_read: true
        }
      })

      setMessages(formattedMessages)
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: newMessageData, error: messageError } = await supabase
        .from("messages")
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          content: newMessage.trim()
        })
        .select('id, content, sender_id, created_at')
        .single()

      if (messageError) {
        console.error('Error inserting message:', messageError)
        throw messageError
      }

      // Update conversation updated_at
      const { error: updateError } = await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", selectedConversation.id)

      if (updateError) {
        console.error('Error updating conversation:', updateError)
      }

      // Add message to local state
      const newMsg: Message = {
        id: newMessageData.id,
        content: newMessageData.content,
        sender_id: newMessageData.sender_id,
        sender_name: 'You',
        sender_email: user.email || '',
        created_at: newMessageData.created_at,
        is_read: true
      }

      setMessages(prev => [...prev, newMsg])
      setNewMessage('')

      // Update conversation's last message
      setConversations(prev => prev.map(conv => 
        conv.id === selectedConversation.id 
          ? {
              ...conv,
              last_message: {
                content: newMessage,
                sender_name: 'You',
                created_at: newMessageData.created_at
              },
              updated_at: newMessageData.created_at
            }
          : conv
      ))

      // Notify the other participant about the new message
      const otherParticipantId = selectedConversation.participants.find(
        p => p.id !== user.id
      )?.id

      if (otherParticipantId) {
        await fetch('/api/notifications/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: otherParticipantId,
            type: 'message_received',
            title: 'New Message',
            message: `You have a new message from ${user.email || 'an instructor'}`,
            link: `/instructor/messages?conversation=${selectedConversation.id}`,
            relatedId: newMessageData.id,
            relatedType: 'message'
          })
        }).catch(err => console.error('Failed to create notification:', err))
      }
    } catch (error: any) {
      console.error('Error sending message:', error)
      alert(`Error sending message: ${error?.message || 'Unknown error'}`)
    }
  }

  const handleCreateConversation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (!newConversation.selectedRecipient) {
        alert('Please select a student')
        return
      }

      const recipientId = newConversation.selectedRecipient

      // Check if conversation already exists
      const { data: existingConvs } = await supabase
        .from("conversations")
        .select("*")
        .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)

      const existingConv = existingConvs?.find(
        (conv: any) =>
          (conv.participant_1_id === user.id && conv.participant_2_id === recipientId) ||
          (conv.participant_1_id === recipientId && conv.participant_2_id === user.id)
      )

      if (existingConv) {
        // Find the conversation in our list
        const conv = conversations.find(c => c.id === existingConv.id)
        if (conv) {
          setSelectedConversation(conv)
          fetchMessages(conv.id)
        } else {
          // Refresh conversations to get the full details
          await fetchConversations()
          const updatedConv = conversations.find(c => c.id === existingConv.id)
          if (updatedConv) {
            setSelectedConversation(updatedConv)
            fetchMessages(updatedConv.id)
          }
        }
        setNewConversation({ selectedCourse: '', selectedRecipient: '' })
        setCourseStudents([])
        setShowNewConversation(false)
        return
      }

      // Create new conversation
      const { data: newConvData, error: convError } = await supabase
        .from("conversations")
        .insert({
          participant_1_id: user.id,
          participant_2_id: recipientId
        })
        .select()
        .single()

      if (convError) {
        console.error('Error creating conversation:', convError)
        throw convError
      }

      // Get recipient profile
      const { data: recipientProfile } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .eq("id", recipientId)
        .single()

      // Format new conversation
      const newConv: Conversation = {
        id: newConvData.id,
        title: recipientProfile?.full_name || recipientProfile?.email || 'Student',
        participants: [
          { id: user.id, name: 'You', email: user.email || '', role: 'instructor' },
          { id: recipientProfile?.id || '', name: recipientProfile?.full_name || recipientProfile?.email || 'Student', email: recipientProfile?.email || '', role: recipientProfile?.role || 'student' }
        ],
        last_message: {
          content: 'Conversation started',
          sender_name: 'You',
          created_at: newConvData.created_at
        },
        unread_count: 0,
        created_at: newConvData.created_at,
        updated_at: newConvData.updated_at
      }

      setConversations(prev => [newConv, ...prev])
      setSelectedConversation(newConv)
      setNewConversation({ selectedCourse: '', selectedRecipient: '' })
      setCourseStudents([])
      setShowNewConversation(false)
    } catch (error) {
      console.error('Error creating conversation:', error)
      alert('Error creating conversation')
    }
  }

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.participants.some(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('connectWithYourStudents')}
          </p>
        </div>
        <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>{t('newMessage')}</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('startNewConversation')}</DialogTitle>
              <DialogDescription>
                {t('sendMessageToStudent')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">{t('selectCourse')}</label>
                <Select
                  value={newConversation.selectedCourse}
                  onValueChange={(value) => {
                    setNewConversation(prev => ({ ...prev, selectedCourse: value, selectedRecipient: '' }))
                    fetchCourseStudents(value)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('chooseCourse')} />
                  </SelectTrigger>
                  <SelectContent>
                    {myCourses.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">{t('noCoursesAvailable')}</div>
                    ) : (
                      myCourses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {newConversation.selectedCourse && (
                <div>
                  <label className="block text-sm font-medium mb-2">{t('selectStudent')}</label>
                  {loadingStudents ? (
                    <div className="text-sm text-muted-foreground">{t('loadingStudents')}</div>
                  ) : courseStudents.length === 0 ? (
                    <div className="text-sm text-muted-foreground">{t('noStudentsEnrolled')}</div>
                  ) : (
                    <Select
                      value={newConversation.selectedRecipient}
                      onValueChange={(value) => setNewConversation(prev => ({ ...prev, selectedRecipient: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('chooseStudent')} />
                      </SelectTrigger>
                      <SelectContent>
                        {courseStudents.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              <span>{student.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowNewConversation(false)
                    setNewConversation({ selectedCourse: '', selectedRecipient: '' })
                    setCourseStudents([])
                  }}
                >
                  {tCommon('cancel')}
                </Button>
                <Button 
                  onClick={handleCreateConversation}
                  disabled={!newConversation.selectedRecipient}
                >
                  {t('startConversation')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Conversations List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
                  {t('conversations')}
                </CardTitle>
                <Badge variant="secondary">
                  {conversations.length}
                </Badge>
              </div>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder={t('searchConversations')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-12 px-6">
                  <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {t('noConversations')}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {t('startConversationWithStudent')}
                  </p>
                  <Button onClick={() => setShowNewConversation(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('newMessage')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-l-4 ${
                        selectedConversation?.id === conversation.id 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                          : 'border-transparent'
                      }`}
                      onClick={() => {
                        setSelectedConversation(conversation)
                        fetchMessages(conversation.id)
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                            {conversation.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {conversation.last_message.content}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {conversation.last_message.sender_name}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">•</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(conversation.last_message.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        {conversation.unread_count > 0 && (
                          <Badge variant="destructive" className="ml-2">
                            {conversation.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Messages */}
        <div className="lg:col-span-2">
          {selectedConversation ? (
            <Card className="h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2 text-green-600" />
                    {selectedConversation.title}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">
                      {selectedConversation.participants.length} {t('participants')}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                      {t('noMessagesYet')}
                    </p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_id === user?.id ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-xs px-4 py-2 rounded-lg ${
                          message.sender_id === user?.id 
                            ? "bg-blue-600 text-white" 
                            : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.sender_id === user?.id 
                            ? "text-blue-100" 
                            : "text-gray-500 dark:text-gray-400"
                        }`}>
                          {new Date(message.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Input
                    placeholder={t('typeMessage')}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                  />
                  <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="h-[600px] flex items-center justify-center">
              <CardContent className="text-center">
                <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {t('selectConversation')}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {t('chooseConversationToStartMessaging')}
                </p>
                <Button onClick={() => setShowNewConversation(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('newMessage')}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
