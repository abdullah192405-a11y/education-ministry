#!/usr/bin/env node

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function checkSchemaPerms() {
  try {
    console.log('🔍 Checking schema permissions...\n');

    // Check what the anon role can see
    const schemas = await pool.query(`
      SELECT schema_name FROM information_schema.schemata;
    `);
    
    console.log('Available schemas:');
    schemas.rows.forEach(row => {
      console.log(`  • ${row.schema_name}`);
    });

    // Check anon role directly
    const anonRole = await pool.query(`
      SELECT * FROM pg_roles WHERE rolname = 'anon';
    `);

    console.log('\nAnon role info:');
    if (anonRole.rows[0]) {
      const role = anonRole.rows[0];
      console.log(`  • Superuser: ${role.rolsuper}`);
      console.log(`  • Create DB: ${role.rolcreatedb}`);
      console.log(`  • Create role: ${role.rolcreaterole}`);
      console.log(`  • Can login: ${role.rolcanlogin}`);
    } else {
      console.log('  ❌ Anon role not found!');
    }

    // Check schema permissions
    const aclQuery = await pool.query(`
      SELECT nspacl FROM pg_namespace WHERE nspname = 'public';
    `);

    console.log('\nPublic schema ACL:');
    if (aclQuery.rows[0]?.nspacl) {
      console.log(`  ${JSON.stringify(aclQuery.rows[0].nspacl, null, 2)}`);
    } else {
      console.log('  No ACL set');
    }

    // Try to grant schema usage to anon
    console.log('\n🔧 Granting schema permissions to anon...');
    await pool.query(`GRANT USAGE ON SCHEMA public TO anon;`);
    console.log('✅ Granted USAGE on public schema to anon');

    // Try RPC test after grant
    console.log('\n🧪 Testing RPC after schema grant...');
    const rpcTest = await pool.query(`
      SELECT public.get_user_for_login('admin@gmail.com') as user_data;
    `);
    
    if (rpcTest.rows[0]) {
      console.log('✅ RPC now works!');
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
  }
}

checkSchemaPerms();
