#!/usr/bin/env node

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function enableLoginRLS() {
  let client;
  try {
    client = await pool.connect();
    console.log('🔐 Configuring RLS for login fallback...\n');

    // Drop existing policies
    console.log('   Cleaning up old policies...');
    await client.query('DROP POLICY IF EXISTS "users_anon_read" ON public.users');
    await client.query('DROP POLICY IF EXISTS "users_authenticated_read" ON public.users');
    await client.query('DROP POLICY IF EXISTS "users_authenticated_update_own" ON public.users');

    // Enable RLS
    console.log('   Enabling RLS...');
    await client.query('ALTER TABLE public.users ENABLE ROW LEVEL SECURITY');

    // Create policies
    console.log('   Creating SELECT policy for anonymous users...');
    await client.query(`
      CREATE POLICY "users_anon_select_by_email" ON public.users
        FOR SELECT
        USING (true)
    `);

    console.log('   Creating SELECT policy for authenticated users...');
    await client.query(`
      CREATE POLICY "users_authenticated_select" ON public.users
        FOR SELECT
        USING (auth.uid() = auth.uid())
    `);

    console.log('   Creating UPDATE policy for authenticated users...');
    await client.query(`
      CREATE POLICY "users_authenticated_update" ON public.users
        FOR UPDATE
        USING (auth.uid() = id::uuid)
    `);

    console.log('   Creating INSERT policy for authenticated users...');
    await client.query(`
      CREATE POLICY "users_authenticated_insert" ON public.users
        FOR INSERT
        WITH CHECK (auth.uid() = id::uuid)
    `);

    console.log('\n✅ RLS configured successfully!');
    console.log('\n📝 Changes made:');
    console.log('   ✅ RLS enabled on users table');
    console.log('   ✅ Anonymous users can read all users (for login)');
    console.log('   ✅ Authenticated users can read own record');
    console.log('   ✅ Authenticated users can update own record');
    console.log('\n✅ Login should now work!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n📝 If this fails, run manually in Supabase SQL editor:');
    console.log('   cat enable-login-rls.sql');
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

enableLoginRLS();
