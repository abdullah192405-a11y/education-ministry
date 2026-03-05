# 🗄️ Lab4 Education Ministry — Database Design (Supabase + Prisma)

## 📊 System Analysis Summary

After analyzing the full project, here's what the **Lab4 Education Ministry Platform** consists of:

### Technology Stack
- **Frontend**: React + TypeScript + Vite + ShadCN/UI + TailwindCSS
- **State**: TanStack React Query + localStorage (demo auth)
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Database (NEW)**: Supabase PostgreSQL + Prisma ORM

### Core Features Identified
| Feature | Description |
|---------|-------------|
| **Education Hierarchy** | Grades → Subjects → Topics (3-level system) |
| **Content Management** | Videos, Images, Text, PDFs per topic |
| **Quizzes** | Standard quiz questions per topic |
| **Channels** | Organizations/Schools/Companies publishing content |
| **Challenges** | Single & Group challenge game modes |
| **Game Types** | MCQ, True/False, Q&A, Matching, Puzzle, Shooting, Wheel Spin |
| **Gamification** | Badges, Streaks, Leaderboards, Points, Levels |
| **User Roles** | Student, Teacher, Admin (3 dashboards) |
| **AI Integration** | Gemini API for question generation |

---

## 🏗️ Entity-Relationship Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USERS & AUTH                                 │
│  ┌──────┐    ┌─────────────────┐    ┌─────────────────┐           │
│  │ User │───▶│ StudentProfile  │    │ TeacherProfile  │           │
│  └──────┘    └─────────────────┘    └─────────────────┘           │
│     │                 │                      │                     │
│     │        ┌────────┼──────────────────────┼──────┐             │
│     │        ▼        ▼                      ▼      │             │
│     │   ┌─────────────────────────────────────────┐ │             │
│     │   │          EDUCATION HIERARCHY            │ │             │
│     │   │  Grade ──▶ Subject ──▶ Topic            │ │             │
│     │   └─────────────────────────────────────────┘ │             │
│     │        │                        │             │             │
│     │        ▼                        ▼             │             │
│     │   ┌──────────┐           ┌────────────┐      │             │
│     │   │TopicMedia│           │QuizQuestion │      │             │
│     │   └──────────┘           └────────────┘      │             │
│     │                                               │             │
│     │   ┌─────────────────────────────────────────┐ │             │
│     │   │            CHANNELS                     │ │             │
│     │   │  Channel ──▶ ChannelContent             │ │             │
│     │   │               ├──▶ ChannelContentMedia  │ │             │
│     │   │               └──▶ ChannelContentQuiz   │ │             │
│     │   └─────────────────────────────────────────┘ │             │
│     │                                               │             │
│     │   ┌─────────────────────────────────────────┐ │             │
│     │   │         CHALLENGES & GAMES              │ │             │
│     │   │  ChallengeQuestion                      │ │             │
│     │   │  ChallengeSession ──▶ PlayerSession     │ │             │
│     │   │                  ──▶ SessionQuestion     │ │             │
│     │   │                  ──▶ ChallengeResult     │ │             │
│     │   └─────────────────────────────────────────┘ │             │
│     │                                               │             │
│     │   ┌─────────────────────────────────────────┐ │             │
│     │   │         GAMIFICATION                    │ │             │
│     │   │  Badge ──▶ UserBadge                    │ │             │
│     │   │        ──▶ ResultBadge                  │ │             │
│     │   └─────────────────────────────────────────┘ │             │
│     │                                               │             │
│     │   ┌─────────────────────────────────────────┐ │             │
│     │   │         PLATFORM                        │ │             │
│     │   │  AuditLog, PlatformSetting              │ │             │
│     │   │  Notification, Announcement              │ │             │
│     │   └─────────────────────────────────────────┘ │             │
│     │                                               │             │
│     │   ┌─────────────────────────────────────────┐ │             │
│     │   │       STUDENT PROGRESS                  │ │             │
│     │   │  StudentEnrollment                      │ │             │
│     │   │  StudentSubjectProgress                 │ │             │
│     │   │  StudentTopicActivity                   │ │             │
│     │   └─────────────────────────────────────────┘ │             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📋 All Database Tables (28 total)

### 1. Users & Authentication (3 tables)
| Table | PostgreSQL Name | Description |
|-------|----------------|-------------|
| `User` | `users` | Core user account (Student/Teacher/Admin) |
| `StudentProfile` | `student_profiles` | Student-specific data (points, streaks, rank) |
| `TeacherProfile` | `teacher_profiles` | Teacher-specific data (students, subjects) |

### 2. Education Hierarchy (3 tables)
| Table | PostgreSQL Name | Description |
|-------|----------------|-------------|
| `Grade` | `grades` | School grades (e.g., الصف الأول الابتدائي) |
| `Subject` | `subjects` | Subjects per grade (e.g., اللغة العربية) |
| `Topic` | `topics` | Topics per subject (e.g., حروف الهجاء) |

### 3. Content & Media (1 table)
| Table | PostgreSQL Name | Description |
|-------|----------------|-------------|
| `TopicMedia` | `topic_media` | Videos, images, text, PDFs per topic |

### 4. Quizzes (1 table)
| Table | PostgreSQL Name | Description |
|-------|----------------|-------------|
| `QuizQuestion` | `quiz_questions` | Standard quiz questions per topic |

### 5. Channels (4 tables)
| Table | PostgreSQL Name | Description |
|-------|----------------|-------------|
| `Channel` | `channels` | Organizations publishing content |
| `ChannelContent` | `channel_contents` | Educational content within channels |
| `ChannelContentMedia` | `channel_content_media` | Media for channel content |
| `ChannelContentQuiz` | `channel_content_quizzes` | Quiz questions for channel content |

### 6. Challenges & Games (5 tables)
| Table | PostgreSQL Name | Description |
|-------|----------------|-------------|
| `ChallengeQuestion` | `challenge_questions` | Rich question format (MCQ, matching, puzzle, etc.) |
| `ChallengeSession` | `challenge_sessions` | Game session instance |
| `SessionQuestion` | `session_questions` | Questions linked to a session |
| `PlayerSession` | `player_sessions` | Players within a challenge |
| `ChallengeResult` | `challenge_results` | Final scores & results |

### 7. Gamification (3 tables)
| Table | PostgreSQL Name | Description |
|-------|----------------|-------------|
| `Badge` | `badges` | Badge definitions |
| `UserBadge` | `user_badges` | Badges earned by users |
| `ResultBadge` | `result_badges` | Badges earned per challenge result |

### 8. Student Progress (3 tables)
| Table | PostgreSQL Name | Description |
|-------|----------------|-------------|
| `StudentEnrollment` | `student_enrollments` | Student enrollment in grades |
| `StudentSubjectProgress` | `student_subject_progress` | Progress per subject |
| `StudentTopicActivity` | `student_topic_activities` | Activity log per topic |

### 9. Platform (4 tables)
| Table | PostgreSQL Name | Description |
|-------|----------------|-------------|
| `AuditLog` | `audit_logs` | Admin audit trail |
| `PlatformSetting` | `platform_settings` | Key-value settings store |
| `Notification` | `notifications` | User notifications |
| `Announcement` | `announcements` | System-wide announcements |

---

## 🔗 Key Relationships

```
User (1) ──── (0..1) StudentProfile
User (1) ──── (0..1) TeacherProfile
User (1) ──── (N) UserBadge ──── (1) Badge
User (1) ──── (N) ChallengeResult
User (1) ──── (N) PlayerSession
User (1) ──── (N) Channel (ownership)

Grade (1) ──── (N) Subject (1) ──── (N) Topic
Topic (1) ──── (N) TopicMedia
Topic (1) ──── (N) QuizQuestion
Topic (1) ──── (N) ChallengeQuestion

Channel (1) ──── (N) ChannelContent
ChannelContent (1) ──── (N) ChannelContentMedia
ChannelContent (1) ──── (N) ChannelContentQuiz
ChannelContent (1) ──── (N) ChallengeQuestion

ChallengeSession (1) ──── (N) PlayerSession
ChallengeSession (1) ──── (N) SessionQuestion
ChallengeSession (1) ──── (N) ChallengeResult

StudentProfile (1) ──── (N) StudentSubjectProgress
StudentProfile (1) ──── (N) StudentTopicActivity
StudentProfile (1) ──── (N) StudentEnrollment
```

---

## 🔐 Enums

| Enum | Values | Usage |
|------|--------|-------|
| `UserRole` | STUDENT, TEACHER, ADMIN | User roles |
| `GradeLevel` | PRIMARY, MIDDLE, SECONDARY | Grade stages |
| `MediaType` | VIDEO, IMAGE, TEXT, PDF | Content types |
| `ChannelType` | MINISTRY, SCHOOL, ORGANIZATION, COMPANY, INDIVIDUAL | Channel owners |
| `TargetAudience` | ALL, CHILDREN, ADULTS | Content targeting |
| `ChallengeMode` | SINGLE, GROUP | Challenge modes |
| `ChallengeCategory` | ACTIVITIES, GAMES, MIXED | Challenge categories |
| `QuestionType` | MULTIPLE_CHOICE, TRUE_FALSE, QA, KNOW_DONT_KNOW, ORDER_QUESTIONS, PUZZLE, SHOOTING, MATCHING, WHEEL_SPIN | All question types |
| `SessionStatus` | WAITING, PLAYING, FINISHED | Session lifecycle |

---

## 🚀 Setup Instructions

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL, anon key, and database connection strings

### 2. Configure Environment Variables
```bash
# Copy the example env file
cp .env.example .env

# Edit .env with your Supabase credentials
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
```

### 3. Run Migrations
```bash
# Generate and apply the initial migration
npx prisma migrate dev --name init

# Generate the Prisma Client
npx prisma generate

# Seed the database with initial data
npx prisma db seed
```

### 4. Explore
```bash
# Open Prisma Studio to browse your data
npx prisma studio
```

---

## 📁 Files Created

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Complete database schema (28 models) |
| `prisma/seed.ts` | Database seed with initial mock data |
| `prisma.config.ts` | Prisma configuration for Supabase |
| `.env.example` | Environment variables template |
| `DATABASE_DESIGN.md` | This documentation file |
