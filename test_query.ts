
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
    const gradeId = '01279548-2955-4859-a315-69332e8d6d67';
    const subjectId = '9bdf02df-06cd-4121-bf33-812075777e29';

    console.log("--- Query Test Start ---");

    const { data, error } = await supabase
        .from("student_subject_progress")
        .select(`
      *,
      student:student_profiles!inner(*)
    `)
        .eq("subject_id", subjectId)
        .eq("student.grade_id", gradeId);

    if (error) {
        console.error("Query Error:", error);
    } else {
        console.log(`Query returned ${data?.length || 0} records.`);
        data?.forEach(d => console.log(JSON.stringify(d, null, 2)));
    }

    // Also try with explicit table name if 'student' is wrong
    console.log("\n--- Attempting with explicit table name join ---");
    const { data: data2, error: error2 } = await supabase
        .from("student_subject_progress")
        .select(`
      *,
      student_profiles!inner(*)
    `)
        .eq("subject_id", subjectId)
        .eq("student_profiles.grade_id", gradeId);

    if (error2) {
        console.error("Query 2 Error:", error2);
    } else {
        console.log(`Query 2 returned ${data2?.length || 0} records.`);
    }

    console.log("--- Query Test End ---");
}

testQuery();
