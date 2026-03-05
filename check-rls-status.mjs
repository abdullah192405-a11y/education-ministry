
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function checkRLS() {
    const tables = ['grades', 'subjects', 'topics', 'student_profiles'];
    console.log("--- Checking RLS Status ---");
    for (const table of tables) {
        const res = await pool.query(`
      SELECT relname, relrowsecurity 
      FROM pg_class 
      WHERE relname = $1 AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    `, [table]);

        if (res.rows.length > 0) {
            console.log(`Table ${table}: RLS is ${res.rows[0].relrowsecurity ? 'ENABLED' : 'DISABLED'}`);
        } else {
            console.log(`Table ${table}: NOT FOUND`);
        }
    }

    console.log("\n--- Checking Grants for 'anon' ---");
    for (const table of tables) {
        const res = await pool.query(`
      SELECT grantee, privilege_type
      FROM information_schema.role_table_grants
      WHERE table_name = $1 AND grantee = 'anon';
    `, [table]);
        console.log(`Table ${table} grants for 'anon':`, res.rows.map(r => r.privilege_type).join(', ') || 'NONE');
    }

    pool.end();
}

checkRLS();
