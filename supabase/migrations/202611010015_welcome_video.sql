-- Welcome from the cruise director or hotel manager: one video link per property.
-- Tisonik stores only the link and the name shown. The video stays with the video host.
alter table public.hotel_stay_settings
  add column if not exists welcome_video_url text check (welcome_video_url is null or char_length(welcome_video_url) <= 300),
  add column if not exists welcome_from_name text check (welcome_from_name is null or char_length(welcome_from_name) <= 80),
  add column if not exists welcome_from_role text check (welcome_from_role is null or char_length(welcome_from_role) <= 60),
  add column if not exists welcome_note text check (welcome_note is null or char_length(welcome_note) <= 300);
