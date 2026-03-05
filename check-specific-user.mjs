
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
    const email = 'alhwyji2001@gmail.com';
    console.log(`Checking for user with email: ${email}`);

    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

    if (error) {
        console.error('Error fetching user:', error);
        return;
    }

    if (user) {
        console.log('User found:');
        console.log(JSON.stringify(user, null, 2));
    } else {
        console.log('User not found in the "users" table.');
    }
}

checkUser();
