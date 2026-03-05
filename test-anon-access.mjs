
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing URL or Key");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAnon() {
    console.log("--- Testing Anon Access via Supabase Client ---");
    console.log("URL:", supabaseUrl);

    // Try grades
    const { data: grades, error: gError } = await supabase
        .from("grades")
        .select(`
          *,
          subjects (*),
          student_profiles (id)
        `)
        .order("sort_order", { ascending: true });

    if (gError) {
        console.error("Grades Query Error:", gError);
        console.log("Error details:", JSON.stringify(gError, null, 2));
    } else {
        console.log(`Successfully fetched ${grades?.length || 0} grades with anon key.`);
    }

    // Try a simple select to see if it's just the join
    const { data: simple, error: sError } = await supabase.from("grades").select("id, name");
    if (sError) {
        console.error("Simple Query Error:", sError);
    } else {
        console.log(`Simple query fetched ${simple?.length || 0} columns.`);
    }
}

testAnon();
