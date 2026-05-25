-- Add optional user_id to notifications for targeting
alter table if exists public.notifications
  add column if not exists user_id uuid references auth.users(id) on delete set null;

grant select, insert, update, delete on public.notifications to authenticated;
