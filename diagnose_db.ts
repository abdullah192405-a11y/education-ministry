
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    console.log("--- Diagnostics Start (Topic Activities) ---");

    // 1. Get Teacher Ghadeer's info
    const { data: ghadeer } = await supabase
        .from('teacher_profiles')
        .select('*')
        .eq('user_id', 'a3cbb429-4e65-4ff8-8b41-e9ee80281884')
        .single();

    const gradeId = ghadeer?.grade_id;
    const subjectId = ghadeer?.subject_id;
    console.log(`Teacher Ghadeer: Grade=${gradeId}, Subject=${subjectId}`);

    // 2. Get Students in that grade
    const { data: students } = await supabase
        .from('student_profiles')
        .select('*, user:users(*)')
        .eq('grade_id', gradeId);

    console.log(`\nStudents in Grade (${students?.length || 0}):`);
    students?.forEach(s => console.log(`- ${s.user?.name} [ProfileID: ${s.id}] [UserID: ${s.user_id}]`));

    // 3. Get Topic Activities for these students
    const studentIds = students?.map(s => s.id) || [];
    const { data: activities } = await supabase
        .from('student_topic_activities')
        .select('*, topic:topics!inner(*)')
        .in('student_id', studentIds);

    console.log(`\nTopic Activities for these students (${activities?.length || 0}):`);
    activities?.forEach(a => {
        console.log(`- Activity: Student ${a.student_id}, Topic ${a.topic_id} (${a.topic?.title}), Score ${a.score}%, Completed: ${a.completed}`);
    });

    // 4. Check if any activities belong to the Teacher's subject
    if (activities && subjectId) {
        const subjectActivities = activities.filter((a: any) => a.topic?.subject_id === subjectId);
        console.log(`\nActivities for Teacher's Subject (${subjectActivities.length}):`);
    }

    console.log("\n--- Diagnostics End ---");
}

diagnose();
