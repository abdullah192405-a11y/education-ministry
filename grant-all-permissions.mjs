#!/usr/bin/env node

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL ? process.env.DATABASE_URL.split('?')[0] : '';

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false },
  statement_timeout: 10000,
});

async function grantAllPermissions() {
  try {
    console.log('🔓 Granting ALL permissions on ALL tables to anon role...\n');

    // Get all tables in public schema (exclude system tables)
    const result = await pool.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename NOT LIKE '\\_%'
      ORDER BY tablename;
    `);

    const tables = result.rows.map(r => r.tablename);
    console.log(`📋 Found ${tables.length} tables\n`);

    // Build batch SQL
    let sql = '';

    // Disable RLS on all tables
    sql += tables.map(t => `ALTER TABLE public.${t} DISABLE ROW LEVEL SECURITY;`).join('\n');
    sql += '\n';

    // Grant CRUD
    for (const perm of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
      sql += tables.map(t => `GRANT ${perm} ON public.${t} TO anon;`).join('\n');
      sql += '\n';
      sql += tables.map(t => `GRANT ${perm} ON public.${t} TO authenticated;`).join('\n');
      sql += '\n';
    }

    // Get sequences
    const seqResult = await pool.query(`
      SELECT sequencename FROM pg_sequences 
      WHERE schemaname = 'public'
      ORDER BY sequencename;
    `);

    const sequences = seqResult.rows.map(r => r.sequencename);

    // Grant USAGE on sequences
    sql += sequences.map(s => `GRANT USAGE, SELECT ON SEQUENCE public.${s} TO anon;`).join('\n');
    sql += '\n';
    sql += sequences.map(s => `GRANT USAGE, SELECT ON SEQUENCE public.${s} TO authenticated;`).join('\n');

    // Execute all at once
    console.log('⏳ Executing SQL batch...');
    await pool.query(sql);

    console.log('\n✅ All permissions granted!');
    console.log(`\n📊 Summary:`);
    console.log(`   Tables: ${tables.length}`);
    console.log(`   Sequences: ${sequences.length}`);
    console.log(`   Permissions: SELECT, INSERT, UPDATE, DELETE, USAGE`);

    pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    pool.end();
    process.exit(1);
  }
}

grantAllPermissions();
