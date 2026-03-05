
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugUsers() {
    console.log("--- Debugging Users and Profiles ---");

    const { data: users, error: uError } = await supabase.from('users').select('*');
    console.log(`Users count: ${users?.length || 0}`);

    const { data: profiles, error: pError } = await supabase.from('student_profiles').select('*');
    console.log(`Student Profiles count: ${profiles?.length || 0}`);

    if (profiles && profiles.length > 0) {
        console.log("Example Profile user_id:", profiles[0].user_id);
        const { data: userLink } = await supabase.from('users').select('*').eq('id', profiles[0].user_id).maybeSingle();
        console.log("Linked User record found:", !!userLink);
        if (userLink) console.log("User name:", userLink.name);
    }

    const { data: results } = await supabase.from('challenge_results').select('*, user:users(*)');
    console.log(`Challenge Results count: ${results?.length || 0}`);
    results?.forEach(r => {
        console.log(`Result ID: ${r.id}, User ID: ${r.user_id}, Linked User Name: ${r.user?.name || 'N/A'}`);
    });
}

debugUsers();
