#!/usr/bin/env node

import pkg from 'pg';
const { Client } = pkg;
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Missing DATABASE_URL in .env');
  process.exit(1);
}

const client = new Client({
  connectionString: 'postgresql://postgres.hnlnkpscitcjuudtesvs:qBjeSFUX4fk4En36@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=verify-full&connect_timeout=30',
});

async function insertAdminData() {
  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Check if admin already exists
    const existingAdmin = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ['admin@gmail.com']
    );

    if (existingAdmin.rows.length > 0) {
      console.log('✅ Admin user already exists');
      await client.end();
      return;
    }

    // Insert admin user
    const adminResult = await client.query(
      `INSERT INTO users (email, name, role, verified, is_active, details, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id, email, role`,
      ['admin@gmail.com', 'Admin', 'ADMIN', true, true, 'System Administrator']
    );

    const admin = adminResult.rows[0];
    console.log('✅ Admin user created successfully:');
    console.log('   Email: admin@gmail.com');
    console.log('   Password: 123456');
    console.log('   ID:', admin.id);
    console.log('   Role:', admin.role);

    // Insert sample badges
    const badges = [
      ['مثالي', 'perfect', '⭐', '100% accuracy', 'Get 100% accuracy on a challenge'],
      ['خبير', 'expert', '🏆', 'High score', 'Score above 90% on 5 challenges'],
      ['متعلم', 'learner', '📚', 'Complete 10 challenges', 'Complete 10 challenges'],
      ['برق', 'lightning', '⚡', 'Speed demon', 'Answer 5 questions in under 30 seconds'],
      ['متسلسل', 'streak', '🔥', 'Long streak', 'Get 5 consecutive correct answers'],
    ];

    console.log('\n🌱 Inserting badges...');
    for (const [name, slug, icon, description, condition] of badges) {
      const existingBadge = await client.query(
        'SELECT id FROM badges WHERE slug = $1',
        [slug]
      );

      if (existingBadge.rows.length === 0) {
        await client.query(
          `INSERT INTO badges (name, slug, icon, description, condition, is_active, created_at)
           VALUES ($1, $2, $3, $4, $5, true, NOW())`,
          [name, slug, icon, description, condition]
        );
        console.log(`   ✅ Created badge: ${name}`);
      } else {
        console.log(`   ⏭️  Badge already exists: ${name}`);
      }
    }

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📝 Login credentials:');
    console.log('   Email: admin@gmail.com');
    console.log('   Password: 123456');

    await client.end();
  } catch (error) {
    console.error('❌ Error during seeding:', error.message);
    process.exit(1);
  }
}

insertAdminData();
