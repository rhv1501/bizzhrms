-- Create table to store web-push subscriptions per user
create table if not exists public.push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  endpoint text not null,
  keys jsonb not null,
  created_at timestamptz default now()
);

grant select, insert, update, delete on public.push_subscriptions to authenticated;
