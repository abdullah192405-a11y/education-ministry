import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from('topics')
    .select(`
      id,
      title,
      views,
      activities:student_topic_activities(id)
    `)
    .limit(1);
    
  console.log(JSON.stringify(data?.[0], null, 2));
  if (error) console.error(error);
}
test();
