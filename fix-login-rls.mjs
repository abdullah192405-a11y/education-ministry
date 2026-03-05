#!/usr/bin/env node

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function fixRLS() {
  let client;
  try {
    client = await pool.connect();
    console.log('🔐 Fixing RLS for login...\n');

    // Drop all existing policies
    console.log('   Removing old policies...');
    await client.query('DROP POLICY IF EXISTS "users_anon_select_by_email" ON public.users');
    await client.query('DROP POLICY IF EXISTS "users_authenticated_select" ON public.users');
    await client.query('DROP POLICY IF EXISTS "users_authenticated_update" ON public.users');
    await client.query('DROP POLICY IF EXISTS "users_authenticated_insert" ON public.users');

    // Disable RLS for now (allow everyone to read)
    console.log('   Disabling RLS on users table (for login fallback)...');
    await client.query('ALTER TABLE public.users DISABLE ROW LEVEL SECURITY');

    console.log('\n✅ RLS configured for login!');
    console.log('\n📝 Changes made:');
    console.log('   ✅ All RLS policies removed');
    console.log('   ✅ RLS disabled on users table');
    console.log('   ✅ Everyone can read users table (for login)');
    console.log('\n⚠️  Note: This is for development. In production, enable proper RLS policies.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

fixRLS();
