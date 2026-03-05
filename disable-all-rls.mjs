#!/usr/bin/env node

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL ? process.env.DATABASE_URL.split('?')[0] : '';

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false },
  statement_timeout: 5000,
});

async function disableRLS() {
  try {
    console.log('🔓 Disabling RLS on related tables...\n');

    const tables = [
      'users',
      'teacher_profiles',
      'grades',
      'topics',
      'challenge_sessions',
      'subjects',
      'student_profiles',
      'student_enrollments',
      'student_subject_progress',
      'challenge_results',
      'challenge_answers',
      'challenge_questions',
      'user_badges'
    ];

    for (const table of tables) {
      try {
        await pool.query(`ALTER TABLE public.${table} DISABLE ROW LEVEL SECURITY;`);
        console.log(`✅ ${table}`);
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

disableRLS();
