-- Create an edge function trigger or pg_cron job for the auto clock-out
-- (Since pg_cron extension needs superuser, we wrap it in a DO block to fail silently if unsupported)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'auto-clock-out-midnight',
      '59 23 * * *', -- 23:59 every day
      $cron$
        update public.attendance a
        set clock_out_time = a.clock_in_time + interval '1 hour' * coalesce(
          (case
            when u.employee_type = 'intern' then s.min_intern_work_hours
            else s.min_work_hours
          end),
          8.0
        )
        from public.users u
        cross join (select * from public.settings limit 1) s
        where a.user_id = u.id
          and a.clock_out_time is null
          and a.clock_in_time is not null
          and a.date = current_date;
      $cron$
    );
  end if;
end $$;
