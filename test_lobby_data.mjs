import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: latestSessions, error: sErr } = await supabase.from('challenge_sessions').select('*').order('created_at', { ascending: false }).limit(3);
    if (sErr) {
        console.error("Session fetch error:", sErr);
        return;
    }

    if (!latestSessions || latestSessions.length === 0) {
        console.log("No sessions found");
        return;
    }

    for (const session of latestSessions) {
        console.log("Session:", session.id, "PIN:", session.pin, "Created:", session.created_at);
        const { data: players, error: pErr } = await supabase.from('player_sessions').select('*').eq('session_id', session.id);
        if (pErr) console.error("Player fetch error:", pErr);
        else console.log("  Players attached:", players.length, players);
    }
}

check();
