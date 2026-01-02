"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState, use } from "react"
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import ModuleCurriculumSidebar from "@/components/student/module-curriculum-sidebar"
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Award, 
  Trophy,
  Target,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  BookOpen
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Quiz {
  id: string
  title: string
  description: string
  passing_score: number
  lesson_id?: string
  module_id?: string
  course_id?: string
}

export default function StudentQuizPage({
  params
}: {
  params: Promise<{ quizId: string }>
}) {
  const t = useTranslations('courses')
  const tCommon = useTranslations('common')
  const { quizId } = use(params)
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [moduleId, setModuleId] = useState<string | null>(null)
  const [courseId, setCourseId] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [isQuizActive, setIsQuizActive] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const fetchQuiz = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data: quizData } = await supabase
        .from("quizzes")
        .select(`
          *,
          lessons(module_id, modules(course_id)),
          modules(course_id)
        `)
        .eq("id", quizId)
        .single()

      if (quizData) {
        setQuiz(quizData)
        
        if (quizData.module_id) {
          setModuleId(quizData.module_id)
          if (quizData.modules) {
            setCourseId(quizData.modules.course_id)
          }
        } else if (quizData.lesson_id && quizData.lessons) {
          setModuleId(quizData.lessons.module_id)
          if (quizData.lessons.modules) {
            setCourseId(quizData.lessons.modules.course_id)
          }
        }

        const { data: questionsData } = await supabase
          .from("quiz_questions")
          .select("*")
          .eq("quiz_id", quizId)
          .order("order_index", { ascending: true })

        if (questionsData) {
          const questionsWithOptions = await Promise.all(
            questionsData.map(async (question) => {
              let { data: optionsData } = await supabase
                .from("quiz_question_options")
                .select("*")
                .eq("question_id", question.id)
                .order("order_index", { ascending: true })

              if (!optionsData || optionsData.length === 0) {
                const { data: legacyOptions } = await supabase
                  .from("quiz_options")
                  .select("*")
                  .eq("question_id", question.id)
                  .order("order_index", { ascending: true })
                optionsData = legacyOptions || []
              }

              return {
                ...question,
                options: optionsData || [],
              }
            }),
          )

          setQuestions(questionsWithOptions)
        }
      }

      setIsLoading(false)
    }

    fetchQuiz()
  }, [quizId, router])

  useEffect(() => {
    if (isQuizActive && timeRemaining !== null && timeRemaining > 0) {
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

  const startQuiz = () => {
    setIsQuizActive(true)
  }

  const handleSubmitQuiz = async () => {
    if (!quiz) return
    
    const supabase = createClient()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      let correctCount = 0
      const answerRecords: Array<{ question_id: string; selected_option_id?: string | null; answer_text?: string | null }> = []

      for (const question of questions) {
        const selectedOptionId = answers[question.id]
        const selectedOption = question.options.find((opt: any) => opt.id === selectedOptionId)
        const isCorrect = !!selectedOption?.is_correct
        if (isCorrect) correctCount++

        if (selectedOption) {
          answerRecords.push({ 
            question_id: question.id, 
            selected_option_id: selectedOptionId, 
            answer_text: selectedOption.option_text 
          })
        } else {
          answerRecords.push({ question_id: question.id })
        }
      }

      const calculatedScore = Math.round((correctCount / Math.max(questions.length, 1)) * 100)
      const isPassed = calculatedScore >= quiz.passing_score

      const { data: attemptData, error: attemptError } = await supabase
        .from("quiz_attempts")
        .insert({ 
          student_id: user.id, 
          quiz_id: quiz.id,
          score: calculatedScore,
          passed: isPassed
        })
        .select()
        .single()

      if (attemptError) throw attemptError

      if (attemptData) {
        const inserts = answerRecords.map((record) => ({
          attempt_id: attemptData.id,
          question_id: record.question_id,
          ...(record.selected_option_id ? { selected_option_id: record.selected_option_id } : {}),
          ...(record.answer_text ? { answer_text: record.answer_text } : {}),
        }))
        const { error: answersError } = await supabase.from("quiz_answers").insert(inserts)
        if (answersError) throw answersError
      }

      setScore(calculatedScore)
      setIsSubmitted(true)
      setIsQuizActive(false)
    } catch (error: unknown) {
      console.error("Error submitting quiz:", error)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const currentQuestion = questions[currentQuestionIndex]
  const answeredCount = Object.keys(answers).length
  const progressPercentage = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading quiz...</p>
        </div>
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p className="text-lg font-medium">Quiz not found</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      {moduleId && (
        <div className="flex-shrink-0 h-full">
          <ModuleCurriculumSidebar
            moduleId={moduleId}
            currentQuizId={quizId}
            courseId={courseId || undefined}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 space-y-6 min-w-0 overflow-y-auto p-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <BookOpen className="h-3 w-3" />
                  Quiz
                </Badge>
                {isSubmitted && (
                  <Badge variant={score! >= quiz.passing_score ? "default" : "destructive"} className="gap-1">
                    {score! >= quiz.passing_score ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" />
                        Passed
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3" />
                        Failed
                      </>
                    )}
                  </Badge>
                )}
              </div>
              <h1 className="text-4xl font-bold tracking-tight">{quiz.title}</h1>
              {quiz.description && (
                <p className="text-lg text-muted-foreground">{quiz.description}</p>
              )}
            </div>
            <Button variant="outline" onClick={() => router.back()} className="shrink-0">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>

          {/* Progress and Timer */}
          {isQuizActive && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </span>
                  {timeRemaining !== null && (
                    <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">{formatTime(timeRemaining)}</span>
                    </div>
                  )}
                </div>
                <span className="font-medium">{Math.round(progressPercentage)}% Complete</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          )}
        </div>

        {/* Quiz Content */}
        <Card className="overflow-hidden border-2">
          {!isQuizActive && !isSubmitted ? (
            <>
              <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <CardTitle className="text-xl">Quiz Overview</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <div className="text-3xl font-bold text-primary">{questions.length}</div>
                    <div className="text-sm text-muted-foreground mt-1">Questions</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <div className="text-3xl font-bold text-primary">{quiz.passing_score}%</div>
                    <div className="text-sm text-muted-foreground mt-1">Passing Score</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <div className="text-3xl font-bold text-primary">
                      {timeRemaining ? formatTime(timeRemaining) : "∞"}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Time Limit</div>
                  </div>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-blue-900 dark:text-blue-100">Ready to start?</p>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Make sure you're in a quiet environment and have reviewed the lesson material.
                      </p>
                    </div>
                  </div>
                </div>
                <Button onClick={startQuiz} className="w-full" size="lg">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Start Quiz
                </Button>
              </CardContent>
            </>
          ) : isSubmitted ? (
            <>
              <CardHeader className={cn(
                "bg-gradient-to-r",
                score! >= quiz.passing_score 
                  ? "from-green-500/20 to-green-600/10" 
                  : "from-red-500/20 to-red-600/10"
              )}>
                <div className="flex items-center gap-2">
                  {score! >= quiz.passing_score ? (
                    <Trophy className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <CardTitle className="text-xl">Quiz Results</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="text-center space-y-6">
                  <div className="flex justify-center">
                    {score! >= quiz.passing_score ? (
                      <div className="h-24 w-24 rounded-full bg-green-500 flex items-center justify-center">
                        <CheckCircle2 className="h-12 w-12 text-white" />
                      </div>
                    ) : (
                      <div className="h-24 w-24 rounded-full bg-red-500 flex items-center justify-center">
                        <XCircle className="h-12 w-12 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="text-5xl font-bold">{score}%</div>
                    <div className={cn(
                      "text-2xl font-semibold",
                      score! >= quiz.passing_score ? "text-green-600" : "text-red-600"
                    )}>
                      {score! >= quiz.passing_score ? "🎉 Congratulations! You Passed!" : "Keep Learning!"}
                    </div>
                    <p className="text-muted-foreground">
                      Passing score: {quiz.passing_score}%
                    </p>
                  </div>
                  <div className="pt-4 border-t">
                    <Button onClick={() => router.back()} size="lg" className="w-full sm:w-auto">
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Continue Learning
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <CardTitle>Question {currentQuestionIndex + 1} of {questions.length}</CardTitle>
                  </div>
                  {timeRemaining !== null && (
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(timeRemaining)}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">{currentQuestion?.question_text}</h3>
                  
                  <RadioGroup
                    value={answers[currentQuestion?.id] || ""}
                    onValueChange={(value) => {
                      setAnswers({ ...answers, [currentQuestion.id]: value })
                    }}
                    className="space-y-3"
                  >
                    {currentQuestion?.options.map((option: any, idx: number) => (
                      <div
                        key={option.id}
                        className={cn(
                          "flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer",
                          answers[currentQuestion.id] === option.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        )}
                        onClick={() => setAnswers({ ...answers, [currentQuestion.id]: option.id })}
                      >
                        <RadioGroupItem value={option.id} id={option.id} />
                        <Label 
                          htmlFor={option.id} 
                          className="flex-1 cursor-pointer font-normal text-base"
                        >
                          {option.option_text}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                    disabled={currentQuestionIndex === 0}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  
                  <div className="text-sm text-muted-foreground">
                    {answeredCount} of {questions.length} answered
                  </div>
                  
                  {currentQuestionIndex < questions.length - 1 ? (
                    <Button
                      onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                    >
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button onClick={handleSubmitQuiz} size="lg">
                      <Award className="h-4 w-4 mr-2" />
                      Submit Quiz
                    </Button>
                  )}
                </div>
              </CardContent>
            </>
            )}
          </Card>
      </div>
    </div>
  )
}
