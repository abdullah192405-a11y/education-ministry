
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfiles() {
    console.log("--- Checking student_profiles Table ---");

    const { data: profiles, error } = await supabase
        .from('student_profiles')
        .select('*');

    if (error) {
        console.error("Error fetching profiles:", error);
        return;
    }

    console.log(`Found ${profiles?.length || 0} student profiles`);
    if (profiles && profiles.length > 0) {
        console.log("Sample Profile:", profiles[0]);
    }

    console.log("\n--- Checking challenge_results again ---");
    const { data: results } = await supabase
        .from('challenge_results')
        .select('user_id');
    console.log("Unique user_ids in results:", [...new Set(results?.map(r => r.user_id))]);

    pool.end();
}

checkProfiles();
