#!/usr/bin/env node

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  statement_timeout: 5000,
});

async function grantSelectPermissions() {
  try {
    console.log('🔓 Granting SELECT to anon on all tables...\n');

    const tables = [
      'grades',
      'subjects',
      'topics',
      'student_profiles', 
      'teacher_profiles',
      'student_enrollments',
      'student_subject_progress',
      'student_topic_activity',
      'challenge_results',
      'challenge_answers',
      'challenge_questions',
      'challenge_question_options',
      'user_badges',
      'badges',
      'users',
    ];

    for (const table of tables) {
      try {
        await pool.query(`GRANT SELECT ON public.${table} TO anon;`);
        console.log(`✅ SELECT on ${table}`);
      } catch (e) {
        console.log(`ℹ️  ${table}: ${e.message.split('\n')[0]}`);
      }
    }

    console.log('\n✅ Done!');
    pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    pool.end();
  }
}

grantSelectPermissions();
