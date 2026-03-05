#!/usr/bin/env node

// This script inserts admin data into the Supabase database
// It uses the PostgreSQL connection string directly

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  statement_timeout: 30000,
});

async function insertAdminData() {
  let client;
  try {
    client = await pool.connect();
    console.log('🌱 Connected to database');

    // Check if admin already exists
    const existing = await client.query(
      'SELECT id, email FROM users WHERE email = $1 LIMIT 1',
      ['admin@gmail.com']
    );

    if (existing.rows.length > 0) {
      console.log('✅ Admin user already exists');
      console.log('   ID:', existing.rows[0].id);
      console.log('   Email:', existing.rows[0].email);
    } else {
      // Insert admin user
      const result = await client.query(
        `INSERT INTO users (email, name, role, verified, is_active, details, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING id, email, role`,
        ['admin@gmail.com', 'Admin', 'ADMIN', true, true, 'System Administrator']
      );

      const admin = result.rows[0];
      console.log('✅ Admin user created:');
      console.log('   ID:', admin.id);
      console.log('   Email:', admin.email);
      console.log('   Role:', admin.role);
    }

    // Insert badges
    const badges = [
      ['مثالي', 'perfect', '⭐', '100% accuracy', 'Get 100% accuracy on a challenge'],
      ['خبير', 'expert', '🏆', 'High score', 'Score above 90% on 5 challenges'],
      ['متعلم', 'learner', '📚', 'Complete 10 challenges', 'Complete 10 challenges'],
      ['برق', 'lightning', '⚡', 'Speed demon', 'Answer 5 questions in under 30 seconds'],
      ['متسلسل', 'streak', '🔥', 'Long streak', 'Get 5 consecutive correct answers'],
    ];

    console.log('\n🌱 Processing badges...');
    let created = 0;
    let skipped = 0;

    for (const [name, slug, icon, description, condition] of badges) {
      const check = await client.query(
        'SELECT id FROM badges WHERE slug = $1 LIMIT 1',
        [slug]
      );

      if (check.rows.length === 0) {
        await client.query(
          `INSERT INTO badges (name, slug, icon, description, condition, is_active, created_at)
           VALUES ($1, $2, $3, $4, $5, true, NOW())`,
          [name, slug, icon, description, condition]
        );
        console.log(`   ✅ Created badge: ${name}`);
        created++;
      } else {
        console.log(`   ⏭️  Badge exists: ${name}`);
        skipped++;
      }
    }

    console.log(`\n✅ Setup completed!`);
    console.log(`   Badges: ${created} created, ${skipped} already exist`);
    console.log('\n📝 Admin credentials:');
    console.log('   Email: admin@gmail.com');
    console.log('   Password: 123456');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Cannot connect to database. Check DATABASE_URL in .env');
    }
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

insertAdminData();
