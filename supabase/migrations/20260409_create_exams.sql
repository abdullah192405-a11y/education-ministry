-- ============================================================================
-- EXAMS FEATURE - Migration
-- Creates exams and exam_results tables for timed assessments
-- ============================================================================

-- Exam category enum
CREATE TYPE exam_category AS ENUM ('WEEKLY', 'MONTHLY', 'MID_SEMESTER', 'FINAL_SEMESTER');

-- Exam status enum  
CREATE TYPE exam_status AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'ENDED');

-- ============================================================================
-- Exams Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
    host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pin VARCHAR(6) UNIQUE NOT NULL,
    category exam_category NOT NULL DEFAULT 'WEEKLY',
    status exam_status NOT NULL DEFAULT 'DRAFT',
    
    -- Time window
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    
    -- Settings
    duration_minutes INT DEFAULT 60, -- max time to complete once started
    max_attempts INT DEFAULT 1,
    shuffle_questions BOOLEAN DEFAULT false,
    show_results BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_time_window CHECK (end_time > start_time)
);

-- Indexes
CREATE INDEX idx_exams_host ON exams(host_id);
CREATE INDEX idx_exams_pin ON exams(pin);
CREATE INDEX idx_exams_status ON exams(status);
CREATE INDEX idx_exams_times ON exams(start_time, end_time);

-- ============================================================================
-- Exam Results Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS exam_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_name TEXT,
    
    total_questions INT NOT NULL DEFAULT 0,
    correct_answers INT NOT NULL DEFAULT 0,
    wrong_answers INT NOT NULL DEFAULT 0,
    score INT NOT NULL DEFAULT 0,
    max_score INT NOT NULL DEFAULT 0,
    percentage FLOAT NOT NULL DEFAULT 0,
    time_taken FLOAT NOT NULL DEFAULT 0, -- seconds
    
    question_results JSONB, -- [{questionId, correct, timeTaken, pointsEarned, userAnswer}]
    
    started_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(exam_id, user_id)
);

-- Indexes
CREATE INDEX idx_exam_results_exam ON exam_results(exam_id);
CREATE INDEX idx_exam_results_user ON exam_results(user_id);

-- ============================================================================
-- RLS Policies (permissive for now, tighten as needed)
-- ============================================================================

ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read exams (they need the PIN/link anyway)
DROP POLICY IF EXISTS "Allow read exams" ON exams;
DROP POLICY IF EXISTS "Allow insert exams" ON exams;
DROP POLICY IF EXISTS "Allow update exams" ON exams;
DROP POLICY IF EXISTS "Allow delete exams" ON exams;
CREATE POLICY "Allow read exams" ON exams FOR SELECT USING (true);
CREATE POLICY "Allow insert exams" ON exams FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update exams" ON exams FOR UPDATE USING (true);
CREATE POLICY "Allow delete exams" ON exams FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow read exam_results" ON exam_results;
DROP POLICY IF EXISTS "Allow insert exam_results" ON exam_results;
DROP POLICY IF EXISTS "Allow update exam_results" ON exam_results;
DROP POLICY IF EXISTS "Allow delete exam_results" ON exam_results;
CREATE POLICY "Allow read exam_results" ON exam_results FOR SELECT USING (true);
CREATE POLICY "Allow insert exam_results" ON exam_results FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update exam_results" ON exam_results FOR UPDATE USING (true);
CREATE POLICY "Allow delete exam_results" ON exam_results FOR DELETE USING (true);
