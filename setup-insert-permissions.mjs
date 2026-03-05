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

async function setupInsertPermissions() {
  try {
    console.log('🔧 Setting up INSERT/UPDATE/DELETE permissions for anon role...\n');

    // List of tables that need full CRUD for anon
    const tables = [
      'grades',
      'subjects', 
      'topics',
      'challenge_results',
      'challenge_answers',
      'challenge_questions',
      'badges',
      'user_badges',
    ];

    console.log('📝 Granting CRUD permissions on tables:');
    for (const table of tables) {
      const perms = [
        `GRANT SELECT ON public.${table} TO anon;`,
        `GRANT INSERT ON public.${table} TO anon;`,
        `GRANT UPDATE ON public.${table} TO anon;`,
        `GRANT DELETE ON public.${table} TO anon;`,
      ];

      for (const perm of perms) {
        try {
          await pool.query(perm);
          const action = perm.split(' ')[1];
          console.log(`   ✅ ${action.padEnd(6)} on ${table}`);
        } catch (e) {
          if (!e.message.includes('already exists')) {
            console.log(`   ℹ️  ${table}: ${e.message.split('\n')[0]}`);
          }
        }
      }
    }

    // Grant sequence permissions
    console.log('\n📝 Granting SEQUENCE permissions:');
    const sequences = [
      'public.challenge_results_id_seq',
      'public.challenge_answers_id_seq',
      'public.challenge_questions_id_seq',
      'public.user_badges_id_seq',
    ];

    for (const seq of sequences) {
      try {
        await pool.query(`GRANT USAGE, SELECT ON SEQUENCE ${seq} TO anon;`);
        console.log(`   ✅ ${seq}`);
      } catch (e) {
        if (!e.message.includes('does not exist')) {
          console.log(`   ℹ️  ${seq}: ${e.message.split('\n')[0]}`);
        }
      }
    }

    console.log('\n✅ Permissions setup complete!');
    pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    pool.end();
    process.exit(1);
  }
}

setupInsertPermissions();
