import { createClient } from "@/lib/supabase/server"

// Use Groq SDK - Install with: npm install groq-sdk
const Groq = require('groq-sdk');

// Debug: Check API key loading
console.log('🔍 Debug: GROQ_API_KEY loaded:', process.env.GROQ_API_KEY ? 'YES' : 'NO');
if (process.env.GROQ_API_KEY) {
  console.log('🔍 Debug: GROQ_API_KEY starts with:', process.env.GROQ_API_KEY.substring(0, 10) + '...');
  console.log('🔍 Debug: GROQ_API_KEY length:', process.env.GROQ_API_KEY.length);
}

// Initialize Groq client only if API key is available
let groq: any = null;
if (process.env.GROQ_API_KEY) {
  try {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    console.log('✅ Groq client initialized successfully');
  } catch (error) {
    console.warn('Failed to initialize Groq client:', error);
  }
} else {
  console.warn('GROQ_API_KEY is not configured. Chatbot functionality will be disabled.');
}

const generateResponse = async (query: string, context?: any) => {
  if (!groq) {
    throw new Error('Groq API key is not configured. Chatbot functionality is disabled.');
  }

  try {
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
- **AI Integration**: Groq API (Llama-3.1-8b-instant) for this chatbot
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

Remember: You are specifically designed for this LMS platform and should focus your responses on helping users make the most of their learning experience within this system.`;

    const prompt = context?.courseTitle 
      ? `User asked: "${query}" about course "${context.courseTitle}". User role: ${context.userRole || 'student'}. Respond helpfully using your knowledge of the LMS system.`
      : `User asked: "${query}". User role: ${context?.userRole || 'student'}. Respond helpfully using your knowledge of the LMS system.`;

    console.log('🔍 Debug: Attempting Groq API call...');
    
    // Use Llama-3.1-8b-instant model for Groq (exactly like your example)
    const chatCompletion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1000,
      temperature: 0.7
    });
    
    console.log('✅ Debug: Groq API call successful');
    return chatCompletion.choices[0].message.content;
  } catch (error) {
    console.error('❌ Groq API Error Details:');
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error status:', (error as any)?.status);
    console.error('Error code:', (error as any)?.code);
    console.error('Full error:', error);
    
    // Provide specific guidance based on error type
    if (error instanceof Error) {
      if (error.message.includes('invalid_api_key')) {
        throw new Error('Invalid Groq API key. Please check your API key configuration.');
      } else if (error.message.includes('rate_limit')) {
        throw new Error('Groq API rate limit exceeded. Please try again later.');
      }
    }
    
    throw new Error(`Groq API Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const askChatbot = async (user: any, query: string, courseId?: string) => {
  if (!query) throw new Error('Query is required');

  let context = null;
  if (courseId && user) {
    const supabase = await createClient()
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, instructor_id')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      throw new Error('Course not found');
    }

    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', user.id)
      .eq('course_id', courseId)
      .single()

    const isTrainer = course.instructor_id === user.id;
    const isEnrolled = !!enrollment;

    if (!isEnrolled && !isTrainer) {
      throw new Error('Unauthorized: not enrolled or trainer');
    }

    context = { courseId, courseTitle: course.title };
  }

  const response = await generateResponse(query, context);

  // Only create log if user is authenticated
  let logId = null;
  if (user) {
    const supabase = await createClient()
    const { data: log, error: logError } = await supabase
      .from('chatbot_logs')
      .insert({
        user_id: user.id,
        query,
        response,
        context: context ? JSON.stringify(context) : null,
        timestamp: new Date().toISOString()
      })
      .select('id')
      .single()

    if (logError) {
      console.error('Error creating chatbot log:', logError);
    } else {
      logId = log.id;
    }
  }

  return { response, logId };
};

export const getChatbotLogs = async (user: any, lang: string = 'en') => {
  const supabase = await createClient()
  
  // Get user role from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const userRole = profile?.role || 'student'
  
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
      courses(title)
    `)
    .order('timestamp', { ascending: false })
    .limit(50)

  // Apply user-specific filtering
  if (userRole !== 'admin') {
    query = query.eq('user_id', user.id)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching chatbot logs:', error)
    throw new Error('Failed to fetch chatbot logs')
  }

  return data || []
};
