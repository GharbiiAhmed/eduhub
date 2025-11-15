"use client"

import { use, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Quiz {
  id: string
  title: string
  description: string | null
  passing_score: number
  time_limit: number | null
  max_attempts: number
  is_published: boolean
}

export default function EditQuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params)
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [quiz, setQuiz] = useState<Quiz | null>(null)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [passingScore, setPassingScore] = useState(70)
  const [timeLimit, setTimeLimit] = useState<string>("")
  const [maxAttempts, setMaxAttempts] = useState(3)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("quizzes").select("*").eq("id", quizId).single()
      if (data) {
        setQuiz(data)
        setTitle(data.title)
        setDescription(data.description || "")
        setPassingScore(data.passing_score ?? 70)
        setTimeLimit(data.time_limit != null ? String(data.time_limit) : "")
        setMaxAttempts(data.max_attempts ?? 3)
      }
      setLoading(false)
    }
    load()
  }, [quizId, supabase])

  const save = async () => {
    setSaving(true)
    try {
      await supabase
        .from("quizzes")
        .update({
          title,
          description,
          passing_score: passingScore,
          time_limit: timeLimit ? parseInt(timeLimit) : null,
          max_attempts: maxAttempts,
        })
        .eq("id", quizId)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  if (!quiz) {
    return (
      <div className="p-6 space-y-4">
        <div>Quiz not found</div>
        <Button variant="outline" onClick={() => router.push("/instructor/quizzes")}>Back to Quizzes</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Edit Quiz</h1>
        <Button variant="outline" onClick={() => router.push("/instructor/quizzes")}>Back</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quiz Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="pass">Passing Score (%)</Label>
              <Input id="pass" type="number" value={passingScore} onChange={(e) => setPassingScore(parseInt(e.target.value || "0"))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="limit">Time Limit (minutes)</Label>
              <Input id="limit" type="number" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} placeholder="No limit" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="attempts">Max Attempts</Label>
              <Input id="attempts" type="number" value={maxAttempts} onChange={(e) => setMaxAttempts(parseInt(e.target.value || "0"))} />
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </CardContent>
      </Card>

      {/* Placeholder for question management (can be expanded later) */}
      <QuestionEditor quizId={quizId} />
    </div>
  )
}

function QuestionEditor({ quizId }: { quizId: string }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [questions, setQuestions] = useState<any[]>([])

  const [newQuestionText, setNewQuestionText] = useState("")
  const [newQuestionType, setNewQuestionType] = useState("multiple_choice")
  // Points not used in your DB; omitted

  useEffect(() => {
    const load = async () => {
      const { data: qs } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("order_index", { ascending: true })

      const withOptions = await Promise.all(
        (qs || []).map(async (q) => {
          let { data: opts } = await supabase
            .from("quiz_question_options")
            .select("*")
            .eq("question_id", q.id)
            .order("order_index", { ascending: true })
          if (!opts || opts.length === 0) {
            const { data: legacy } = await supabase
              .from("quiz_options")
              .select("*")
              .eq("question_id", q.id)
              .order("order_index", { ascending: true })
            opts = legacy || []
          }
          return { ...q, options: opts || [] }
        })
      )

      setQuestions(withOptions)
      setLoading(false)
    }
    load()
  }, [quizId, supabase])

  const refresh = async () => {
    setLoading(true)
    const { data: qs } = await supabase
      .from("quiz_questions")
      .select("*")
      .eq("quiz_id", quizId)
      .order("order_index", { ascending: true })

    const withOptions = await Promise.all(
      (qs || []).map(async (q) => {
        let { data: opts } = await supabase
          .from("quiz_question_options")
          .select("*")
          .eq("question_id", q.id)
          .order("order_index", { ascending: true })
        if (!opts || opts.length === 0) {
          const { data: legacy } = await supabase
            .from("quiz_options")
            .select("*")
            .eq("question_id", q.id)
            .order("order_index", { ascending: true })
          opts = legacy || []
        }
        return { ...q, options: opts || [] }
      })
    )

    setQuestions(withOptions)
    setLoading(false)
  }

  const addQuestion = async () => {
    if (!newQuestionText.trim()) return
    setAdding(true)
    try {
      const nextOrder = (questions[questions.length - 1]?.order_index ?? -1) + 1
      const { data, error } = await supabase
        .from("quiz_questions")
        .insert({
          quiz_id: quizId,
          question_text: newQuestionText.trim(),
          question_type: newQuestionType,
          order_index: nextOrder,
        })
        .select("*")
        .single()
      if (error) throw error

      // For true/false, auto-create options
      if (newQuestionType === "true_false") {
        await supabase.from("quiz_question_options").insert([
          { question_id: data.id, option_text: "True", is_correct: true, order_index: 0 },
          { question_id: data.id, option_text: "False", is_correct: false, order_index: 1 },
        ])
      }

      setNewQuestionText("")
      setNewQuestionType("multiple_choice")
      // no points to reset
      await refresh()
    } finally {
      setAdding(false)
    }
  }

  const updateQuestion = async (qId: string, fields: any) => {
    await supabase.from("quiz_questions").update(fields).eq("id", qId)
    await refresh()
  }

  const deleteQuestion = async (qId: string) => {
    await supabase.from("quiz_questions").delete().eq("id", qId)
    await refresh()
  }

  const addOption = async (q: any) => {
    const nextOrder = (q.options[q.options.length - 1]?.order_index ?? -1) + 1
    await supabase
      .from("quiz_question_options")
      .insert({ question_id: q.id, option_text: "Option", is_correct: false, order_index: nextOrder })
    await refresh()
  }

  const updateOption = async (optId: string, fields: any) => {
    await supabase.from("quiz_question_options").update(fields).eq("id", optId)
  }

  const deleteOption = async (optId: string) => {
    await supabase.from("quiz_question_options").delete().eq("id", optId)
    await refresh()
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Questions</CardTitle>
        </CardHeader>
        <CardContent>Loading questions...</CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Questions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 grid gap-2">
            <Label htmlFor="newQuestion">New Question</Label>
            <Input id="newQuestion" placeholder="Enter question text" value={newQuestionText} onChange={(e) => setNewQuestionText(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Type</Label>
            <Select value={newQuestionType} onValueChange={(v) => setNewQuestionType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                <SelectItem value="true_false">True / False</SelectItem>
                <SelectItem value="short_answer">Short Answer</SelectItem>
                <SelectItem value="essay">Essay</SelectItem>
                <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-3">
            <Button onClick={addQuestion} disabled={adding || !newQuestionText.trim()}>
              {adding ? "Adding..." : "Add Question"}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {questions.map((q, idx) => (
            <div key={q.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Q{idx + 1}</div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => deleteQuestion(q.id)}>Delete</Button>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2 grid gap-2">
                  <Label>Question Text</Label>
                  <Input value={q.question_text} onChange={(e) => updateQuestion(q.id, { question_text: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Type</Label>
                  <Select value={q.question_type} onValueChange={(v) => updateQuestion(q.id, { question_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                      <SelectItem value="true_false">True / False</SelectItem>
                      <SelectItem value="short_answer">Short Answer</SelectItem>
                      <SelectItem value="essay">Essay</SelectItem>
                      <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* No points field in your DB */}
              </div>

              {(q.question_type === "multiple_choice" || q.question_type === "true_false") && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">Options</div>
                    {q.question_type === "multiple_choice" && (
                      <Button size="sm" variant="outline" onClick={() => addOption(q)}>Add Option</Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {q.options.map((opt: any) => (
                      <div key={opt.id} className="grid md:grid-cols-6 gap-2 items-center">
                        <div className="md:col-span-4">
                          <Input
                            value={opt.option_text}
                            onChange={(e) => updateOption(opt.id, { option_text: e.target.value })}
                            onBlur={async () => await refresh()}
                          />
                        </div>
                        <div className="md:col-span-1 flex items-center gap-2">
                          <Label className="text-sm">Correct</Label>
                          <input
                            type="checkbox"
                            checked={!!opt.is_correct}
                            onChange={async (e) => {
                              await updateOption(opt.id, { is_correct: e.target.checked })
                              await refresh()
                            }}
                          />
                        </div>
                        <div className="md:col-span-1 flex justify-end">
                          <Button size="sm" variant="outline" onClick={() => deleteOption(opt.id)}>Delete</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}


