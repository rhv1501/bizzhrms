-- Allow all authenticated users to read all profiles
drop policy if exists "Users can read their profile or admin can read all" on public.users;

create policy "All users can read all profiles" on public.users for
select to authenticated using (true);

-- Allow all authenticated users to create tasks
drop policy if exists "Admins can create tasks" on public.tasks;

create policy "All users can create tasks" on public.tasks for
insert to authenticated with check (true);
