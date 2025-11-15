import { createClient } from "@/lib/supabase/server"
import { getQrokAPI, getMockAIResponse } from "@/lib/qrok-api"

// Supported languages for translations
export const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko']

// User roles in the system
export const USER_ROLES = {
  ADMIN: 'admin',
  STUDENT: 'student', 
  INSTRUCTOR: 'instructor',
  INSTRUCTOR_ASSISTANT: 'instructor_assistant',
  TEAM_MANAGER: 'team_manager',
  TEAM_LEADER: 'team_leader'
} as const

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]

interface ChatbotContext {
  courseId?: string
  courseTitle?: string
  userRole?: UserRole
  userId?: string
}

interface ChatbotLog {
  id: string
  user_id: string
  course_id?: string
  query: string
  response: string
  context?: any
  timestamp: string
  created_at: string
}

interface ChatbotLogTranslation {
  id: string
  chatbot_log_id: string
  lang: string
  query_translation?: string
  response_translation?: string
  created_at: string
}

// Debug function to check API key loading
function debugApiKey() {
  const qrokKey = process.env.QROK_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY
  
  console.log('🔍 Debug: QROK_API_KEY loaded:', qrokKey ? 'YES' : 'NO')
  console.log('🔍 Debug: OPENAI_API_KEY loaded:', openaiKey ? 'YES' : 'NO')
  
  if (qrokKey) {
    console.log('🔍 Debug: QROK_API_KEY starts with:', qrokKey.substring(0, 10) + '...')
    console.log('🔍 Debug: QROK_API_KEY length:', qrokKey.length)
  }
  
  if (openaiKey) {
    console.log('🔍 Debug: OPENAI_API_KEY starts with:', openaiKey.substring(0, 10) + '...')
  }
}

// Generate AI response using Qrok/OpenAI or fallback
async function generateResponse(query: string, context?: ChatbotContext): Promise<string> {
  debugApiKey()

  const systemPrompt = `You are EduHub AI Assistant, an AI assistant specifically designed for a comprehensive Learning Management System (LMS). You have deep knowledge about this LMS platform and can help users with all aspects of their learning journey.

## LMS SYSTEM OVERVIEW
This is a full-stack Next.js learning management system with the following key features:

### 🏗️ TECHNOLOGY STACK
- **Frontend**: Next.js 15 with React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes with Supabase
- **Database**: PostgreSQL with Supabase
- **Authentication**: Supabase Auth with JWT tokens
- **Real-time**: Supabase real-time subscriptions
- **Payment**: Stripe integration for course purchases
- **File Upload**: Supabase Storage for images, PDFs, and videos
- **AI Integration**: Qrok API (ChatGPT) for this chatbot
- **UI Components**: Radix UI with custom styling

### 👥 USER ROLES & PERMISSIONS
The system supports 6 distinct user roles:
1. **ADMIN** - Full system access and control, user management, content moderation
2. **STUDENT** - Students with course access, progress tracking, certificate generation
3. **INSTRUCTOR** - Course instructors, content creators, student management
4. **INSTRUCTOR_ASSISTANT** - Assistant to instructors with limited permissions
5. **TEAM_MANAGER** - Manages team operations and members
6. **TEAM_LEADER** - Leads team activities and projects

### 📚 CORE LEARNING FEATURES

#### Course Management
- **Course Creation**: Instructors can create courses with rich content (modules, lessons, quizzes, assignments)
- **Course Status**: Draft, Published, Archived
- **Categories**: Technology, Business, Arts, Science, Health, Other
- **Difficulty Levels**: Beginner, Intermediate, Advanced
- **Pricing**: Free and paid courses with Stripe integration
- **Multilingual Support**: Course content translation system

#### Content Structure
- **Modules**: Organized course sections
- **Lessons**: Individual learning units within modules
- **Quizzes**: Interactive assessments (Multiple Choice, True/False, Short Answer)
- **Assignments**: Homework and projects with manual grading
- **Resources**: Additional learning materials (PDFs, videos, etc.)

#### Assessment System
- **Progress Tracking**: Lesson completion and quiz scores
- **Certificate Generation**: Automatic certificate creation upon completion
- **Time Tracking**: Lesson completion time monitoring
- **Retake Policies**: Configurable quiz retake settings

#### Progress Tracking
- **Lesson Completion**: Track completed lessons
- **Quiz Scores**: Monitor assessment performance
- **Overall Progress**: Course completion percentages
- **Certificate Generation**: Automatic certificate creation upon completion

### 🎯 ADVANCED FEATURES

#### Team Collaboration
- **Team Management**: Create and manage learning teams
- **Team Activities**: Task assignments and project management
- **Team Communication**: Internal messaging system
- **Team Roles**: Leader and member hierarchies
- **Team Invitations**: Email-based team joining system
- **Team Progress Tracking**: Monitor team member learning progress

#### Communication Tools
- **Discussion Forums**: Course-specific discussion boards
- **Comments System**: Threaded discussions
- **Private Messaging**: Direct user-to-user communication
- **Notifications**: Real-time system notifications
- **Email Notifications**: Automated email alerts

#### AI-Powered Features
- **Chatbot**: AI-powered learning assistant (you!)
- **Course Recommendations**: Personalized course suggestions
- **Content Analysis**: AI-assisted course analysis
- **Learning Analytics**: AI-driven insights and reports

### 💰 PAYMENT & SUBSCRIPTION SYSTEM
- **Stripe Integration**: Secure payment processing
- **Multiple Payment Methods**: Credit cards, digital wallets
- **Subscription Plans**: Recurring payment support
- **Payment History**: Complete transaction records
- **Refund Management**: Automated refund processing

### 📊 ANALYTICS & REPORTING
- **Admin Analytics**: User statistics, revenue tracking, course performance
- **Instructor Analytics**: Student progress, course analytics, assessment results
- **Student Analytics**: Personal progress, performance metrics, learning path

### 🔧 SYSTEM ADMINISTRATION
- **User Management**: CRUD operations, role assignment, status management
- **Content Moderation**: Content review, moderation logs, report management
- **System Settings**: Platform configuration, file upload limits, security settings

### 🌐 INTERNATIONALIZATION
- **Multi-language Support**: Multiple language options
- **Content Translation**: Course content in multiple languages
- **UI Translation**: Interface localization
- **Dynamic Language Switching**: Real-time language changes

### 🔒 SECURITY & AUTHENTICATION
- **Supabase Auth**: Secure authentication with JWT tokens
- **Email Verification**: Account verification system
- **Password Reset**: Secure password recovery
- **Role-based Access Control**: Granular permission system
- **RLS Policies**: Row-level security for data protection

### 📹 MEDIA & FILE MANAGEMENT
- **Video Processing**: Support for multiple formats
- **Video Streaming**: Integrated video player
- **YouTube Integration**: External video support
- **File Management**: Support for images, PDFs, documents with role-based permissions

## YOUR CAPABILITIES
As EduHub AI Assistant, you can help users with:

1. **Course Navigation**: Guide users through course structure, modules, and lessons
2. **Assessment Help**: Explain quiz formats, grading policies, and retake options
3. **Progress Tracking**: Help users understand their learning progress and certificates
4. **Technical Support**: Assist with platform features, file uploads, and system navigation
5. **Team Collaboration**: Guide users on team features, invitations, and activities
6. **Payment Questions**: Help with course purchases, subscriptions, and payment history
7. **Communication Tools**: Assist with discussions, messaging, and notifications
8. **Content Creation**: Guide instructors on creating courses, modules, and assessments
9. **Administrative Tasks**: Help admins with user management and system settings
10. **Learning Strategies**: Provide study tips, learning paths, and educational guidance

## RESPONSE GUIDELINES
- Be helpful, friendly, and educational in your responses
- Provide specific, actionable advice based on the LMS features
- If asked about course-specific content, use the provided context
- Direct users to appropriate sections of the platform when relevant
- Maintain a professional yet approachable tone
- If you don't know something specific about the system, suggest contacting support
- Keep responses concise but comprehensive
- Use emojis sparingly and appropriately

Remember: You are specifically designed for this LMS platform and should focus your responses on helping users make the most of their learning experience within this system.`

  const prompt = context?.courseTitle 
    ? `User asked: "${query}" about course "${context.courseTitle}". User role: ${context.userRole || 'student'}. Respond helpfully using your knowledge of the LMS system.`
    : `User asked: "${query}". User role: ${context?.userRole || 'student'}. Respond helpfully using your knowledge of the LMS system.`

  try {
    console.log('🔍 Debug: Attempting AI API call...')
    
    const qrokAPI = getQrokAPI()
    const response = await qrokAPI.generateText(prompt, systemPrompt, {
      model: "gpt-4o-mini",
      maxTokens: 1000,
      temperature: 0.7
    })
    
    console.log('✅ Debug: AI API call successful')
    return response
  } catch (error) {
    console.error('❌ AI API Error Details:')
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Full error:', error)
    
    // Provide specific guidance based on error type
    if (error instanceof Error) {
      if (error.message.includes('invalid_api_key')) {
        throw new Error('Invalid AI API key. Please check your API key configuration.')
      } else if (error.message.includes('rate_limit')) {
        throw new Error('AI API rate limit exceeded. Please try again later.')
      }
    }
    
    // Fallback to mock response
    console.warn('Using mock response due to API error')
    return getMockAIResponse(query, context?.userRole || 'student')
  }
}

// Create chatbot log entry
async function createChatbotLog(
  userId: string,
  query: string,
  response: string,
  context?: ChatbotContext
): Promise<string> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('chatbot_logs')
    .insert({
      user_id: userId,
      course_id: context?.courseId,
      query,
      response,
      context: context ? JSON.stringify(context) : null,
      timestamp: new Date().toISOString()
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating chatbot log:', error)
    throw new Error('Failed to create chatbot log')
  }

  return data.id
}

// Create translations for chatbot log
async function createChatbotLogTranslations(
  logId: string,
  query: string,
  response: string,
  languages: string[] = ['en']
): Promise<void> {
  const supabase = await createClient()
  
  const translations = languages.map(lang => ({
    chatbot_log_id: logId,
    lang,
    query_translation: query, // For now, use original text
    response_translation: response // For now, use original text
  }))

  const { error } = await supabase
    .from('chatbot_log_translations')
    .insert(translations)

  if (error) {
    console.error('Error creating chatbot log translations:', error)
    // Don't throw error as translations are optional
  }
}

// Main chatbot service function
export async function askChatbot(
  userId: string,
  query: string,
  courseId?: string,
  userRole?: UserRole
): Promise<{ response: string; logId?: string }> {
  if (!query.trim()) {
    throw new Error('Query is required')
  }

  const supabase = await createClient()
  let context: ChatbotContext | undefined

  // Get course context if courseId is provided
  if (courseId) {
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, instructor_id')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      throw new Error('Course not found')
    }

    // Check if user is enrolled or is the instructor
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', userId)
      .eq('course_id', courseId)
      .single()

    const isInstructor = course.instructor_id === userId
    const isEnrolled = !!enrollment

    if (!isEnrolled && !isInstructor && userRole !== USER_ROLES.ADMIN) {
      throw new Error('Unauthorized: not enrolled or instructor')
    }

    context = {
      courseId,
      courseTitle: course.title,
      userRole,
      userId
    }
  } else {
    context = {
      userRole,
      userId
    }
  }

  // Generate AI response
  const response = await generateResponse(query, context)

  // Create log entry
  let logId: string | undefined
  try {
    logId = await createChatbotLog(userId, query, response, context)
    
    // Create translations (optional)
    await createChatbotLogTranslations(logId, query, response, ['en'])
  } catch (error) {
    console.error('Failed to create chatbot log:', error)
    // Don't fail the request if logging fails
  }

  return { response, logId }
}

// Get chatbot logs for a user
export async function getChatbotLogs(
  userId: string,
  userRole: UserRole,
  lang: string = 'en',
  limit: number = 50
): Promise<ChatbotLog[]> {
  const supabase = await createClient()
  
  let query = supabase
    .from('chatbot_logs')
    .select(`
      id,
      user_id,
      course_id,
      query,
      response,
      context,
      timestamp,
      created_at,
      courses(title),
      chatbot_log_translations!inner(
        query_translation,
        response_translation
      )
    `)
    .eq('chatbot_log_translations.lang', lang)
    .order('timestamp', { ascending: false })
    .limit(limit)

  // Apply user-specific filtering
  if (userRole !== USER_ROLES.ADMIN) {
    query = query.eq('user_id', userId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching chatbot logs:', error)
    throw new Error('Failed to fetch chatbot logs')
  }

  // Transform the data to use translations if available
  return (data || []).map(log => ({
    id: log.id,
    user_id: log.user_id,
    course_id: log.course_id,
    query: log.chatbot_log_translations?.[0]?.query_translation || log.query,
    response: log.chatbot_log_translations?.[0]?.response_translation || log.response,
    context: log.context,
    timestamp: log.timestamp,
    created_at: log.created_at
  }))
}

// Get chatbot statistics for admin
export async function getChatbotStats(userRole: UserRole): Promise<{
  totalQueries: number
  totalUsers: number
  queriesToday: number
  topCourses: Array<{ courseId: string; courseTitle: string; queryCount: number }>
}> {
  if (userRole !== USER_ROLES.ADMIN) {
    throw new Error('Unauthorized: Admin access required')
  }

  const supabase = await createClient()
  
  // Get total queries
  const { count: totalQueries } = await supabase
    .from('chatbot_logs')
    .select('*', { count: 'exact', head: true })

  // Get total unique users
  const { count: totalUsers } = await supabase
    .from('chatbot_logs')
    .select('user_id', { count: 'exact', head: true })

  // Get queries today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const { count: queriesToday } = await supabase
    .from('chatbot_logs')
    .select('*', { count: 'exact', head: true })
    .gte('timestamp', today.toISOString())

  // Get top courses by query count
  const { data: topCourses } = await supabase
    .from('chatbot_logs')
    .select(`
      course_id,
      courses(title)
    `)
    .not('course_id', 'is', null)

  const courseStats = (topCourses || []).reduce((acc, log) => {
    if (log.course_id && log.courses && Array.isArray(log.courses) && log.courses.length > 0) {
      const courseTitle = log.courses[0]?.title
      if (courseTitle) {
        const existing = acc.find(item => item.courseId === log.course_id)
        if (existing) {
          existing.queryCount++
        } else {
          acc.push({
            courseId: log.course_id,
            courseTitle: courseTitle,
            queryCount: 1
          })
        }
      }
    }
    return acc
  }, [] as Array<{ courseId: string; courseTitle: string; queryCount: number }>)

  return {
    totalQueries: totalQueries || 0,
    totalUsers: totalUsers || 0,
    queriesToday: queriesToday || 0,
    topCourses: courseStats.sort((a, b) => b.queryCount - a.queryCount).slice(0, 10)
  }
}
