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
  ('متسلسل', 'streak', '🔥', 'Long streak', 'Get 5 consecutive correct answers', true, NOW()),
  ('سريع التعلم', 'quick_learner', '🧠', 'Finish under 2 minutes', 'Complete a challenge in under 2 minutes', true, NOW())
ON CONFLICT (slug) DO NOTHING;
