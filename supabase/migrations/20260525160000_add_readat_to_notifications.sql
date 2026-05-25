-- Add read_at timestamp to notifications for marking read/unread
alter table if exists public.notifications
  add column if not exists read_at timestamptz null;

grant select, insert, update on public.notifications to authenticated;
