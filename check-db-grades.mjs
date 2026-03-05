
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGrades() {
    console.log("--- Checking Grades Table ---");

    const { data: grades, error } = await supabase
        .from('grades')
        .select(`
          *,
          subjects (*)
        `)
        .order('sort_order', { ascending: true });

    if (error) {
        console.error("Error fetching grades:", error);
        return;
    }

    if (grades && grades.length > 0) {
        console.log("Columns:", Object.keys(grades[0]));
    }
    grades?.forEach(g => {
        console.log(`ID: ${g.id}, Name: ${g.name}, Slug: ${g.slug}, Sort Order: ${g.sort_order}, Level: ${g.level}, Verified: ${g.verified}, Active: ${g.is_active}`);
        console.log(`  Subjects Count: ${g.subjects?.length || 0}`);
    });

    console.log("\n--- Checking Student Profiles ---");
    const { data: profiles, error: pError } = await supabase
        .from('student_profiles')
        .select('*');

    if (pError) {
        console.error("Error fetching student profiles:", pError);
    } else {
        console.log(`Found ${profiles?.length || 0} student profiles`);
    }

    console.log("\n--- Done ---");
}

checkGrades();
