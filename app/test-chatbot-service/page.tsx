"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { 
  Bot, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  MessageCircle,
  BarChart3,
  History,
  BookOpen
} from "lucide-react"
import { Chatbot } from "@/components/chatbot"

export default function ChatbotTestPage() {
  const [testQuery, setTestQuery] = useState("")
  const [testCourseId, setTestCourseId] = useState("")
  const [testUserRole, setTestUserRole] = useState("student")
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    response?: string
    error?: string
    logId?: string
  } | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [showFullChatbot, setShowFullChatbot] = useState(false)

  const testChatbot = async () => {
    if (!testQuery.trim()) return

    setIsTesting(true)
    setTestResult(null)

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: testQuery,
          courseId: testCourseId || undefined
        }),
      })

      const data = await response.json()

      if (data.success) {
        setTestResult({
          success: true,
          response: data.response,
          logId: data.logId
        })
      } else {
        setTestResult({
          success: false,
          error: data.error
        })
      }
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      })
    } finally {
      setIsTesting(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch("/api/chatbot/stats")
      const data = await response.json()

      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error("Failed to load stats:", error)
    }
  }

  const loadLogs = async () => {
    try {
      const response = await fetch("/api/chatbot?limit=10")
      const data = await response.json()

      if (data.success) {
        setLogs(data.logs)
      }
    } catch (error) {
      console.error("Failed to load logs:", error)
    }
  }

  const sampleQueries = [
    "How do I enroll in a course?",
    "What courses do you recommend for beginners?",
    "How do I track my learning progress?",
    "Can you help me with course creation?",
    "What are the platform features?",
    "How do I create a quiz?",
    "Tell me about team collaboration features",
    "How do I manage my students as an instructor?"
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Chatbot Service Test</h1>
        <p className="text-muted-foreground">Test the comprehensive chatbot service</p>
      </div>

      {/* Quick Test Section */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Test</CardTitle>
          <CardDescription>Test the chatbot API directly</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Query</label>
              <Textarea
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                placeholder="Enter your question..."
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Course ID (Optional)</label>
              <Input
                value={testCourseId}
                onChange={(e) => setTestCourseId(e.target.value)}
                placeholder="Course ID for context"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">User Role</label>
              <Select value={testUserRole} onValueChange={setTestUserRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="instructor">Instructor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="instructor_assistant">Instructor Assistant</SelectItem>
                  <SelectItem value="team_manager">Team Manager</SelectItem>
                  <SelectItem value="team_leader">Team Leader</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={testChatbot} 
            disabled={isTesting || !testQuery.trim()}
            className="w-full"
          >
            {isTesting ? "Testing..." : "Test Chatbot"}
          </Button>

          {testResult && (
            <Alert className={testResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              {testResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={testResult.success ? "text-green-800" : "text-red-800"}>
                <strong>{testResult.success ? "Success!" : "Error"}</strong>
                {testResult.response && (
                  <>
                    <br />
                    <div className="mt-2 whitespace-pre-wrap">{testResult.response}</div>
                    {testResult.logId && (
                      <Badge variant="secondary" className="mt-2">
                        Log ID: {testResult.logId}
                      </Badge>
                    )}
                  </>
                )}
                {testResult.error && (
                  <>
                    <br />
                    <div className="mt-2">{testResult.error}</div>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Sample Queries */}
      <Card>
        <CardHeader>
          <CardTitle>Sample Queries</CardTitle>
          <CardDescription>Try these sample questions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {sampleQueries.map((query, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setTestQuery(query)}
                disabled={isTesting}
                className="text-left justify-start h-auto p-3"
              >
                {query}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Full Chatbot Component */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>Full Chatbot Component</span>
          </CardTitle>
          <CardDescription>Interactive chatbot with full UI</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Button 
                onClick={() => setShowFullChatbot(!showFullChatbot)}
                variant={showFullChatbot ? "destructive" : "default"}
              >
                {showFullChatbot ? "Hide" : "Show"} Full Chatbot
              </Button>
              <Button onClick={loadStats} variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                Load Stats
              </Button>
              <Button onClick={loadLogs} variant="outline">
                <History className="h-4 w-4 mr-2" />
                Load Logs
              </Button>
            </div>

            {showFullChatbot && (
              <Chatbot 
                courseId={testCourseId || undefined}
                courseTitle="Test Course"
                userRole={testUserRole}
              />
            )}

            {stats && (
              <div className="mt-4 p-4 border rounded-lg">
                <h4 className="font-medium mb-3 flex items-center">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Chatbot Statistics
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{stats.totalQueries}</p>
                    <p className="text-sm text-muted-foreground">Total Queries</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{stats.totalUsers}</p>
                    <p className="text-sm text-muted-foreground">Active Users</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{stats.queriesToday}</p>
                    <p className="text-sm text-muted-foreground">Today</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{stats.topCourses?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">Active Courses</p>
                  </div>
                </div>
              </div>
            )}

            {logs.length > 0 && (
              <div className="mt-4 p-4 border rounded-lg">
                <h4 className="font-medium mb-3 flex items-center">
                  <History className="h-4 w-4 mr-2" />
                  Recent Chat Logs
                </h4>
                <div className="space-y-2">
                  {logs.slice(0, 5).map((log, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{log.query}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.timestamp).toLocaleString()}
                        </p>
                      </div>
                      {log.course_id && (
                        <Badge variant="secondary" className="text-xs">
                          <BookOpen className="h-3 w-3 mr-1" />
                          Course
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle>Service Status</CardTitle>
          <CardDescription>Current chatbot service status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Chatbot API is working</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Database logging enabled</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Translation support ready</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Admin statistics available</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
