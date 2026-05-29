-- Create document signatures table
create table if not exists public.document_signatures (
    id uuid primary key default gen_random_uuid(),
    document_id uuid not null references public.documents(id) on delete cascade,
    user_id uuid not null references public.users(id) on delete cascade,
    signed_at timestamptz not null default now(),
    unique(document_id, user_id)
);

alter table public.document_signatures enable row level security;

create policy "Users can see their own signatures" on public.document_signatures for
select to authenticated using (
    user_id = auth.uid() or (select private.is_admin())
);

create policy "Users can insert their own signatures" on public.document_signatures for
insert to authenticated with check (
    user_id = auth.uid()
);

create policy "Admins can manage signatures" on public.document_signatures for
all to authenticated using (
    (select private.is_admin())
);
