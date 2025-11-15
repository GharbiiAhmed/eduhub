"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  PlayCircle, 
  BarChart3, 
  Award, 
  RotateCcw,
  AlertCircle,
  BookOpen,
  Target,
  Zap
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from '@/i18n/routing'
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

interface Quiz {
  id: string
  title: string
  description: string
  time_limit: number | null
  max_attempts: number
  passing_score: number
  is_published: boolean
  questions_count: number
  course_id: string
  course_title: string
}

interface Question {
  id: string
  question_text: string
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay'
  points: number
  order_index: number
  explanation: string | null
  options: QuestionOption[]
}

interface QuestionOption {
  id: string
  option_text: string
  is_correct: boolean
  order_index: number
}

interface QuizAttempt {
  id: string
  quiz_id: string
  student_id: string
  attempt_number: number
  started_at: string
  submitted_at: string | null
  time_spent: number
  score: number
  is_passed: boolean
  status: 'in_progress' | 'submitted' | 'graded'
}

export default function StudentQuizzes() {
  const t = useTranslations('dashboard')
  const tCourses = useTranslations('courses')
  const tCommon = useTranslations('common')

  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [isQuizActive, setIsQuizActive] = useState(false)
  const [currentAttempt, setCurrentAttempt] = useState<QuizAttempt | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [quizResults, setQuizResults] = useState<any>(null)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchAvailableQuizzes()
  }, [])

  useEffect(() => {
    if (isQuizActive && timeRemaining !== null) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 0) {
            handleSubmitQuiz()
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [isQuizActive, timeRemaining])

  const fetchAvailableQuizzes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get quizzes for enrolled courses
      const { data, error } = await supabase
        .from('quizzes')
        .select(`
          *,
          courses!inner(
            id,
            title,
            enrollments!inner(student_id)
          )
        `)
        .eq('courses.enrollments.student_id', user.id)
        .eq('is_published', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get question counts
      const quizzesWithCounts = await Promise.all(
        data.map(async (quiz) => {
          const { count } = await supabase
            .from('quiz_questions')
            .select('*', { count: 'exact', head: true })
            .eq('quiz_id', quiz.id)
          
          return {
            ...quiz,
            questions_count: count || 0,
            course_title: quiz.courses.title
          }
        })
      )

      setQuizzes(quizzesWithCounts)
    } catch (error) {
      console.error('Error fetching quizzes:', error)
    } finally {
      setLoading(false)
    }
  }

  const startQuiz = async (quiz: Quiz) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check existing attempts
      const { data: existingAttempts, error: attemptsError } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('quiz_id', quiz.id)
        .eq('student_id', user.id)
        .order('attempt_number', { ascending: false })

      if (attemptsError) throw attemptsError

      const attemptNumber = existingAttempts?.length ? existingAttempts[0].attempt_number + 1 : 1

      if (attemptNumber > quiz.max_attempts) {
        alert(t('maxAttemptsReached', { max: quiz.max_attempts }))
        return
      }

      // Create new attempt
      const { data: attempt, error: attemptError } = await supabase
        .from('quiz_attempts')
        .insert({
          quiz_id: quiz.id,
          student_id: user.id,
          attempt_number: attemptNumber,
          status: 'in_progress'
        })
        .select()
        .single()

      if (attemptError) throw attemptError

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('quiz_questions')
        .select(`
          *,
          quiz_question_options(*)
        `)
        .eq('quiz_id', quiz.id)
        .order('order_index')

      if (questionsError) throw questionsError

      const formattedQuestions = questionsData.map(q => ({
        ...q,
        options: q.quiz_question_options || []
      }))

      setCurrentQuiz(quiz)
      setQuestions(formattedQuestions)
      setCurrentAttempt(attempt)
      setCurrentQuestionIndex(0)
      setAnswers({})
      setTimeRemaining(quiz.time_limit ? quiz.time_limit * 60 : null)
      setIsQuizActive(true)
      setShowResults(false)

    } catch (error) {
      console.error('Error starting quiz:', error)
    }
  }

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }))
  }

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const goToQuestion = (index: number) => {
    setCurrentQuestionIndex(index)
  }

  const handleSubmitQuiz = async () => {
    if (!currentQuiz || !currentAttempt) return

    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Calculate score
      let totalPoints = 0
      let earnedPoints = 0

      for (const question of questions) {
        totalPoints += question.points
        const userAnswer = answers[question.id]

        if (userAnswer !== undefined) {
          let isCorrect = false

          switch (question.question_type) {
            case 'multiple_choice':
              if (Array.isArray(userAnswer)) {
                const correctOptions = question.options.filter(opt => opt.is_correct).map(opt => opt.id)
                isCorrect = userAnswer.length === correctOptions.length && 
                           userAnswer.every(id => correctOptions.includes(id))
              }
              break
            case 'true_false':
              const correctAnswer = question.options.find(opt => opt.is_correct)
              isCorrect = userAnswer === correctAnswer?.id
              break
            case 'short_answer':
            case 'essay':
              // For now, we'll mark these as correct if answered
              isCorrect = userAnswer && userAnswer.trim().length > 0
              break
          }

          if (isCorrect) {
            earnedPoints += question.points
          }

          // Save answer
          await supabase
            .from('quiz_answers')
            .insert({
              attempt_id: currentAttempt.id,
              question_id: question.id,
              answer_text: typeof userAnswer === 'string' ? userAnswer : JSON.stringify(userAnswer),
              selected_options: Array.isArray(userAnswer) ? userAnswer : [userAnswer],
              is_correct: isCorrect,
              points_earned: isCorrect ? question.points : 0
            })
        }
      }

      const scorePercentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0
      const isPassed = scorePercentage >= currentQuiz.passing_score

      // Update attempt
      await supabase
        .from('quiz_attempts')
        .update({
          submitted_at: new Date().toISOString(),
          time_spent: timeRemaining ? (currentQuiz.time_limit! * 60) - timeRemaining : 0,
          score: scorePercentage,
          is_passed: isPassed,
          status: 'submitted'
        })
        .eq('id', currentAttempt.id)

      // Notify student about quiz grade
      try {
              await fetch(`${window.location.origin}/api/notifications/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            type: 'quiz_graded',
            title: 'Quiz Graded! 📝',
            message: `Your quiz "${currentQuiz.title}" has been graded. You scored ${scorePercentage}%${isPassed ? ' - Passed! ✅' : ' - Not passed'}.`,
            link: `/student/quizzes`,
            relatedId: currentQuiz.id,
            relatedType: 'quiz'
          })
        }).catch(err => console.error('Failed to create quiz graded notification:', err))
      } catch (notifError) {
        console.error('Error creating quiz graded notification:', notifError)
      }

      setQuizResults({
        score: scorePercentage,
        isPassed,
        totalQuestions: questions.length,
        correctAnswers: earnedPoints,
        totalPoints,
        timeSpent: timeRemaining ? (currentQuiz.time_limit! * 60) - timeRemaining : 0
      })

      setIsQuizActive(false)
      setShowResults(true)
      fetchAvailableQuizzes() // Refresh quiz list

    } catch (error) {
      console.error('Error submitting quiz:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (isQuizActive && currentQuiz && questions.length > 0) {
    const currentQuestion = questions[currentQuestionIndex]
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Quiz Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{currentQuiz.title}</CardTitle>
                <CardDescription>{currentQuiz.description}</CardDescription>
              </div>
              <div className="flex items-center space-x-4">
                {timeRemaining !== null && (
                  <div className="flex items-center space-x-2 text-lg font-semibold">
                    <Clock className="w-5 h-5" />
                    <span className={timeRemaining < 300 ? 'text-red-600' : ''}>
                      {formatTime(timeRemaining)}
                    </span>
                  </div>
                )}
                <Badge variant="outline">
                  {t('question')} {currentQuestionIndex + 1} {t('of')} {questions.length}
                </Badge>
              </div>
            </div>
            <Progress value={progress} className="mt-4" />
          </CardHeader>
        </Card>

        {/* Question */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {currentQuestion.question_text}
              </CardTitle>
              <Badge variant="secondary">
                {currentQuestion.points} {t('points')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {currentQuestion.question_type === 'multiple_choice' && (
              <RadioGroup
                value={answers[currentQuestion.id]}
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
              >
                {currentQuestion.options.map((option) => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.id} id={option.id} />
                    <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                      {option.option_text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {currentQuestion.question_type === 'true_false' && (
              <RadioGroup
                value={answers[currentQuestion.id]}
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
              >
                {currentQuestion.options.map((option) => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.id} id={option.id} />
                    <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                      {option.option_text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {(currentQuestion.question_type === 'short_answer' || currentQuestion.question_type === 'essay') && (
              <Textarea
                placeholder={currentQuestion.question_type === 'essay' ? t('writeYourAnswer') : t('enterYourAnswer')}
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                rows={currentQuestion.question_type === 'essay' ? 6 : 3}
                className="mt-4"
              />
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={previousQuestion}
                disabled={currentQuestionIndex === 0}
              >
                {tCommon('previous')}
              </Button>

              <div className="flex items-center space-x-2">
                {questions.map((_, index) => (
                  <Button
                    key={index}
                    variant={index === currentQuestionIndex ? "default" : "outline"}
                    size="sm"
                    onClick={() => goToQuestion(index)}
                    className="w-8 h-8 p-0"
                  >
                    {index + 1}
                  </Button>
                ))}
              </div>

              {currentQuestionIndex === questions.length - 1 ? (
                <Button onClick={handleSubmitQuiz} disabled={submitting}>
                  {submitting ? t('submitting') : t('submitQuiz')}
                </Button>
              ) : (
                <Button onClick={nextQuestion}>
                  {tCommon('next')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (showResults && quizResults) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              {quizResults.isPassed ? (
                <CheckCircle className="w-8 h-8 text-white" />
              ) : (
                <XCircle className="w-8 h-8 text-white" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {quizResults.isPassed ? t('congratulations') : t('quizCompleted')}
            </CardTitle>
            <CardDescription>
              {quizResults.isPassed 
                ? t('youPassedQuiz') 
                : t('needToPass', { score: currentQuiz?.passing_score })
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">{quizResults.score}%</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{t('finalScore')}</div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-3xl font-bold text-green-600">{quizResults.correctAnswers}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{t('correctAnswers')}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span>{t('totalQuestions')}:</span>
                <span className="font-semibold">{quizResults.totalQuestions}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('timeSpent')}:</span>
                <span className="font-semibold">{formatTime(quizResults.timeSpent)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('passingScore')}:</span>
                <span className="font-semibold">{currentQuiz?.passing_score}%</span>
              </div>
            </div>

            <div className="flex space-x-4">
              <Button asChild className="flex-1">
                <Link href="/student/courses">
                  {tCourses('backToCourses')}
                </Link>
              </Button>
              <Button variant="outline" asChild className="flex-1">
                <Link href="/student/quizzes">
                  {t('viewAllQuizzes')}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('myQuizzes')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('takeQuizzesForEnrolledCourses')}
          </p>
        </div>
        <Button asChild>
          <Link href="/student/courses">
            <BookOpen className="w-4 h-4 mr-2" />
            {tCourses('browseCourses')}
          </Link>
        </Button>
      </div>

      {/* Quizzes Grid */}
      {quizzes.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <PlayCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {t('noQuizzesAvailable')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('needToEnrollToSeeQuizzes')}
            </p>
            <Button asChild>
              <Link href="/courses">
                {tCourses('browseCourses')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <Card key={quiz.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{quiz.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {quiz.course_title}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">
                    {quiz.questions_count} {t('questions')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {quiz.description || t('noDescriptionAvailable')}
                  </p>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span>{quiz.time_limit ? `${quiz.time_limit}m` : t('noLimit')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Target className="w-4 h-4 text-green-600" />
                      <span>{quiz.passing_score}% {t('toPass')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RotateCcw className="w-4 h-4 text-purple-600" />
                      <span>{quiz.max_attempts} {t('attempts')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-orange-600" />
                      <span>{quiz.questions_count} {t('questions')}</span>
                    </div>
                  </div>

                  <Button 
                    onClick={() => startQuiz(quiz)}
                    className="w-full"
                  >
                    <PlayCircle className="w-4 h-4 mr-2" />
                    {t('startQuiz')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}


