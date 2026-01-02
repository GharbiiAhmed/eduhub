"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import ModuleCurriculumSidebar from "@/components/student/module-curriculum-sidebar"
import { CheckCircle2, XCircle, Clock } from "lucide-react"

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
  const router = useRouter()

  useEffect(() => {
    const fetchQuiz = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }

      // Fetch quiz with related data
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
        
        // Determine module_id and course_id
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

        // Fetch questions
        const { data: questionsData } = await supabase
          .from("quiz_questions")
          .select("*")
          .eq("quiz_id", quizId)
          .order("order_index", { ascending: true })

        if (questionsData) {
          // Fetch options for each question
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

      // Calculate score
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

      // Create quiz attempt
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

      // Record answers
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

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!quiz) {
    return <div>Quiz not found</div>
  }

  return (
    <div className="flex gap-6 max-w-7xl mx-auto">
      {/* Sidebar */}
      {moduleId && (
        <div className="flex-shrink-0">
          <ModuleCurriculumSidebar
            moduleId={moduleId}
            currentQuizId={quizId}
            courseId={courseId || undefined}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 space-y-6 min-w-0">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{quiz.title}</h1>
          <Button variant="outline" onClick={() => router.back()}>
            Back
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{quiz.title}</CardTitle>
            <CardDescription>{quiz.description}</CardDescription>
            {timeRemaining !== null && isQuizActive && (
              <div className="flex items-center gap-2 mt-2">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Time remaining: {formatTime(timeRemaining)}</span>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {!isQuizActive && !isSubmitted ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-4">
                    {quiz.description || "Complete this quiz to test your understanding."}
                  </p>
                  <div className="space-y-2 text-sm">
                    <p><strong>Questions:</strong> {questions.length}</p>
                    <p><strong>Passing Score:</strong> {quiz.passing_score}%</p>
                  </div>
                </div>
                <Button onClick={startQuiz} className="w-full" size="lg">
                  Start Quiz
                </Button>
              </div>
            ) : isSubmitted ? (
              <div className="space-y-4">
                <div className="text-center space-y-4 p-6 border rounded-lg">
                  <div className="flex justify-center">
                    {score! >= quiz.passing_score ? (
                      <CheckCircle2 className="h-16 w-16 text-green-600" />
                    ) : (
                      <XCircle className="h-16 w-16 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-2xl font-bold">Your Score: {score}%</p>
                    <p className={score! >= quiz.passing_score ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                      {score! >= quiz.passing_score ? "✓ Passed" : "✗ Failed"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">Passing score: {quiz.passing_score}%</p>
                  </div>
                </div>
                <Button onClick={() => router.back()} className="w-full">
                  Back to Course
                </Button>
              </div>
            ) : (
              <>
                {questions.map((question, index) => (
                  <div key={question.id} className="space-y-3 border-b pb-6 last:border-b-0">
                    <h4 className="font-medium">
                      {index + 1}. {question.question_text}
                    </h4>

                    <RadioGroup
                      value={answers[question.id] || ""}
                      onValueChange={(value) => setAnswers({ ...answers, [question.id]: value })}
                    >
                      {question.options.map((option: any) => (
                        <div key={option.id} className="flex items-center space-x-2">
                          <RadioGroupItem value={option.id} id={option.id} />
                          <Label htmlFor={option.id} className="font-normal cursor-pointer">
                            {option.option_text}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                ))}

                <Button onClick={handleSubmitQuiz} className="w-full" size="lg">
                  Submit Quiz
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

