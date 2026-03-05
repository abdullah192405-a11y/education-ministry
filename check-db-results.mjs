
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkResults() {
    console.log("--- Checking Challenge Results ---");

    const { data: results, error } = await supabase
        .from('challenge_results')
        .select(`
          *,
          user:users (name),
          session:challenge_sessions (
            topic:topics (title)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error fetching results:", error);
        return;
    }

    console.log(`Found ${results?.length || 0} recent results:`);
    results?.forEach(r => {
        console.log(`User: ${r.user?.name}, Topic: ${r.session?.topic?.title}, Score: ${r.score}%, Points: ${r.total_points}`);
    });

    console.log("\n--- Done ---");
}

checkResults();
