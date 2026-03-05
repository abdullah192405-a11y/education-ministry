#!/usr/bin/env node

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function createPublicLoginView() {
  let client;
  try {
    client = await pool.connect();
    console.log('🔧 Creating public login view...\n');

    // Create a public view that anyone can query
    console.log('   Creating public_users view...');
    await client.query(`
      DROP VIEW IF EXISTS public.public_users CASCADE;
      
      CREATE VIEW public.public_users AS
      SELECT 
        id,
        email,
        name,
        role,
        verified,
        is_active,
        details
      FROM public.users;
    `);

    // Grant select on the view to anon role
    console.log('   Granting select permission to anon role...');
    await client.query(`
      GRANT SELECT ON public.public_users TO anon;
    `);

    console.log('\n✅ Public login view created!');
    console.log('\n📝 Changes made:');
    console.log('   ✅ Created public_users view');
    console.log('   ✅ Anon users can SELECT from view');
    console.log('   ✅ Login fallback should now work');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

createPublicLoginView();
