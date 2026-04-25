alter table public.topics
add column if not exists correct_sound_url text,
add column if not exists wrong_sound_url text,
add column if not exists answering_background_sound_url text;
