import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;

// Get the service role key from Supabase dashboard
// For now, we'll use a direct SQL insert via Supabase's REST API
const query = `
INSERT INTO public.users (email, name, role, verified, is_active, details, created_at, updated_at)
VALUES ('admin@gmail.com', 'Admin', 'ADMIN', true, true, 'System Administrator', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.badges (name, slug, icon, description, condition, is_active, created_at)
VALUES 
  ('مثالي', 'perfect', '⭐', '100% accuracy', 'Get 100% accuracy on a challenge', true, NOW()),
  ('خبير', 'expert', '🏆', 'High score', 'Score above 90% on 5 challenges', true, NOW()),
  ('متعلم', 'learner', '📚', 'Complete 10 challenges', 'Complete 10 challenges', true, NOW()),
  ('برق', 'lightning', '⚡', 'Speed demon', 'Answer 5 questions in under 30 seconds', true, NOW()),
  ('متسلسل', 'streak', '🔥', 'Long streak', 'Get 5 consecutive correct answers', true, NOW())
ON CONFLICT (slug) DO NOTHING;
`;

console.log('To insert admin data, please run:');
console.log('');
console.log('$ npm run seed');
console.log('');
console.log('Or insert manually using the SQL file:');
console.log('$ cat insert-data.sql');
console.log('');
console.log('Contact your Supabase admin to run the SQL script directly in the database.');
console.log('');
console.log('Admin credentials:');
console.log('  Email: admin@gmail.com');
console.log('  Password: 123456');
