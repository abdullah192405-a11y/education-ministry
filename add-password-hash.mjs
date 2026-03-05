#!/usr/bin/env node

import { Pool } from 'pg';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function setupPassword() {
  try {
    console.log('🔧 Adding password hash column and setting admin password...\n');

    // Check if password_hash column exists
    const checkCol = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'password_hash';
    `);

    if (checkCol.rows.length === 0) {
      console.log('➕ Adding password_hash column...');
      await pool.query(`
        ALTER TABLE public.users ADD COLUMN password_hash text;
      `);
      console.log('✅ Column added');
    } else {
      console.log('✅ Column already exists');
    }

    // Set password for admin (MD5 of "123456")
    const passwordHash = crypto.createHash('md5').update('123456').digest('hex');
    console.log(`\n🔐 Setting admin password (MD5 hash: ${passwordHash})`);

    await pool.query(
      `UPDATE public.users SET password_hash = $1 WHERE email = $2`,
      [passwordHash, 'admin@gmail.com']
    );

    const result = await pool.query(
      `SELECT id, email, name, password_hash FROM public.users WHERE email = $1`,
      ['admin@gmail.com']
    );

    if (result.rows[0]) {
      console.log('✅ Password set for admin:');
      console.log(`   ID: ${result.rows[0].id}`);
      console.log(`   Email: ${result.rows[0].email}`);
      console.log(`   Name: ${result.rows[0].name}`);
      console.log(`   Password Hash: ${result.rows[0].password_hash}`);
    }

    console.log('\n✅ Admin password setup complete!');

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

setupPassword();
