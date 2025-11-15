-- Quiz System Database Schema
-- This script creates all necessary tables for a comprehensive quiz system

-- Quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    time_limit INTEGER DEFAULT NULL, -- in minutes, NULL means no time limit
    max_attempts INTEGER DEFAULT 3,
    passing_score INTEGER DEFAULT 70, -- percentage
    is_published BOOLEAN DEFAULT FALSE,
    is_randomized BOOLEAN DEFAULT FALSE,
    show_correct_answers BOOLEAN DEFAULT TRUE,
    show_results_immediately BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Quiz questions table
CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank')),
    points INTEGER DEFAULT 1,
    order_index INTEGER NOT NULL,
    explanation TEXT, -- explanation shown after answering
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz question options (for multiple choice, true/false)
CREATE TABLE IF NOT EXISTS quiz_question_options (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question_id UUID REFERENCES quiz_questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student quiz attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    time_spent INTEGER DEFAULT 0, -- in seconds
    score INTEGER DEFAULT 0, -- percentage
    is_passed BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'graded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student quiz answers
CREATE TABLE IF NOT EXISTS quiz_answers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    attempt_id UUID REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    question_id UUID REFERENCES quiz_questions(id) ON DELETE CASCADE,
    answer_text TEXT,
    selected_options UUID[] DEFAULT '{}', -- array of option IDs for multiple choice
    is_correct BOOLEAN DEFAULT FALSE,
    points_earned INTEGER DEFAULT 0,
    feedback TEXT, -- instructor feedback for essay questions
    graded_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    graded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz analytics
CREATE TABLE IF NOT EXISTS quiz_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    total_attempts INTEGER DEFAULT 0,
    total_students INTEGER DEFAULT 0,
    average_score DECIMAL(5,2) DEFAULT 0,
    pass_rate DECIMAL(5,2) DEFAULT 0,
    average_time_spent INTEGER DEFAULT 0, -- in seconds
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_module_id ON quizzes(module_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_question_options_question_id ON quiz_question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_id ON quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_attempt_id ON quiz_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_question_id ON quiz_answers(question_id);

-- Enable Row Level Security
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quizzes
CREATE POLICY "Instructors can manage their quizzes" ON quizzes
    FOR ALL USING (
        created_by = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM courses 
            WHERE courses.id = quizzes.course_id 
            AND courses.instructor_id = auth.uid()
        )
    );

CREATE POLICY "Students can view published quizzes" ON quizzes
    FOR SELECT USING (
        is_published = true AND
        EXISTS (
            SELECT 1 FROM enrollments 
            WHERE enrollments.course_id = quizzes.course_id 
            AND enrollments.student_id = auth.uid()
        )
    );

-- RLS Policies for quiz questions
CREATE POLICY "Instructors can manage quiz questions" ON quiz_questions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM quizzes 
            WHERE quizzes.id = quiz_questions.quiz_id 
            AND (
                quizzes.created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM courses 
                    WHERE courses.id = quizzes.course_id 
                    AND courses.instructor_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Students can view quiz questions during attempts" ON quiz_questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM quizzes 
            WHERE quizzes.id = quiz_questions.quiz_id 
            AND quizzes.is_published = true
            AND EXISTS (
                SELECT 1 FROM enrollments 
                WHERE enrollments.course_id = quizzes.course_id 
                AND enrollments.student_id = auth.uid()
            )
        )
    );

-- RLS Policies for quiz question options
CREATE POLICY "Instructors can manage quiz options" ON quiz_question_options
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM quiz_questions 
            JOIN quizzes ON quizzes.id = quiz_questions.quiz_id
            WHERE quiz_questions.id = quiz_question_options.question_id 
            AND (
                quizzes.created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM courses 
                    WHERE courses.id = quizzes.course_id 
                    AND courses.instructor_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Students can view quiz options during attempts" ON quiz_question_options
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM quiz_questions 
            JOIN quizzes ON quizzes.id = quiz_questions.quiz_id
            WHERE quiz_questions.id = quiz_question_options.question_id 
            AND quizzes.is_published = true
            AND EXISTS (
                SELECT 1 FROM enrollments 
                WHERE enrollments.course_id = quizzes.course_id 
                AND enrollments.student_id = auth.uid()
            )
        )
    );

-- RLS Policies for quiz attempts
CREATE POLICY "Students can manage their own attempts" ON quiz_attempts
    FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Instructors can view attempts for their courses" ON quiz_attempts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM quizzes 
            JOIN courses ON courses.id = quizzes.course_id
            WHERE quizzes.id = quiz_attempts.quiz_id 
            AND courses.instructor_id = auth.uid()
        )
    );

-- RLS Policies for quiz answers
CREATE POLICY "Students can manage their own answers" ON quiz_answers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM quiz_attempts 
            WHERE quiz_attempts.id = quiz_answers.attempt_id 
            AND quiz_attempts.student_id = auth.uid()
        )
    );

CREATE POLICY "Instructors can view answers for their courses" ON quiz_answers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM quiz_attempts 
            JOIN quizzes ON quizzes.id = quiz_attempts.quiz_id
            JOIN courses ON courses.id = quizzes.course_id
            WHERE quiz_attempts.id = quiz_answers.attempt_id 
            AND courses.instructor_id = auth.uid()
        )
    );

-- RLS Policies for quiz analytics
CREATE POLICY "Instructors can view analytics for their courses" ON quiz_analytics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM quizzes 
            JOIN courses ON courses.id = quizzes.course_id
            WHERE quizzes.id = quiz_analytics.quiz_id 
            AND courses.instructor_id = auth.uid()
        )
    );

-- Create functions for quiz management
CREATE OR REPLACE FUNCTION calculate_quiz_score(attempt_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total_points INTEGER;
    earned_points INTEGER;
    score_percentage INTEGER;
BEGIN
    -- Get total possible points for the quiz
    SELECT COALESCE(SUM(qq.points), 0) INTO total_points
    FROM quiz_attempts qa
    JOIN quizzes q ON q.id = qa.quiz_id
    JOIN quiz_questions qq ON qq.quiz_id = q.id
    WHERE qa.id = attempt_id;
    
    -- Get earned points
    SELECT COALESCE(SUM(qa2.points_earned), 0) INTO earned_points
    FROM quiz_answers qa2
    WHERE qa2.attempt_id = attempt_id;
    
    -- Calculate percentage
    IF total_points > 0 THEN
        score_percentage := ROUND((earned_points::DECIMAL / total_points::DECIMAL) * 100);
    ELSE
        score_percentage := 0;
    END IF;
    
    RETURN score_percentage;
END;
$$ LANGUAGE plpgsql;

-- Function to update quiz analytics
CREATE OR REPLACE FUNCTION update_quiz_analytics(quiz_id UUID)
RETURNS VOID AS $$
DECLARE
    total_attempts_count INTEGER;
    total_students_count INTEGER;
    avg_score DECIMAL(5,2);
    pass_rate DECIMAL(5,2);
    avg_time INTEGER;
    passing_score INTEGER;
BEGIN
    -- Get passing score for the quiz
    SELECT passing_score INTO passing_score FROM quizzes WHERE id = quiz_id;
    
    -- Calculate analytics
    SELECT 
        COUNT(*),
        COUNT(DISTINCT student_id),
        COALESCE(AVG(score), 0),
        COALESCE(AVG(CASE WHEN score >= passing_score THEN 100.0 ELSE 0.0 END), 0),
        COALESCE(AVG(time_spent), 0)
    INTO total_attempts_count, total_students_count, avg_score, pass_rate, avg_time
    FROM quiz_attempts 
    WHERE quiz_id = quiz_id AND status = 'submitted';
    
    -- Insert or update analytics
    INSERT INTO quiz_analytics (quiz_id, total_attempts, total_students, average_score, pass_rate, average_time_spent, last_updated)
    VALUES (quiz_id, total_attempts_count, total_students_count, avg_score, pass_rate, avg_time, NOW())
    ON CONFLICT (quiz_id) 
    DO UPDATE SET 
        total_attempts = EXCLUDED.total_attempts,
        total_students = EXCLUDED.total_students,
        average_score = EXCLUDED.average_score,
        pass_rate = EXCLUDED.pass_rate,
        average_time_spent = EXCLUDED.average_time_spent,
        last_updated = NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger to update quiz analytics when attempts are submitted
CREATE OR REPLACE FUNCTION trigger_update_quiz_analytics()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'submitted' AND OLD.status != 'submitted' THEN
        PERFORM update_quiz_analytics(NEW.quiz_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_quiz_analytics_trigger
    AFTER UPDATE ON quiz_attempts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_quiz_analytics();

-- Add unique constraint to prevent duplicate analytics
ALTER TABLE quiz_analytics ADD CONSTRAINT unique_quiz_analytics UNIQUE (quiz_id);


