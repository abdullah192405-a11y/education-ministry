#!/usr/bin/env node

// This script sets up a Postgres trigger and function to allow login fallback
// It creates a way for the app to authenticate users without needing Supabase Auth

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function setupLoginFunction() {
  let client;
  try {
    client = await pool.connect();
    console.log('🔧 Setting up login fallback function...\n');

    // Create a public function that anyone can call
    console.log('   Creating login verification function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.verify_user_login(p_email TEXT)
      RETURNS json AS $$
      DECLARE
        v_user users%ROWTYPE;
      BEGIN
        SELECT * INTO v_user FROM public.users WHERE email = p_email LIMIT 1;
        
        IF v_user.id IS NULL THEN
          RETURN json_build_object('success', false, 'message', 'User not found');
        END IF;
        
        IF v_user.is_active = false THEN
          RETURN json_build_object('success', false, 'message', 'Account disabled');
        END IF;
        
        RETURN json_build_object(
          'success', true,
          'id', v_user.id,
          'email', v_user.email,
          'name', v_user.name,
          'role', v_user.role,
          'verified', v_user.verified,
          'details', v_user.details
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    // Grant execute permission to anonymous users
    console.log('   Setting function permissions...');
    await client.query(`
      GRANT EXECUTE ON FUNCTION public.verify_user_login(TEXT) TO anon;
    `);

    console.log('\n✅ Login function created!');
    console.log('\n📝 Changes made:');
    console.log('   ✅ Created verify_user_login() function');
    console.log('   ✅ Function is callable by anonymous users');
    console.log('   ✅ Returns user data if found and active');

  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('⏭️  Login function already exists');
    } else {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

setupLoginFunction();
