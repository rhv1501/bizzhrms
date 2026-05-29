-- Drop employee read policies on documents
drop policy if exists "Users can read their own or company documents" on public.documents;

-- Create an explicit admin-only select policy just in case the ALL policy isn't sufficient for selects, 
-- but the existing "Admins can manage documents" (ALL) covers it. We drop the public read to lock it down.

-- Also drop employee signature policies
drop policy if exists "Users can see their own signatures" on public.document_signatures;
drop policy if exists "Users can insert their own signatures" on public.document_signatures;
