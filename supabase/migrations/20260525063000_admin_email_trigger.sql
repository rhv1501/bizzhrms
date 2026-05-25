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
		case when lower(new.email) = 'bizzgrowlabs@gmail.com' then 'admin' else 'employee' end,
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