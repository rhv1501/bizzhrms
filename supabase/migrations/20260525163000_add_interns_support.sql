alter table "public"."users" 
add column if not exists "employee_type" text not null default 'full-time' check (employee_type in ('full-time', 'intern'));

alter table "public"."settings"
add column if not exists "min_intern_work_hours" numeric not null default 4;
