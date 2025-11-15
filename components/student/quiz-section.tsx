"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useEffect, useState } from "react"

interface Quiz {
  id: string
  title: string
  description: string
  passing_score: number
}

export default function QuizSection({ quiz }: { quiz: Quiz }) {
  const [questions, setQuestions] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchQuestions = async () => {
      const supabase = createClient()

      const { data: questionsData } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quiz.id)
        .order("order_index", { ascending: true })

      if (questionsData) {
        // Fetch options for each question
        const questionsWithOptions = await Promise.all(
          questionsData.map(async (question) => {
            // Prefer quiz_question_options; fallback to legacy quiz_options if needed
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
              optionsData = (legacyOptions || []).map((opt: any) => ({ ...opt, __source: "quiz_options" }))
            } else {
              optionsData = optionsData.map((opt: any) => ({ ...opt, __source: "quiz_question_options" }))
            }

            return {
              ...question,
              options: optionsData || [],
            }
          }),
        )

        setQuestions(questionsWithOptions)
      }

      setIsLoading(false)

      // After loading questions, try to hydrate from latest attempt
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        // Get latest attempt (order by id desc to avoid missing timestamp columns)
        const { data: attempts } = await supabase
          .from("quiz_attempts")
          .select("id")
          .eq("quiz_id", quiz.id)
          .eq("student_id", user.id)
          .order("id", { ascending: false })
          .limit(1)

        const latestAttempt = attempts && attempts[0]
        if (!latestAttempt) return

        const { data: prevAnswers } = await supabase
          .from("quiz_answers")
          .select("*")
          .eq("attempt_id", latestAttempt.id)

        if (!prevAnswers || prevAnswers.length === 0) return

        // Map previous answers back to option ids if possible
        const hydrated: Record<string, string> = {}
        let correctCount = 0
        for (const ans of prevAnswers) {
          const q = (questionsData || []).find((qq: any) => qq.id === ans.question_id)
          const qWithOpts = q
            ? (await supabase
                .from("quiz_question_options")
                .select("*")
                .eq("question_id", q.id)
                .order("order_index", { ascending: true })).data || []
            : []

          let selectedId: string | undefined
          if ((ans as any).selected_option_id) {
            // Could be legacy quiz_options id; try to match either table id
            // First try quiz_question_options
            const byId = qWithOpts.find((o: any) => o.id === (ans as any).selected_option_id)
            if (byId) selectedId = byId.id
            if (!selectedId) {
              // Fallback to legacy table lookup by text
              const { data: legacy } = await supabase
                .from("quiz_options")
                .select("id, option_text")
                .eq("question_id", ans.question_id)
              const legacyOpt = (legacy || []).find((o: any) => o.id === (ans as any).selected_option_id)
              if (legacyOpt) {
                const matchByText = qWithOpts.find((o: any) => o.option_text === legacyOpt.option_text)
                if (matchByText) selectedId = matchByText.id
              }
            }
          } else if ((ans as any).answer_text) {
            const byText = qWithOpts.find((o: any) => o.option_text === (ans as any).answer_text)
            if (byText) selectedId = byText.id
          }

          if (selectedId) {
            hydrated[ans.question_id] = selectedId
            const opt = qWithOpts.find((o: any) => o.id === selectedId)
            if (opt?.is_correct) correctCount++
          }
        }

        if (Object.keys(hydrated).length > 0) {
          setAnswers(hydrated)
          const calculatedScore = Math.round((correctCount / Math.max(questionsData.length, 1)) * 100)
          setScore(calculatedScore)
          setIsSubmitted(true)
        }
      } catch (e) {
        // ignore hydration errors
      }
    }

    fetchQuestions()
  }, [quiz.id])

  const handleSubmitQuiz = async () => {
    const supabase = createClient()

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error("Not authenticated")

      // Calculate score and build answers
      let correctCount = 0
      const answerRecords: Array<{ question_id: string; selected_option_id?: string | null; answer_text?: string | null }> = []

      for (const question of questions) {
        const selectedOptionId = answers[question.id]
        const selectedOption = question.options.find((opt: any) => opt.id === selectedOptionId)
        const isCorrect = !!selectedOption?.is_correct
        if (isCorrect) correctCount++

        // Insert uses selected_options UUID[] per schema
        if (selectedOption) {
          if (selectedOption.__source === "quiz_options") {
            answerRecords.push({ question_id: question.id, selected_option_id: selectedOptionId, answer_text: selectedOption.option_text })
          } else {
            // Source is quiz_question_options; avoid FK to quiz_options by omitting selected_option_id but persist text
            answerRecords.push({ question_id: question.id, answer_text: selectedOption.option_text })
          }
        } else {
          answerRecords.push({ question_id: question.id })
        }
      }

      const calculatedScore = Math.round((correctCount / Math.max(questions.length, 1)) * 100)
      const isPassed = calculatedScore >= quiz.passing_score

      // Create quiz attempt first (minimal fields to match DB)
      const { data: attemptData, error: attemptError } = await supabase
        .from("quiz_attempts")
        .insert({ student_id: user.id, quiz_id: quiz.id })
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

        // Update attempt score and passed
        const { error: updateError } = await supabase
          .from("quiz_attempts")
          .update({ score: calculatedScore, passed: isPassed })
          .eq("id", attemptData.id)
        if (updateError) throw updateError

        // Notify student about quiz grade
        try {
          await fetch('/api/notifications/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              type: 'quiz_graded',
              title: 'Quiz Graded! 📝',
              message: `Your quiz "${quiz.title}" has been graded. You scored ${calculatedScore}%${isPassed ? ' - Passed! ✅' : ' - Not passed'}.`,
              link: `/student/courses/${quiz.course_id}`,
              relatedId: quiz.id,
              relatedType: 'quiz'
            })
          }).catch(err => console.error('Failed to create quiz graded notification:', err))
        } catch (notifError) {
          console.error('Error creating quiz graded notification:', notifError)
        }
      }

      setScore(calculatedScore)
      setIsSubmitted(true)
    } catch (error: unknown) {
      console.error("Error submitting quiz:", error)
    }
  }

  if (isLoading) {
    return <div>Loading quiz...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{quiz.title}</CardTitle>
        <CardDescription>{quiz.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isSubmitted ? (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold">Your Score: {score}%</p>
              <p className={score! >= quiz.passing_score ? "text-green-600" : "text-red-600"}>
                {score! >= quiz.passing_score ? "✓ Passed" : "✗ Failed"}
              </p>
              <p className="text-sm text-muted-foreground">Passing score: {quiz.passing_score}%</p>
            </div>
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

            <Button onClick={handleSubmitQuiz} className="w-full">
              Submit Quiz
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
