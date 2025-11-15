-- Profiles RLS Policies
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_select_public" ON public.profiles FOR SELECT USING (true);

-- Courses RLS Policies
CREATE POLICY "courses_select_published" ON public.courses FOR SELECT USING (status = 'published' OR instructor_id = auth.uid());
CREATE POLICY "courses_insert_instructor" ON public.courses FOR INSERT WITH CHECK (instructor_id = auth.uid());
CREATE POLICY "courses_update_instructor" ON public.courses FOR UPDATE USING (instructor_id = auth.uid());
CREATE POLICY "courses_delete_instructor" ON public.courses FOR DELETE USING (instructor_id = auth.uid());

-- Modules RLS Policies
CREATE POLICY "modules_select" ON public.modules FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.courses WHERE courses.id = modules.course_id AND (courses.status = 'published' OR courses.instructor_id = auth.uid()))
);
CREATE POLICY "modules_insert_instructor" ON public.modules FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.courses WHERE courses.id = modules.course_id AND courses.instructor_id = auth.uid())
);
CREATE POLICY "modules_update_instructor" ON public.modules FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.courses WHERE courses.id = modules.course_id AND courses.instructor_id = auth.uid())
);
CREATE POLICY "modules_delete_instructor" ON public.modules FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.courses WHERE courses.id = modules.course_id AND courses.instructor_id = auth.uid())
);

-- Lessons RLS Policies
CREATE POLICY "lessons_select" ON public.lessons FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.modules
    JOIN public.courses ON courses.id = modules.course_id
    WHERE modules.id = lessons.module_id AND (courses.status = 'published' OR courses.instructor_id = auth.uid())
  )
);
CREATE POLICY "lessons_insert_instructor" ON public.lessons FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.modules
    JOIN public.courses ON courses.id = modules.course_id
    WHERE modules.id = lessons.module_id AND courses.instructor_id = auth.uid()
  )
);
CREATE POLICY "lessons_update_instructor" ON public.lessons FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.modules
    JOIN public.courses ON courses.id = modules.course_id
    WHERE modules.id = lessons.module_id AND courses.instructor_id = auth.uid()
  )
);
CREATE POLICY "lessons_delete_instructor" ON public.lessons FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.modules
    JOIN public.courses ON courses.id = modules.course_id
    WHERE modules.id = lessons.module_id AND courses.instructor_id = auth.uid()
  )
);

-- Enrollments RLS Policies
CREATE POLICY "enrollments_select_own" ON public.enrollments FOR SELECT USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.courses WHERE courses.id = enrollments.course_id AND courses.instructor_id = auth.uid()));
CREATE POLICY "enrollments_insert_student" ON public.enrollments FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "enrollments_update_own" ON public.enrollments FOR UPDATE USING (student_id = auth.uid());

-- Lesson Progress RLS Policies
CREATE POLICY "lesson_progress_select_own" ON public.lesson_progress FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "lesson_progress_insert_own" ON public.lesson_progress FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "lesson_progress_update_own" ON public.lesson_progress FOR UPDATE USING (student_id = auth.uid());

-- Quiz Attempts RLS Policies
CREATE POLICY "quiz_attempts_select_own" ON public.quiz_attempts FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "quiz_attempts_insert_own" ON public.quiz_attempts FOR INSERT WITH CHECK (student_id = auth.uid());

-- Certificates RLS Policies
CREATE POLICY "certificates_select_own" ON public.certificates FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "certificates_insert_own" ON public.certificates FOR INSERT WITH CHECK (student_id = auth.uid());

-- Lesson Notes RLS Policies
CREATE POLICY "lesson_notes_select_own_or_instructor" ON public.lesson_notes FOR SELECT USING (
  student_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.lessons
    JOIN public.modules ON modules.id = lessons.module_id
    JOIN public.courses ON courses.id = modules.course_id
    WHERE lessons.id = lesson_notes.lesson_id AND courses.instructor_id = auth.uid()
  )
);
CREATE POLICY "lesson_notes_insert_own" ON public.lesson_notes FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "lesson_notes_update_own" ON public.lesson_notes FOR UPDATE USING (student_id = auth.uid());

-- Forum Posts RLS Policies
CREATE POLICY "forum_posts_select" ON public.forum_posts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.forums JOIN public.courses ON courses.id = forums.course_id WHERE forums.id = forum_posts.forum_id AND (courses.status = 'published' OR courses.instructor_id = auth.uid()))
);
CREATE POLICY "forum_posts_insert" ON public.forum_posts FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.forums JOIN public.courses ON courses.id = forums.course_id WHERE forums.id = forum_posts.forum_id AND courses.status = 'published')
);
CREATE POLICY "forum_posts_update_own" ON public.forum_posts FOR UPDATE USING (author_id = auth.uid());
CREATE POLICY "forum_posts_delete_own" ON public.forum_posts FOR DELETE USING (author_id = auth.uid());

-- Messages RLS Policies
CREATE POLICY "messages_select_participant" ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = messages.conversation_id AND (conversations.participant_1_id = auth.uid() OR conversations.participant_2_id = auth.uid()))
);
CREATE POLICY "messages_insert_participant" ON public.messages FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = messages.conversation_id AND (conversations.participant_1_id = auth.uid() OR conversations.participant_2_id = auth.uid()))
);

-- Books RLS Policies
CREATE POLICY "books_select_published" ON public.books FOR SELECT USING (true);
CREATE POLICY "books_insert_instructor" ON public.books FOR INSERT WITH CHECK (instructor_id = auth.uid());
CREATE POLICY "books_update_instructor" ON public.books FOR UPDATE USING (instructor_id = auth.uid());
CREATE POLICY "books_delete_instructor" ON public.books FOR DELETE USING (instructor_id = auth.uid());

-- Book Purchases RLS Policies
CREATE POLICY "book_purchases_select_own" ON public.book_purchases FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "book_purchases_insert_own" ON public.book_purchases FOR INSERT WITH CHECK (student_id = auth.uid());

-- Payments RLS Policies
CREATE POLICY "payments_select_own" ON public.payments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "payments_insert_own" ON public.payments FOR INSERT WITH CHECK (user_id = auth.uid());
