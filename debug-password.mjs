#!/usr/bin/env node

import { Pool } from 'pg';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function debugPassword() {
  try {
    console.log('🔍 Checking password hash and testing login function...\n');

    // Check what password is stored
    const user = await pool.query(
      `SELECT id, email, password_hash FROM public.users WHERE email = 'admin@gmail.com'`
    );

    if (user.rows[0]) {
      const stored = user.rows[0].password_hash;
      console.log('📋 Stored password hash:');
      console.log(`   ${stored}\n`);

      // Test different passwords
      const testPasswords = ['123456', '123456 ', ' 123456', 'password'];

      console.log('🧪 Testing different passwords:');
      for (const pwd of testPasswords) {
        const hash = crypto.createHash('md5').update(pwd).digest('hex');
        const match = hash === stored;
        console.log(`   "${pwd}" → ${hash} ${match ? '✅ MATCH' : '❌'}`);
      }

      // Now test with the function
      console.log('\n🧪 Testing login_user function:');
      const result = await pool.query(
        `SELECT * FROM public.login_user('admin@gmail.com', '123456')`
      );

      if (result.rows[0]) {
        const r = result.rows[0];
        console.log(`   Success: ${r.success}`);
        console.log(`   Message: ${r.message}`);
        if (r.id) {
          console.log(`   ID: ${r.id}`);
          console.log(`   Email: ${r.email}`);
          console.log(`   Role: ${r.role}`);
        }
      }
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
  }
}

debugPassword();
