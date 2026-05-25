create extension if not exists "pgcrypto";

create schema if not exists private;

create table if not exists public.users (
    id uuid primary key,
    email text not null unique,
    role text not null default 'employee' check (role in ('admin', 'employee')),
    full_name text,
    department text,
    created_at timestamptz not null default now()
);

create table if not exists public.attendance (
    id uuid primary key default gen_random_uuid (),
    user_id uuid not null references public.users (id) on delete cascade,
    date date not null,
    clock_in_time timestamptz,
    clock_out_time timestamptz,
    status text check (
        status in (
            'Late',
            'On Time',
            'Half Day',
            'Absent'
        )
    ),
    created_at timestamptz not null default now(),
    unique (user_id, date)
);

create table if not exists public.tasks (
    id uuid primary key default gen_random_uuid (),
    user_id uuid not null references public.users (id) on delete cascade,
    title text not null,
    description text,
    priority text not null default 'Medium' check (
        priority in ('Low', 'Medium', 'High')
    ),
    status text not null default 'pending' check (
        status in (
            'pending',
            'in_progress',
            'completed'
        )
    ),
    deadline date,
    created_at timestamptz not null default now()
);

create table if not exists public.leaves (
    id uuid primary key default gen_random_uuid (),
    user_id uuid not null references public.users (id) on delete cascade,
    leave_type text not null,
    reason text,
    start_date date not null,
    end_date date not null,
    status text not null default 'pending' check (
        status in (
            'pending',
            'approved',
            'rejected'
        )
    ),
    applied_at timestamptz not null default now()
);

create table if not exists public.settings (
    id uuid primary key default gen_random_uuid (),
    office_start_time time not null default '09:00',
    office_end_time time not null default '18:00',
    min_work_hours numeric(4, 2) not null default 8,
    allowed_clock_in_window_minutes integer not null default 30
);

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth, extensions
as $$
	select exists (
		select 1
		from public.users u
		where u.id = auth.uid()
			and u.role = 'admin'
	);
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
	insert into public.users (id, email, role, full_name, department, created_at)
	values (
		new.id,
		new.email,
		case when lower(new.email) = 'admin@hrms.local' then 'admin' else 'employee' end,
		coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), initcap(split_part(new.email, '@', 1))),
		coalesce(nullif(new.raw_user_meta_data ->> 'department', ''), 'General'),
		coalesce(new.created_at, now())
	)
	on conflict (id) do update
		set email = excluded.email,
				role = excluded.role,
				full_name = excluded.full_name,
				department = excluded.department;

	return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.users enable row level security;

alter table public.attendance enable row level security;

alter table public.tasks enable row level security;

alter table public.leaves enable row level security;

alter table public.settings enable row level security;

alter table public.users replica identity full;

alter table public.attendance replica identity full;

alter table public.tasks replica identity full;

alter table public.leaves replica identity full;

alter table public.settings replica identity full;

grant usage on schema public to authenticated, service_role;

grant usage on schema private to authenticated, service_role;

grant
select,
insert
,
update,
delete on public.users to authenticated,
service_role;

grant
select,
insert
,
update,
delete on public.attendance to authenticated,
service_role;

grant
select,
insert
,
update,
delete on public.tasks to authenticated,
service_role;

grant
select,
insert
,
update,
delete on public.leaves to authenticated,
service_role;

grant
select,
insert
,
update,
delete on public.settings to authenticated,
service_role;

grant
execute on function private.is_admin () to authenticated,
service_role;

grant execute on function public.handle_new_user () to service_role;

create policy "Users can read their profile or admin can read all" on public.users for
select to authenticated using (
        (
            select auth.uid ()
        ) = id
        or (
            select private.is_admin ()
        )
    );

create policy "Users can update their profile or admin can update all" on public.users for
update to authenticated using (
    (
        select auth.uid ()
    ) = id
    or (
        select private.is_admin ()
    )
)
with
    check (
        (
            select auth.uid ()
        ) = id
        or (
            select private.is_admin ()
        )
    );

create policy "Admins can manage user profiles" on public.users for
insert
    to authenticated
with
    check (
        (
            select private.is_admin ()
        )
    );

create policy "Users can view their attendance or admin can view all" on public.attendance for
select to authenticated using (
        (
            select auth.uid ()
        ) = user_id
        or (
            select private.is_admin ()
        )
    );

create policy "Users can insert their attendance or admin can insert all" on public.attendance for
insert
    to authenticated
with
    check (
        (
            select auth.uid ()
        ) = user_id
        or (
            select private.is_admin ()
        )
    );

create policy "Users can update their attendance or admin can update all" on public.attendance for
update to authenticated using (
    (
        select auth.uid ()
    ) = user_id
    or (
        select private.is_admin ()
    )
)
with
    check (
        (
            select auth.uid ()
        ) = user_id
        or (
            select private.is_admin ()
        )
    );

create policy "Admins can delete attendance rows" on public.attendance for delete to authenticated using (
    (
        select private.is_admin ()
    )
);

create policy "Users can view their tasks or admin can view all" on public.tasks for
select to authenticated using (
        (
            select auth.uid ()
        ) = user_id
        or (
            select private.is_admin ()
        )
    );

create policy "Admins can create tasks" on public.tasks for
insert
    to authenticated
with
    check (
        (
            select private.is_admin ()
        )
    );

create policy "Users can update their tasks or admin can update all" on public.tasks for
update to authenticated using (
    (
        select auth.uid ()
    ) = user_id
    or (
        select private.is_admin ()
    )
)
with
    check (
        (
            select auth.uid ()
        ) = user_id
        or (
            select private.is_admin ()
        )
    );

create policy "Admins can delete tasks" on public.tasks for delete to authenticated using (
    (
        select private.is_admin ()
    )
);

create policy "Users can view their leaves or admin can view all" on public.leaves for
select to authenticated using (
        (
            select auth.uid ()
        ) = user_id
        or (
            select private.is_admin ()
        )
    );

create policy "Users can request leave or admin can request leave" on public.leaves for
insert
    to authenticated
with
    check (
        (
            select auth.uid ()
        ) = user_id
        or (
            select private.is_admin ()
        )
    );

create policy "Admins can approve or reject leaves" on public.leaves for
update to authenticated using (
    (
        select private.is_admin ()
    )
)
with
    check (
        (
            select private.is_admin ()
        )
    );

create policy "Admins can delete leaves" on public.leaves for delete to authenticated using (
    (
        select private.is_admin ()
    )
);

create policy "Authenticated users can read settings" on public.settings for
select to authenticated using (true);

create policy "Admins can manage settings" on public.settings for
insert
    to authenticated
with
    check (
        (
            select private.is_admin ()
        )
    );

create policy "Admins can update settings" on public.settings for
update to authenticated using (
    (
        select private.is_admin ()
    )
)
with
    check (
        (
            select private.is_admin ()
        )
    );

create policy "Admins can delete settings" on public.settings for delete to authenticated using (
    (
        select private.is_admin ()
    )
);

create index if not exists users_role_idx on public.users (role);

create index if not exists attendance_user_date_idx on public.attendance (user_id, date desc);

create index if not exists attendance_status_idx on public.attendance (status);

create index if not exists tasks_user_created_idx on public.tasks (user_id, created_at desc);

create index if not exists tasks_status_idx on public.tasks (status);

create index if not exists leaves_user_applied_idx on public.leaves (user_id, applied_at desc);

create index if not exists leaves_status_idx on public.leaves (status);

alter publication supabase_realtime add table public.users;

alter publication supabase_realtime add table public.attendance;

alter publication supabase_realtime add table public.tasks;

alter publication supabase_realtime add table public.leaves;

alter publication supabase_realtime add table public.settings;

insert into
    public.settings (
        id,
        office_start_time,
        office_end_time,
        min_work_hours,
        allowed_clock_in_window_minutes
    )
values (
        '00000000-0000-0000-0000-000000000001',
        '09:00',
        '18:00',
        8,
        30
    ) on conflict (id) do
update
set
    office_start_time = excluded.office_start_time,
    office_end_time = excluded.office_end_time,
    min_work_hours = excluded.min_work_hours,
    allowed_clock_in_window_minutes = excluded.allowed_clock_in_window_minutes;