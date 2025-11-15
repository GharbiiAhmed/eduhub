import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function FixCourseAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fix Course Analytics RLS Issue</h1>
        <p className="text-muted-foreground">The enrollment issue is caused by RLS policies on the course_analytics table</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Problem Identified</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm">
              <strong>Error:</strong> <code>new row violates row-level security policy for table "course_analytics"</code>
            </p>
            <p className="text-sm text-muted-foreground">
              When students enroll in courses, a database trigger tries to update the course_analytics table, 
              but students don't have INSERT/UPDATE permissions on this table due to RLS policies.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Solution</CardTitle>
          <CardDescription>Run this SQL in your Supabase SQL Editor</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-gray-100 p-4 rounded-lg">
              <pre className="text-sm overflow-x-auto">
{`-- Quick fix: Disable RLS on course_analytics table
-- This is safe since course_analytics doesn't contain sensitive user data
ALTER TABLE public.course_analytics DISABLE ROW LEVEL SECURITY;`}
              </pre>
            </div>
            
            <p className="text-sm text-muted-foreground">
              <strong>Steps:</strong>
            </p>
            <ol className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>1. Go to your Supabase Dashboard</li>
              <li>2. Navigate to SQL Editor</li>
              <li>3. Copy and paste the SQL above</li>
              <li>4. Click "Run"</li>
              <li>5. Try enrolling in a course again</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alternative Solution</CardTitle>
          <CardDescription>If you prefer to keep RLS enabled</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-gray-100 p-4 rounded-lg">
              <pre className="text-sm overflow-x-auto">
{`-- Alternative: Add proper RLS policies for course_analytics
DROP POLICY IF EXISTS "Instructors can view their course analytics" ON public.course_analytics;
DROP POLICY IF EXISTS "Admins can view all analytics" ON public.course_analytics;

CREATE POLICY "course_analytics_select" ON public.course_analytics FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.courses 
    WHERE public.courses.id = public.course_analytics.course_id 
      AND public.courses.instructor_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE public.profiles.id = auth.uid() 
      AND public.profiles.role = 'admin'
  )
);

CREATE POLICY "course_analytics_insert" ON public.course_analytics FOR INSERT WITH CHECK (true);
CREATE POLICY "course_analytics_update" ON public.course_analytics FOR UPDATE USING (true);`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test After Fix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              After applying the fix, test the enrollment process:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• Go to a course detail page</li>
              <li>• Click "Enroll Now"</li>
              <li>• Check if you're redirected to student courses</li>
              <li>• Verify the course appears in your enrolled courses</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


