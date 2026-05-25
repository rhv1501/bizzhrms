-- Create notifications table to store system notifications
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  body text,
  type text,
  data jsonb,
  created_at timestamptz default now()
);

grant select, insert, update, delete on public.notifications to authenticated;

-- Sample seed (can be removed in production)
insert into public.notifications (title, body, type) values (
  'Welcome to BizzGrow HRMS',
  'Notifications are now enabled. You will receive alerts here and via browser push.',
  'system'
);
