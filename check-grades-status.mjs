#!/usr/bin/env node

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  statement_timeout: 5000,
});

async function checkStatus() {
  try {
    console.log('🔍 Checking grades table status...\n');

    // Check RLS
    const rls = await pool.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = 'grades';
    `);
    
    if (rls.rows[0]) {
      console.log(`📋 grades table:`);
      console.log(`   RLS Enabled: ${rls.rows[0].rowsecurity}`);
    }

    // Count grades
    const count = await pool.query(`SELECT COUNT(*) as count FROM public.grades;`);
    console.log(`\n📊 Grades count: ${count.rows[0].count}`);

    // Show first few grades
    const grades = await pool.query(`SELECT id, name, level FROM public.grades LIMIT 5;`);
    if (grades.rows.length > 0) {
      console.log(`\n✅ Grades found:`);
      grades.rows.forEach(g => {
        console.log(`   - ${g.name} (${g.level})`);
      });
    } else {
      console.log(`\n⚠️  No grades found in database`);
    }

    pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    pool.end();
  }
}

checkStatus();
