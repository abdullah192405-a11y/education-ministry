import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data: latest, error: err1 } = await supabase.from('challenge_sessions').select('*').order('created_at', { ascending: false }).limit(3);
    console.log("Latest:", latest);
    
    if (latest && latest.length > 0) {
        const pin = latest[0].pin;
        console.log("Lookup PIN:", pin);
        const { data, error } = await supabase.from('challenge_sessions').select('*, topic:topics(*)').eq('pin', pin).single();
        console.log("Lookup result:", data, error);
    }
}
test();
