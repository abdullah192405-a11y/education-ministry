#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function insertAdmin() {
  try {
    console.log('🌱 Inserting admin user...');

    // Check if admin already exists
    const { data: existingAdmin } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'admin@gmail.com')
      .single();

    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      return;
    }

    // Insert admin user
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          email: 'admin@gmail.com',
          name: 'Admin',
          role: 'ADMIN',
          verified: true,
          is_active: true,
          details: 'System Administrator',
        },
      ])
      .select();

    if (error) {
      console.error('❌ Error inserting admin user:', error);
      process.exit(1);
    }

    console.log('✅ Admin user created successfully:');
    console.log('   Email: admin@gmail.com');
    console.log('   Password: 123456');
    console.log('   ID:', data[0]?.id);
    console.log('   Role: ADMIN');

    // Insert sample badges
    const badges = [
      {
        name: 'مثالي',
        slug: 'perfect',
        icon: '⭐',
        description: '100% accuracy',
        condition: 'Get 100% accuracy on a challenge',
        is_active: true,
      },
      {
        name: 'خبير',
        slug: 'expert',
        icon: '🏆',
        description: 'High score',
        condition: 'Score above 90% on 5 challenges',
        is_active: true,
      },
      {
        name: 'متعلم',
        slug: 'learner',
        icon: '📚',
        description: 'Complete 10 challenges',
        condition: 'Complete 10 challenges',
        is_active: true,
      },
      {
        name: 'برق',
        slug: 'lightning',
        icon: '⚡',
        description: 'Speed demon',
        condition: 'Answer 5 questions in under 30 seconds',
        is_active: true,
      },
      {
        name: 'متسلسل',
        slug: 'streak',
        icon: '🔥',
        description: 'Long streak',
        condition: 'Get 5 consecutive correct answers',
        is_active: true,
      },
    ];

    console.log('\n🌱 Inserting badges...');
    for (const badge of badges) {
      const { data: existingBadge } = await supabase
        .from('badges')
        .select('id')
        .eq('slug', badge.slug)
        .single();

      if (!existingBadge) {
        await supabase.from('badges').insert([badge]);
        console.log(`   ✅ Created badge: ${badge.name}`);
      } else {
        console.log(`   ⏭️  Badge already exists: ${badge.name}`);
      }
    }

    console.log('\n✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
}

insertAdmin();
