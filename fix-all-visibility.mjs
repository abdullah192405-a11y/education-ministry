
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function fixRLS() {
    try {
        console.log('🔧 Fixing RLS for all educational tables...\n');

        const tables = [
            'grades',
            'subjects',
            'topics',
            'challenge_results',
            'challenge_questions',
            'challenge_sessions',
            'player_sessions',
            'student_profiles',
            'users'
        ];

        for (const table of tables) {
            try {
                await pool.query(`ALTER TABLE public."${table}" DISABLE ROW LEVEL SECURITY;`);
                console.log(`✅ ${table}: RLS disabled`);

                await pool.query(`GRANT SELECT ON public."${table}" TO anon;`);
                await pool.query(`GRANT SELECT ON public."${table}" TO authenticated;`);
                console.log(`✅ ${table}: SELECT granted to anon/authenticated`);
            } catch (e) {
                console.log(`ℹ️  ${table}: ${e.message.split('\n')[0]}`);
            }
        }

        console.log('\n✅ Done!');
        pool.end();
    } catch (error) {
        console.error('❌ Error:', error.message);
        pool.end();
        process.exit(1);
    }
}

fixRLS();
