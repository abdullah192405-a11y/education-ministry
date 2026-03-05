#!/usr/bin/env node

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function createSecureLoginFunction() {
  try {
    console.log('🔧 Creating secure login function...\n');

    // Drop existing function if it exists
    await pool.query(`
      DROP FUNCTION IF EXISTS public.get_user_for_login(text) CASCADE;
    `);
    console.log('✅ Cleaned up old function');

    // Create a new function that returns user data
    // Key: function is SECURITY DEFINER - runs with creator's permissions, not caller's
    await pool.query(`
      CREATE OR REPLACE FUNCTION public.get_user_for_login(p_email text)
      RETURNS TABLE(id uuid, email text, name text, role text, verified boolean, is_active boolean)
      LANGUAGE sql
      SECURITY DEFINER
      SET search_path = public
      AS $$
        SELECT id, email, name, role, verified, is_active
        FROM users
        WHERE email = p_email AND is_active = true;
      $$;
    `);
    console.log('✅ Created get_user_for_login() function (SECURITY DEFINER)');

    // Grant execute permission to anon role
    await pool.query(`
      GRANT EXECUTE ON FUNCTION public.get_user_for_login(text) TO anon;
    `);
    console.log('✅ Granted EXECUTE to anon role');

    // Test the function with admin user
    console.log('\n🧪 Testing function with admin user...');
    const result = await pool.query(`
      SELECT * FROM public.get_user_for_login('admin@gmail.com');
    `);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('✅ Function returns user data:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Active: ${user.is_active}`);
    } else {
      console.log('❌ Function returned no rows');
      process.exit(1);
    }

    console.log('\n✅ Login function setup complete!');
    console.log('\n📝 How it works:');
    console.log('   1. Function is SECURITY DEFINER (runs with postgres permissions)');
    console.log('   2. Anon role can EXECUTE the function');
    console.log('   3. Function queries users table directly (avoiding schema permission issues)');
    console.log('   4. Client calls: supabase.rpc("get_user_for_login", { p_email: email })');

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

createSecureLoginFunction();
