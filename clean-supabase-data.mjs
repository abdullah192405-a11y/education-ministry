
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Tables to EXCLUDE from cleaning (preserved)
const PRESERVED_TABLES = [
  'users',
  'public_users',
  'student_profiles',
  'teacher_profiles',
  '_prisma_migrations',
  // Maybe also keep some system-level things if they aren't "data"
];

async function cleanData() {
  try {
    console.log("🔍 Fetching tables...");
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE';
    `);

    const allTables = res.rows.map(r => r.table_name);
    const tablesToClean = allTables.filter(t => !PRESERVED_TABLES.includes(t));

    if (tablesToClean.length === 0) {
      console.log("✅ No tables to clean.");
      return;
    }

    console.log("🧹 Tables to be cleaned (TRUNCATE CASCADE):");
    tablesToClean.forEach(t => console.log(` - ${t}`));

    // Construct the TRUNCATE command
    // Using CASCADE to handle foreign key dependencies automatically
    const truncateQuery = `TRUNCATE TABLE ${tablesToClean.map(t => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE;`;
    
    console.log("\n🚀 Executing clean...");
    await pool.query(truncateQuery);
    
    console.log("\n✨ Database cleaned successfully! (Preserved: users, profiles, auth)");
  } catch (error) {
    console.error("❌ Error cleaning database:", error);
  } finally {
    await pool.end();
  }
}

cleanData();
