"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { useEffect, useState } from "react"

interface Note {
  id: string
  content: string
  is_question: boolean
  created_at: string
  student_id: string
  note_replies?: any[]
}

export default function LessonNotesSection({ lessonId }: { lessonId: string }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [newNoteContent, setNewNoteContent] = useState("")
  const [isQuestion, setIsQuestion] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchNotes = async () => {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: notesData } = await supabase
          .from("lesson_notes")
          .select("*, note_replies(*)")
          .eq("lesson_id", lessonId)
          .eq("student_id", user.id)
          .order("created_at", { ascending: false })

        if (notesData) {
          setNotes(notesData)
        }
      }

      setIsLoading(false)
    }

    fetchNotes()
  }, [lessonId])

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsCreating(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error("Not authenticated")

      const { data, error: insertError } = await supabase
        .from("lesson_notes")
        .insert({
          student_id: user.id,
          lesson_id: lessonId,
          content: newNoteContent,
          is_question: isQuestion,
        })
        .select()
        .single()

      if (insertError) throw insertError

      setNotes([{ ...data, note_replies: [] }, ...notes])
      setNewNoteContent("")
      setIsQuestion(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsCreating(false)
    }
  }

  if (isLoading) {
    return <div>Loading notes...</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Note or Question</CardTitle>
          <CardDescription>Take notes or ask questions about this lesson</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateNote} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="noteContent">Note</Label>
              <Textarea
                id="noteContent"
                placeholder="Write your note or question here..."
                rows={4}
                required
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isQuestion"
                checked={isQuestion}
                onCheckedChange={(checked) => setIsQuestion(checked as boolean)}
              />
              <Label htmlFor="isQuestion" className="font-normal cursor-pointer">
                This is a question for the instructor
              </Label>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={isCreating}>
              {isCreating ? "Posting..." : "Post Note"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {notes.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Your Notes</h3>
          {notes.map((note) => (
            <Card key={note.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{note.is_question ? "Question" : "Note"}</CardTitle>
                    <CardDescription>{new Date(note.created_at).toLocaleDateString()}</CardDescription>
                  </div>
                  {note.is_question && (
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Question</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{note.content}</p>

                {note.note_replies && note.note_replies.length > 0 && (
                  <div className="space-y-3 border-t pt-4">
                    <h4 className="font-semibold text-sm">Instructor Responses</h4>
                    {note.note_replies.map((reply: any) => (
                      <div key={reply.id} className="bg-muted p-3 rounded">
                        <p className="text-sm font-medium text-primary mb-1">Instructor</p>
                        <p className="text-sm">{reply.content}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(reply.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
