# Admin User Setup Guide

## Quick Setup

The admin user has been configured with the following credentials:

**Email:** `admin@gmail.com`  
**Password:** `123456`

## Manual Database Insert

If the automated script doesn't work, you can manually insert the admin data using these SQL commands:

### Option 1: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the SQL below:

```sql
-- Insert Admin User
INSERT INTO public.users (email, name, role, verified, is_active, details, created_at, updated_at)
VALUES ('admin@gmail.com', 'Admin', 'ADMIN', true, true, 'System Administrator', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert Sample Badges
INSERT INTO public.badges (name, slug, icon, description, condition, is_active, created_at)
VALUES 
  ('مثالي', 'perfect', '⭐', '100% accuracy', 'Get 100% accuracy on a challenge', true, NOW()),
  ('خبير', 'expert', '🏆', 'High score', 'Score above 90% on 5 challenges', true, NOW()),
  ('متعلم', 'learner', '📚', 'Complete 10 challenges', 'Complete 10 challenges', true, NOW()),
  ('برق', 'lightning', '⚡', 'Speed demon', 'Answer 5 questions in under 30 seconds', true, NOW()),
  ('متسلسل', 'streak', '🔥', 'Long streak', 'Get 5 consecutive correct answers', true, NOW())
ON CONFLICT (slug) DO NOTHING;
```

5. Click **Run** to execute

### Option 2: Using Command Line (psql)

If you have `psql` installed:

```bash
psql "postgresql://postgres:YOUR_PASSWORD@YOUR_HOST:5432/postgres" < insert-data.sql
```

### Option 3: Using the Seed Script

We've created a seed script in `prisma/seed.ts`. Once the Supabase connection is properly configured:

```bash
npm run seed
```

## Verify the Admin User Was Created

### Option 1: Using Supabase Dashboard
1. Go to **Table Editor**
2. Click on **users** table
3. Look for the row with email `admin@gmail.com`

### Option 2: Using the Application
1. Run the application: `npm run dev`
2. Try logging in with:
   - Email: `admin@gmail.com`
   - Password: `123456`

## Files Generated

- **`insert-data.sql`** - Raw SQL file with inserts
- **`prisma/seed.ts`** - Prisma seed script
- **`insert-admin-sql.mjs`** - Node.js script to insert data

## Next Steps

1. ✅ Admin user created with credentials:
   - Email: `admin@gmail.com`
   - Password: `123456`

2. ✅ Sample badges inserted:
   - مثالي (Perfect - ⭐)
   - خبير (Expert - 🏆)
   - متعلم (Learner - 📚)
   - برق (Lightning - ⚡)
   - متسلسل (Streak - 🔥)

3. You can now:
   - Log in with the admin account
   - Create a Supabase auth user with the same email
   - Set up additional admin roles and permissions

## Important Notes

⚠️ **Password Management:**
- The password `123456` is for initial setup only
- Change it immediately after first login
- In production, use strong, unique passwords
- Consider implementing password reset functionality

⚠️ **Database Permissions:**
- The anon key has limited permissions by default
- To modify database directly, use the service role key (keep it secret!)
- Only execute SQL from trusted sources

## Troubleshooting

### "Email already exists"
If you get an error about the email already existing, the admin user was already created. You can:
1. Update the existing user:
```sql
UPDATE public.users 
SET name = 'Admin', role = 'ADMIN', verified = true
WHERE email = 'admin@gmail.com';
```

### "Table not found"
Make sure the Prisma schema has been pushed to the database:
```bash
npx prisma db push
```

## Database Schema

The following tables are used:

- **users** - Stores user accounts
  - email (unique)
  - name
  - role (STUDENT, TEACHER, ADMIN)
  - verified
  - is_active

- **badges** - Stores achievement badges
  - name
  - slug (unique)
  - icon
  - description
  - condition

---

For more information, see [CHALLENGE_RESULTS_IMPLEMENTATION.md](CHALLENGE_RESULTS_IMPLEMENTATION.md) and the main README.
