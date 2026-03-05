import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: latest, error: err1 } = await supabase.from('challenge_sessions').select('*').order('created_at', { ascending: false }).limit(3);
  
  if (latest && latest.length > 0) {
      const pin = latest[0].pin;
      console.log(`Testing PIN: ${pin}`);
      
      // Test 1: Without topic join
      const { data: d1, error: e1 } = await supabase.from('challenge_sessions').select('*').eq('pin', pin).single();
      console.log("Without topic join:", !!d1, e1?.message);
      
      // Test 2: With topic join
      const { data: d2, error: e2 } = await supabase.from('challenge_sessions').select('*, topic:topics(*)').eq('pin', pin).single();
      console.log("With topic join:", !!d2, e2?.message);
  }
}

check();
