-- RLS Policies for meetings table

-- Instructors can view their own meetings
CREATE POLICY "meetings_select_instructor" ON public.meetings FOR SELECT USING (
  instructor_id = auth.uid()
);

-- Enrolled students can view meetings for their courses
CREATE POLICY "meetings_select_enrolled" ON public.meetings FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.enrollments 
    WHERE enrollments.student_id = auth.uid() 
      AND enrollments.course_id = meetings.course_id
  )
);

-- Students can view meetings by room_name (for joining)
CREATE POLICY "meetings_select_by_room" ON public.meetings FOR SELECT USING (
  -- Allow if user is enrolled in the course
  (course_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.enrollments 
    WHERE enrollments.student_id = auth.uid() 
      AND enrollments.course_id = meetings.course_id
  ))
  OR
  -- Allow if meeting has no course restriction and participant type is 'all'
  (course_id IS NULL AND participant_type = 'all')
  OR
  -- Allow if user is invited (selected participant)
  EXISTS (
    SELECT 1 FROM public.meeting_participants 
    WHERE meeting_participants.meeting_id = meetings.id 
      AND meeting_participants.student_id = auth.uid()
  )
  OR
  -- Allow if user is the instructor
  instructor_id = auth.uid()
);

-- Instructors can create meetings
CREATE POLICY "meetings_insert_instructor" ON public.meetings FOR INSERT WITH CHECK (
  instructor_id = auth.uid()
);

-- Instructors can update their own meetings
CREATE POLICY "meetings_update_instructor" ON public.meetings FOR UPDATE USING (
  instructor_id = auth.uid()
);

-- Instructors can delete their own meetings
CREATE POLICY "meetings_delete_instructor" ON public.meetings FOR DELETE USING (
  instructor_id = auth.uid()
);

-- RLS Policies for meeting_participants table

-- Students can view their own participant records
CREATE POLICY "meeting_participants_select_own" ON public.meeting_participants FOR SELECT USING (
  student_id = auth.uid()
);

-- Instructors can view participants for their meetings
CREATE POLICY "meeting_participants_select_instructor" ON public.meeting_participants FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.meetings 
    WHERE meetings.id = meeting_participants.meeting_id 
      AND meetings.instructor_id = auth.uid()
  )
);

-- Instructors can insert participants
CREATE POLICY "meeting_participants_insert_instructor" ON public.meeting_participants FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.meetings 
    WHERE meetings.id = meeting_participants.meeting_id 
      AND meetings.instructor_id = auth.uid()
  )
);

-- Students can update their own participant status (join/leave)
CREATE POLICY "meeting_participants_update_own" ON public.meeting_participants FOR UPDATE USING (
  student_id = auth.uid()
);

-- Instructors can update participants for their meetings
CREATE POLICY "meeting_participants_update_instructor" ON public.meeting_participants FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.meetings 
    WHERE meetings.id = meeting_participants.meeting_id 
      AND meetings.instructor_id = auth.uid()
  )
);

