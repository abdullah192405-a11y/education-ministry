#!/usr/bin/env node

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function checkRLS() {
  let client;
  try {
    client = await pool.connect();
    console.log('🔍 Checking RLS policies...\n');

    const result = await client.query(`
      SELECT 
        schemaname,
        tablename,
        rowsecurity
      FROM pg_tables 
      WHERE schemaname = 'public' AND tablename IN ('users', 'badges', 'student_profiles')
    `);

    console.log('📊 Tables RLS Status:');
    result.rows.forEach(row => {
      console.log(`   ${row.tablename}: RLS ${row.rowsecurity ? 'ENABLED ⚠️' : 'DISABLED ✅'}`);
    });

    // Check for actual policies
    const policiesResult = await client.query(`
      SELECT 
        schemaname,
        tablename,
        policyname
      FROM pg_policies 
      WHERE schemaname = 'public' AND tablename IN ('users', 'badges', 'student_profiles')
    `);

    if (policiesResult.rows.length > 0) {
      console.log('\n🔐 Policies Found:');
      policiesResult.rows.forEach(row => {
        console.log(`   ${row.tablename}.${row.policyname}`);
      });
    } else {
      console.log('\n✅ No RLS policies detected');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

checkRLS();
