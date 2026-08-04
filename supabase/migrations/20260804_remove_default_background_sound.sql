-- Remove the implicit default lesson background sound.
-- Blank/null legacy values should behave as "no sound".

UPDATE public.topics
SET answering_background_sound_url = '__none__'
WHERE answering_background_sound_url IS NULL
   OR btrim(answering_background_sound_url) = '';
