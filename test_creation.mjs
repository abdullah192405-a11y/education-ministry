import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: latest, error } = await supabase.from('challenge_sessions').select('*').order('created_at', { ascending: false }).limit(5);
  console.log("LATEST SESSIONS PINS:", latest?.map(s => s.pin));
  
  // Let's see if any have been created in the last few minutes
  const recent = latest?.filter(s => {
    const d = new Date(s.created_at);
    const now = new Date();
    return (now - d) < 1000 * 60 * 15; // 15 mins
  });
  console.log("RECENT PINS:", recent?.map(s => `${s.pin} (status: ${s.status})`));
}

check();
