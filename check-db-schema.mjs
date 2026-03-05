
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log("--- Checking challenge_results Table ---");

    const { data: results, error } = await supabase
        .from('challenge_results')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error fetching results:", error);
        return;
    }

    if (results && results.length > 0) {
        console.log("Columns:", Object.keys(results[0]));
        console.log("Sample Data:", results[0]);
    } else {
        console.log("No data found in challenge_results");
    }

    console.log("\n--- Checking users Table ---");
    const { data: users, error: uError } = await supabase
        .from('users')
        .select('*')
        .limit(1);

    if (uError) {
        console.error("Error fetching users:", uError);
    } else {
        console.log(`Found ${users?.length || 0} users`);
        if (users && users.length > 0) {
            console.log("Columns:", Object.keys(users[0]));
            // console.log("Sample Data:", users[0]);
        }
    }

    console.log("\n--- Checking student_profiles Table ---");
    const { data: profiles, error: prError } = await supabase
        .from('student_profiles')
        .select('*');

    if (prError) {
        console.error("Error fetching profiles:", prError);
    } else {
        console.log(`Found ${profiles?.length || 0} student profiles`);
    }

    console.log("\n--- Done ---");
}

checkSchema();
