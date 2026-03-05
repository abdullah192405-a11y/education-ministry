
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function fixPublicSchema() {
    try {
        console.log('🔧 Fixing public schema permissions for all users...\n');

        const commands = [
            // Grant usage on public schema
            'GRANT USAGE ON SCHEMA public TO anon;',
            'GRANT USAGE ON SCHEMA public TO authenticated;',
            'GRANT USAGE ON SCHEMA public TO postgres;',
            'GRANT USAGE ON SCHEMA public TO service_role;',

            // Grant access to ALL tables in public
            'GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;',
            'GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;',
            'GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;',

            // Ensure future tables are also accessible
            'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;',
            'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO authenticated;',
        ];

        for (const sql of commands) {
            try {
                await pool.query(sql);
                console.log(`✅ Success: ${sql}`);
            } catch (e) {
                console.log(`❌ Failed: ${sql} -> ${e.message}`);
            }
        }

        console.log('\n✅ Done!');
        pool.end();
    } catch (error) {
        console.error('❌ Fatal Error:', error.message);
        pool.end();
        process.exit(1);
    }
}

fixPublicSchema();
