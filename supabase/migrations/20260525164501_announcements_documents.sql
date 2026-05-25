-- Create announcements table
create table if not exists public.announcements (
    id uuid primary key default gen_random_uuid(),
    author_id uuid not null references public.users(id) on delete cascade,
    title text not null,
    content text not null,
    type text not null default 'general' check (type in ('general', 'update', 'win', 'holiday')),
    created_at timestamptz not null default now()
);

alter table public.announcements enable row level security;

create policy "All users can read announcements" on public.announcements for
select to authenticated using (true);

create policy "Admins can manage announcements" on public.announcements for
all to authenticated using (
    (select private.is_admin())
);

-- Create documents table
create table if not exists public.documents (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.users(id) on delete cascade, -- null means company policy
    title text not null,
    file_url text not null,
    created_at timestamptz not null default now()
);

alter table public.documents enable row level security;

create policy "Users can read their own or company documents" on public.documents for
select to authenticated using (
    user_id is null or user_id = auth.uid() or (select private.is_admin())
);

create policy "Admins can manage documents" on public.documents for
all to authenticated using (
    (select private.is_admin())
);

-- Create storage bucket if not exists (using Supabase storage functions if possible, otherwise we rely on the app to upload via API)
-- Note: inserting into storage schema requires superuser or correct grants, which Supabase migration runner usually has.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

create policy "Authenticated users can read documents" on storage.objects for
select to authenticated using (bucket_id = 'documents');

create policy "Admins can upload documents" on storage.objects for
insert to authenticated with check (
    bucket_id = 'documents' and (select private.is_admin())
);

create policy "Admins can update documents" on storage.objects for
update to authenticated using (
    bucket_id = 'documents' and (select private.is_admin())
);

create policy "Admins can delete documents" on storage.objects for
delete to authenticated using (
    bucket_id = 'documents' and (select private.is_admin())
);

-- Enable realtime for announcements
alter publication supabase_realtime add table public.announcements;
