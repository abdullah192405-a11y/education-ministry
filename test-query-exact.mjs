
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testUseGradesQuery() {
    console.log("--- Testing Exact useGrades Query ---");

    const { data, error } = await supabase
        .from("grades")
        .select(`
          *,
          subjects (*),
          student_profiles (id)
        `)
        .order("sort_order", { ascending: true });

    if (error) {
        console.error("Query Error:", error);
        return;
    }

    console.log(`Success! Found ${data?.length || 0} grades.`);
    data?.forEach(g => {
        console.log(`Grade: ${g.name}, Subjects: ${g.subjects?.length || 0}, Profiles: ${g.student_profiles?.length || 0}`);
    });
}

testUseGradesQuery();
