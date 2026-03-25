#!/usr/bin/env node

import { Pool } from 'pg';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const url = new URL(process.env.DATABASE_URL);
url.search = '';

const pool = new Pool({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: false }
});

async function createResetPasswordFunction() {
    try {
        console.log('🔧 Creating reset_user_password function...\n');

        // Drop existing function
        await pool.query(`
      DROP FUNCTION IF EXISTS public.reset_user_password(text, text) CASCADE;
      DROP FUNCTION IF EXISTS public.check_user_email(text) CASCADE;
    `);

        // Create function to check if email exists and user is active
        await pool.query(`
      CREATE OR REPLACE FUNCTION public.check_user_email(p_email text)
      RETURNS boolean
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      DECLARE
        v_exists boolean;
      BEGIN
        SELECT EXISTS(
            SELECT 1 FROM users 
            WHERE email = p_email AND is_active = true
        ) INTO v_exists;
        
        RETURN v_exists;
      END;
      $$;
    `);

        // Create function to reset password
        await pool.query(`
      CREATE OR REPLACE FUNCTION public.reset_user_password(p_email text, p_new_password text)
      RETURNS boolean
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      DECLARE
        v_user_exists boolean;
        v_password_hash text;
      BEGIN
        -- Check if user exists
        SELECT EXISTS(
            SELECT 1 FROM users 
            WHERE email = p_email AND is_active = true
        ) INTO v_user_exists;

        IF NOT v_user_exists THEN
          RETURN false;
        END IF;

        -- Hash the new password with MD5 (matching how it was stored)
        v_password_hash := md5(p_new_password);

        -- Update the password
        UPDATE users SET password_hash = v_password_hash WHERE email = p_email;
        
        -- Also try to update auth.users if it exists there (bypassing the error if it fails)
        -- We won't touch auth.users here as it requires admin privileges we might not have in this RPC context easily,
        -- and the user relies on public.users login_user fallback anyway.

        RETURN true;
      END;
      $$;
    `);

        console.log('✅ Created check_user_email and reset_user_password functions');

        // Grant execute to anon
        await pool.query(`
      GRANT EXECUTE ON FUNCTION public.check_user_email(text) TO anon;
      GRANT EXECUTE ON FUNCTION public.reset_user_password(text, text) TO anon;
    `);
        console.log('✅ Granted EXECUTE to anon role');

        console.log('\n✅ Reset password RPC setup complete!');

        await pool.end();
    } catch (error) {
        console.error('❌ Error:', error.message);
        await pool.end();
        process.exit(1);
    }
}

createResetPasswordFunction();
