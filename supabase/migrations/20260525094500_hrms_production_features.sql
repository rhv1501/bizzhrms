alter table public.attendance
add column if not exists latitude numeric(10, 7),
add column if not exists longitude numeric(10, 7),
add column if not exists location_name text;

alter table public.settings
add column if not exists geolocation_enabled boolean not null default false,
add column if not exists browser_notifications_enabled boolean not null default true,
add column if not exists enforce_task_completion boolean not null default true,
add column if not exists updated_at timestamptz not null default now();

insert into public.settings (
    office_start_time,
    office_end_time,
    min_work_hours,
    allowed_clock_in_window_minutes,
    geolocation_enabled,
    browser_notifications_enabled,
    enforce_task_completion
)
select
    '09:00',
    '18:00',
    8,
    15,
    false,
    true,
    true
where not exists (
    select 1 from public.settings
);
