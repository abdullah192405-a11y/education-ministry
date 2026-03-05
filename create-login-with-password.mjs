#!/usr/bin/env node

import { Pool } from 'pg';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function createLoginWithPasswordFunction() {
  try {
    console.log('🔧 Creating login function with password validation...\n');

    // Drop existing function
    await pool.query(`
      DROP FUNCTION IF EXISTS public.login_user(text, text) CASCADE;
    `);
    console.log('✅ Cleaned up old function');

    // Create function that validates email AND password
    await pool.query(`
      CREATE OR REPLACE FUNCTION public.login_user(p_email text, p_password text)
      RETURNS TABLE(
        id uuid,
        email text,
        name text,
        role text,
        verified boolean,
        is_active boolean,
        success boolean,
        message text
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      DECLARE
        v_user record;
        v_password_hash text;
      BEGIN
        -- Get user from database
        SELECT users.id, users.email, users.name, users.role, users.verified, users.is_active, users.password_hash INTO v_user
        FROM users
        WHERE users.email = p_email AND users.is_active = true;

        -- User not found
        IF v_user IS NULL THEN
          RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::boolean, NULL::boolean, false, 'User not found or inactive';
          RETURN;
        END IF;

        -- Check password
        -- If password_hash is NULL (no password set), reject
        IF v_user.password_hash IS NULL THEN
          RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::boolean, NULL::boolean, false, 'Invalid credentials';
          RETURN;
        END IF;

        -- Hash the provided password with MD5 (matching how it was stored)
        v_password_hash := md5(p_password);

        -- Compare passwords
        IF v_password_hash = v_user.password_hash THEN
          -- Success
          RETURN QUERY SELECT v_user.id, v_user.email, v_user.name, v_user.role::text, v_user.verified, v_user.is_active, true, 'Login successful';
        ELSE
          -- Wrong password
          RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::boolean, NULL::boolean, false, 'Invalid credentials';
        END IF;
      END;
      $$;
    `);
    console.log('✅ Created login_user(email, password) function');

    // Grant execute to anon
    await pool.query(`
      GRANT EXECUTE ON FUNCTION public.login_user(text, text) TO anon;
    `);
    console.log('✅ Granted EXECUTE to anon role');

    // Test with admin
    console.log('\n🧪 Testing with admin@gmail.com / 123456...');
    const result = await pool.query(`
      SELECT * FROM public.login_user('admin@gmail.com', '123456');
    `);

    if (result.rows[0]) {
      const res = result.rows[0];
      console.log(`\nResult:`);
      console.log(`   Success: ${res.success}`);
      console.log(`   Message: ${res.message}`);
      if (res.success) {
        console.log(`   ID: ${res.id}`);
        console.log(`   Email: ${res.email}`);
        console.log(`   Name: ${res.name}`);
        console.log(`   Role: ${res.role}`);
      }
    }

    console.log('\n✅ Login function setup complete!');

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

createLoginWithPasswordFunction();
