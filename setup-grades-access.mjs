#!/usr/bin/env node

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  statement_timeout: 5000,
  connectionTimeoutMillis: 5000,
});

async function setupGradesAccess() {
  try {
    console.log('🔧 Setting up grades table access...\n');

    // Disable RLS on key tables for anon access
    const tables = ['grades', 'subjects', 'topics'];
    
    for (const table of tables) {
      try {
        await pool.query(`ALTER TABLE public.${table} DISABLE ROW LEVEL SECURITY;`);
        console.log(`✅ ${table}: RLS disabled`);
      } catch (e) {
        console.log(`ℹ️  ${table}: ${e.message.split('\n')[0]}`);
      }
    }

    // Grant SELECT to anon
    const grants = [
      'GRANT SELECT ON public.grades TO anon;',
      'GRANT SELECT ON public.subjects TO anon;',
      'GRANT SELECT ON public.topics TO anon;',
      'GRANT SELECT ON public.challenge_questions TO anon;',
      'GRANT SELECT ON public.challenge_results TO anon;',
      'GRANT INSERT ON public.challenge_results TO anon;',
      'GRANT INSERT ON public.challenge_answers TO anon;',
    ];

    console.log('\n✅ Granting permissions...');
    for (const grant of grants) {
      try {
        await pool.query(grant);
        console.log(`   ${grant}`);
      } catch (e) {
        console.log(`   ℹ️  ${grant}: ${e.message.split('\n')[0]}`);
      }
    }

    console.log('\n✅ Done!');
    pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    pool.end();
    process.exit(1);
  }
}

setupGradesAccess();
