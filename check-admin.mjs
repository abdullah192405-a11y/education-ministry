#!/usr/bin/env node

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function checkAdmin() {
  let client;
  try {
    client = await pool.connect();
    console.log('🔍 Checking admin user...\n');

    const result = await client.query(
      'SELECT id, email, name, role, verified, is_active FROM users WHERE email = $1',
      ['admin@gmail.com']
    );

    if (result.rows.length === 0) {
      console.log('❌ Admin user NOT found in database');
    } else {
      const user = result.rows[0];
      console.log('✅ Admin user FOUND:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Verified: ${user.verified}`);
      console.log(`   Active: ${user.is_active}`);
      console.log(`\n✅ User can login with:`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: 123456 (or any password)`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

checkAdmin();
