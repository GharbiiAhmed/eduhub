"use client"

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
  Clock, 
  Users, 
  Eye,
  Reply,
  Pin,
  Lock,
  BookOpen,
  Calendar,
  ChevronRight,
  Mail,
  User,
  CheckCircle,
  AlertCircle
} from "lucide-react"
import Link from "next/link"

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

export default function StudentMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [showNewConversation, setShowNewConversation] = useState(false)
  const [newConversation, setNewConversation] = useState({
    title: '',
    recipient_email: '',
    selectedCourse: '',
    selectedRecipient: ''
  })
  const [enrolledCourses, setEnrolledCourses] = useState<Array<{
    id: string
    title: string
    instructor_id: string
    instructor_name: string
  }>>([])
  const [courseRecipients, setCourseRecipients] = useState<Array<{
    id: string
    name: string
    email: string
    role: string
  }>>([])
  const [loadingRecipients, setLoadingRecipients] = useState(false)

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
      fetchEnrolledCourses()

      // Subscribe to new messages for real-time updates
      const channel = supabase
        .channel('conversations-updates')
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

  const fetchEnrolledCourses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('No user found for fetchEnrolledCourses')
        return
      }

      // Get enrolled courses
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', user.id)

      if (enrollmentsError) {
        console.error('Error fetching enrollments:', enrollmentsError)
        setEnrolledCourses([])
        return
      }

      if (!enrollments || enrollments.length === 0) {
        console.log('No enrollments found for user:', user.id)
        setEnrolledCourses([])
        return
      }

      const courseIds = enrollments.map(e => e.course_id).filter(Boolean)
      console.log('Found enrollments, course IDs:', courseIds)

      if (courseIds.length === 0) {
        setEnrolledCourses([])
        return
      }

      // Get courses (including draft/published - students can message about any course they're enrolled in)
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('id, title, instructor_id, status')
        .in('id', courseIds)

      if (coursesError) {
        console.error('Error fetching courses:', coursesError)
        console.error('Course IDs attempted:', courseIds)
        setEnrolledCourses([])
        return
      }

      if (!courses || courses.length === 0) {
        console.log('No courses found for course IDs:', courseIds)
        setEnrolledCourses([])
        return
      }

      console.log('Found courses:', courses.length, courses.map(c => ({ id: c.id, title: c.title, status: c.status })))

      // Get instructor IDs
      const instructorIds = [...new Set(courses.map(c => c.instructor_id).filter(Boolean))]

      // Get instructor profiles
      let instructorMap = new Map()
      if (instructorIds.length > 0) {
        const { data: instructors } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', instructorIds)

        if (instructors) {
          instructorMap = new Map(instructors.map((inst: any) => [inst.id, inst]))
        }
      }

      // Combine courses with instructor info
      const coursesWithInstructors = courses.map((course: any) => {
        const instructor = instructorMap.get(course.instructor_id)
        return {
          id: course.id,
          title: course.title,
          instructor_id: course.instructor_id,
          instructor_name: instructor?.full_name || instructor?.email || 'Instructor'
        }
      })

      console.log('Setting enrolled courses:', coursesWithInstructors)
      setEnrolledCourses(coursesWithInstructors)
    } catch (error) {
      console.error('Error fetching enrolled courses:', error)
      setEnrolledCourses([])
    }
  }

  const fetchCourseRecipients = async (courseId: string) => {
    if (!courseId) {
      setCourseRecipients([])
      return
    }

    setLoadingRecipients(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get course info
      const { data: course } = await supabase
        .from('courses')
        .select('instructor_id')
        .eq('id', courseId)
        .single()

      if (!course) return

      // Get instructor
      const { data: instructor } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('id', course.instructor_id)
        .single()

      // Get enrolled students (excluding current user)
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('course_id', courseId)
        .neq('student_id', user.id)

      const studentIds = enrollments?.map(e => e.student_id).filter(Boolean) || []

      let students: any[] = []
      if (studentIds.length > 0) {
        const { data: studentsData } = await supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .in('id', studentIds)
        
        students = studentsData || []
      }

      // Combine instructor and students
      const recipients: Array<{
        id: string
        name: string
        email: string
        role: string
      }> = []

      if (instructor) {
        recipients.push({
          id: instructor.id,
          name: instructor.full_name || instructor.email || 'Instructor',
          email: instructor.email,
          role: instructor.role
        })
      }

      students.forEach((student: any) => {
        recipients.push({
          id: student.id,
          name: student.full_name || student.email || 'Student',
          email: student.email,
          role: student.role
        })
      })

      setCourseRecipients(recipients)
    } catch (error) {
      console.error('Error fetching course recipients:', error)
    } finally {
      setLoadingRecipients(false)
    }
  }

  const fetchConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get all conversations where the user is a participant
      const { data: conversationsData, error: conversationsError } = await supabase
        .from("conversations")
        .select("*")
        .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
        .order("updated_at", { ascending: false })

      if (conversationsError) throw conversationsError

      // Get profiles for all participants and last messages
      const conversationsWithDetails = await Promise.all(
        (conversationsData || []).map(async (conv) => {
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
          let senderProfile: any = null
          if (lastMessageData?.sender_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, email")
              .eq("id", lastMessageData.sender_id)
              .single()
            senderProfile = profile
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
              { id: user.id, name: 'You', email: user.email || '', role: 'student' },
              { 
                id: otherParticipantId, 
                name: otherProfile?.full_name || otherProfile?.email || 'User', 
                email: otherProfile?.email || '', 
                role: otherProfile?.role || 'student' 
              }
            ],
            last_message: lastMessage ? {
              content: lastMessage.content,
              sender_name: senderProfile?.full_name || 'Unknown',
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

      // Get all messages for this conversation
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
        
        return {
          id: msg.id,
          content: msg.content,
          sender_id: msg.sender_id,
          sender_name: msg.sender_id === user.id ? 'You' : (senderProfile?.full_name || senderProfile?.email || 'Unknown'),
          sender_email: senderProfile?.email || '',
          created_at: msg.created_at,
          is_read: true // Read status would need a separate read_receipts table
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

      // Insert message into database
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
        alert('Please select a recipient')
        return
      }

      // Find recipient by selected ID
      const recipientId = newConversation.selectedRecipient
      const { data: recipientProfile } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .eq("id", recipientId)
        .single()

      if (!recipientProfile) {
        alert('User not found')
        return
      }

      // Check if conversation already exists between these two users
      const { data: existingConvs } = await supabase
        .from("conversations")
        .select("*")
        .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)

      // Find conversation between these two specific users
      const existingConv = existingConvs?.find(
        (conv: any) =>
          (conv.participant_1_id === user.id && conv.participant_2_id === recipientProfile.id) ||
          (conv.participant_1_id === recipientProfile.id && conv.participant_2_id === user.id)
      )

      if (existingConv) {
        // Conversation already exists, just select it
        setSelectedConversation({
          id: existingConv.id,
          title: recipientProfile.full_name || recipientProfile.email,
          participants: [
            { id: user.id, name: 'You', email: user.email || '', role: 'student' },
            { id: recipientProfile.id, name: recipientProfile.full_name || recipientProfile.email, email: recipientProfile.email, role: recipientProfile.role }
          ],
          last_message: { content: '', sender_name: '', created_at: existingConv.created_at },
          unread_count: 0,
          created_at: existingConv.created_at,
          updated_at: existingConv.updated_at
        })
        fetchMessages(existingConv.id)
        setNewConversation({ title: '', recipient_email: '', selectedCourse: '', selectedRecipient: '' })
        setCourseRecipients([])
        setShowNewConversation(false)
        return
      }

      // Create new conversation
      const { data: newConvData, error: convError } = await supabase
        .from("conversations")
        .insert({
          participant_1_id: user.id,
          participant_2_id: recipientProfile.id
        })
        .select()
        .single()

      if (convError) {
        console.error('Error creating conversation:', convError)
        throw convError
      }

      // Format new conversation
      const newConv: Conversation = {
        id: newConvData.id,
        title: recipientProfile.full_name || recipientProfile.email,
        participants: [
          { id: user.id, name: 'You', email: user.email || '', role: 'student' },
          { id: recipientProfile.id, name: recipientProfile.full_name || recipientProfile.email, email: recipientProfile.email, role: recipientProfile.role }
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
      setNewConversation({ title: '', recipient_email: '', selectedCourse: '', selectedRecipient: '' })
      setCourseRecipients([])
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Messages</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Connect with instructors and fellow students
          </p>
        </div>
        <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>New Message</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start New Conversation</DialogTitle>
              <DialogDescription>
                Send a message to an instructor or fellow student
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Select Course</label>
                <Select
                  value={newConversation.selectedCourse}
                  onValueChange={(value) => {
                    setNewConversation(prev => ({ ...prev, selectedCourse: value, selectedRecipient: '' }))
                    fetchCourseRecipients(value)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a course..." />
                  </SelectTrigger>
                  <SelectContent>
                    {enrolledCourses.length === 0 ? (
                      <div className="px-2 py-1.5">
                        <div className="text-sm text-muted-foreground mb-2">No enrolled courses</div>
                        <Link href="/courses" className="text-xs text-blue-600 hover:underline">
                          Browse courses to enroll →
                        </Link>
                      </div>
                    ) : (
                      enrolledCourses.map((course) => (
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
                  <label className="block text-sm font-medium mb-2">Select Recipient</label>
                  {loadingRecipients ? (
                    <div className="text-sm text-muted-foreground">Loading...</div>
                  ) : courseRecipients.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No recipients available</div>
                  ) : (
                    <Select
                      value={newConversation.selectedRecipient}
                      onValueChange={(value) => setNewConversation(prev => ({ ...prev, selectedRecipient: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a recipient..." />
                      </SelectTrigger>
                      <SelectContent>
                        {courseRecipients.map((recipient) => (
                          <SelectItem key={recipient.id} value={recipient.id}>
                            <div className="flex items-center gap-2">
                              <span>{recipient.name}</span>
                              <Badge variant={recipient.role === 'instructor' ? 'default' : 'secondary'} className="text-xs">
                                {recipient.role}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Subject (Optional)</label>
                <Input
                  placeholder="Message subject..."
                  value={newConversation.title}
                  onChange={(e) => setNewConversation(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowNewConversation(false)
                    setNewConversation({ title: '', recipient_email: '', selectedCourse: '', selectedRecipient: '' })
                    setCourseRecipients([])
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateConversation}
                  disabled={!newConversation.selectedRecipient}
                >
                  Start Conversation
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
                  Conversations
                </CardTitle>
                <Badge variant="secondary">
                  {conversations.length}
                </Badge>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search conversations..."
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
                    No Conversations
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Start a conversation with instructors or students
                  </p>
                  <Button onClick={() => setShowNewConversation(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Message
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
                      {selectedConversation.participants.length} participants
                    </Badge>
                  </div>
                </CardTitle>
                <CardDescription>
                  {selectedConversation.participants.map(p => p.name).join(', ')}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_id === selectedConversation.participants.find(p => p.email === user?.email)?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-lg ${
                          message.sender_id === (selectedConversation.participants.find(p => p.email === user?.email)?.id)
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.sender_id === (selectedConversation.participants.find(p => p.email === user?.email)?.id) ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {new Date(message.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                <div className="flex space-x-2">
                  <Textarea
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1"
                    rows={2}
                    onKeyDown={(e) => {
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
                  </CardContent>
                </Card>
          ) : (
            <Card className="h-[600px] flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Select a Conversation
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Choose a conversation from the list to start messaging
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}