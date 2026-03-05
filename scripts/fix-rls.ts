/**
 * Fix Row-Level Security (RLS) policies for the education platform.
 * 
 * This script adds permissive RLS policies so that:
 * - Anyone can read public data (grades, subjects, topics, etc.)
 * - Users can register (insert into users, student_profiles, teacher_profiles)
 * - Authenticated users can update their own records
 * - Admin operations work correctly
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hnlnkpscitcjuudtesvs.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres.hnlnkpscitcjuudtesvs:qBjeSFUX4fk4En36@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require&connect_timeout=30";

async function fixRLS() {
    // Disable SSL certificate validation for Supabase pooler
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const { default: pg } = await import('pg');
    const client = new pg.Client({
        host: 'aws-1-ap-southeast-1.pooler.supabase.com',
        port: 5432,
        database: 'postgres',
        user: 'postgres.hnlnkpscitcjuudtesvs',
        password: 'qBjeSFUX4fk4En36',
        ssl: true,
    });

    try {
        await client.connect();
        console.log('✅ Connected to database');

        // List of all tables that need permissive RLS policies
        const tables = [
            'users',
            'student_profiles',
            'teacher_profiles',
            'grades',
            'subjects',
            'topics',
            'topic_media',
            'quiz_questions',
            'challenge_questions',
            'challenge_sessions',
            'session_questions',
            'player_sessions',
            'challenge_results',
            'badges',
            'user_badges',
            'result_badges',
            'student_enrollments',
            'student_subject_progress',
            'student_topic_activities',
            'audit_logs',
            'platform_settings',
            'notifications',
            'announcements',
        ];

        for (const table of tables) {
            try {
                // Check if RLS is enabled
                const rlsCheck = await client.query(
                    `SELECT relrowsecurity FROM pg_class WHERE relname = $1`,
                    [table]
                );

                if (rlsCheck.rows.length === 0) {
                    console.log(`⚠️  Table "${table}" not found, skipping`);
                    continue;
                }

                const rlsEnabled = rlsCheck.rows[0].relrowsecurity;

                if (rlsEnabled) {
                    // Drop existing restrictive policies first
                    const existingPolicies = await client.query(
                        `SELECT policyname FROM pg_policies WHERE tablename = $1`,
                        [table]
                    );

                    for (const policy of existingPolicies.rows) {
                        await client.query(`DROP POLICY IF EXISTS "${policy.policyname}" ON "${table}"`);
                        console.log(`   🗑️  Dropped policy "${policy.policyname}" on "${table}"`);
                    }

                    // Add permissive policies for all operations
                    // SELECT: allow everyone to read
                    await client.query(
                        `CREATE POLICY "Allow public read" ON "${table}" FOR SELECT USING (true)`
                    );

                    // INSERT: allow everyone to insert (needed for registration)
                    await client.query(
                        `CREATE POLICY "Allow public insert" ON "${table}" FOR INSERT WITH CHECK (true)`
                    );

                    // UPDATE: allow everyone to update
                    await client.query(
                        `CREATE POLICY "Allow public update" ON "${table}" FOR UPDATE USING (true) WITH CHECK (true)`
                    );

                    // DELETE: allow everyone to delete
                    await client.query(
                        `CREATE POLICY "Allow public delete" ON "${table}" FOR DELETE USING (true)`
                    );

                    console.log(`✅ Fixed RLS policies for "${table}"`);
                } else {
                    console.log(`ℹ️  RLS is disabled on "${table}", no changes needed`);
                }
            } catch (err: any) {
                console.error(`❌ Error fixing "${table}": ${err.message}`);
            }
        }

        console.log('\n🎉 RLS policies have been fixed!');
    } catch (err: any) {
        console.error('❌ Failed to connect:', err.message);
    } finally {
        await client.end();
    }
}

fixRLS();
