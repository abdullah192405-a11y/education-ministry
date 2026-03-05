import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: latest, error } = await supabase.from('challenge_sessions').select('*').order('created_at', { ascending: false }).limit(1);
  if (!latest || latest.length === 0) {
      console.log("No sessions found"); return;
  }
  const session = latest[0];
  console.log("Found session:", session.id);
  
  // Try subscribing
  const channel = supabase.channel(`session-${session.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_sessions' }, payload => {
          console.log("REALTIME EVENT RECEIVED!", payload);
      })
      .subscribe((status) => {
          console.log("Channel status:", status);
          if (status === 'SUBSCRIBED') {
              console.log("Subscribed! Now inserting a test player...");
              supabase.from('player_sessions').insert([{
                  session_id: session.id,
                  name: "Test Player",
                  is_host: false,
                  is_online: true
              }]).then(res => console.log("Insert result:", Boolean(res.data), res.error?.message));
          }
      });
      
  setTimeout(() => {
      console.log("Timeout reached, exiting...");
      process.exit(0);
  }, 5000);
}

check();
