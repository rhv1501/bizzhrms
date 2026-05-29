-- Migration to adjust attendance constraint to allow 'Present'
alter table public.attendance drop constraint if exists attendance_status_check;
alter table public.attendance add constraint attendance_status_check check (status in ('Late', 'On Time', 'Half Day', 'Absent', 'Present'));

-- Update existing "On Time" and "Late" rows to "Present"
update public.attendance set status = 'Present' where status in ('On Time', 'Late');

-- Create an edge function trigger or pg_cron job for the 12 PM push
-- (Since pg_cron extension needs superuser, we wrap it in a DO block to fail silently if unsupported)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'attendance-reminder-12pm',
      '0 12 * * 1-5', -- Mon-Fri at 12:00 PM
      $cron$
        insert into public.notifications (user_id, title, body, type)
        select id, 'Daily Reminder', 'Please make sure to log your work hours today!', 'attendance'
        from public.users
        where role != 'admin'
      $cron$
    );
  end if;
end $$;
