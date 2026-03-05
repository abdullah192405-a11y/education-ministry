#!/usr/bin/env node

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function checkStatus() {
  try {
    // Check if RLS is enabled on users table
    const rls = await pool.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = 'users';
    `);
    
    console.log('📋 Users table RLS status:');
    if (rls.rows[0]) {
      console.log(`   RLS Enabled: ${rls.rows[0].rowsecurity}`);
    }

    // Check if public_users view exists
    const views = await pool.query(`
      SELECT viewname FROM pg_views 
      WHERE schemaname = 'public' AND viewname = 'public_users';
    `);
    
    console.log('\n📋 Public_users view:');
    if (views.rows[0]) {
      console.log(`   ✅ View exists`);
    } else {
      console.log(`   ❌ View does NOT exist`);
    }

    // Check grants on the view
    const grants = await pool.query(`
      SELECT grantee, privilege_type 
      FROM role_table_grants 
      WHERE table_schema = 'public' AND table_name = 'public_users';
    `);

    console.log('\n📋 Grants on public_users view:');
    if (grants.rows.length > 0) {
      grants.rows.forEach(row => {
        console.log(`   ${row.grantee}: ${row.privilege_type}`);
      });
    } else {
      console.log(`   ❌ No grants found`);
    }

    // Try to query public_users as anon would
    console.log('\n🧪 Testing direct view access...');
    try {
      const result = await pool.query('SELECT * FROM public.public_users LIMIT 1;');
      console.log(`   ✅ Direct query succeeded (${result.rows.length} rows)`);
    } catch (e) {
      console.log(`   ❌ Direct query failed: ${e.message}`);
    }

    pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    pool.end();
    process.exit(1);
  }
}

checkStatus();
