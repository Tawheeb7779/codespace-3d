-- Project Assets (Forge IDE spec §feature 14): a private Supabase Storage
-- bucket for per-project file uploads (images, PDFs, etc.), authorized the
-- same way as everything else — reusing can_access_project/can_edit_project
-- from 0001_init.sql rather than inventing a parallel authorization model
-- for storage.

insert into storage.buckets (id, name, public)
values ('project-assets', 'project-assets', false)
on conflict (id) do nothing;

-- Objects are stored under `${project_id}/${filename}` — storage.foldername
-- splits the object path into folder segments, so its first element is the
-- project id, which the existing project-access helpers already know how
-- to authorize against.
create policy "read assets of accessible projects"
  on storage.objects for select to authenticated
  using (bucket_id = 'project-assets' and can_access_project((storage.foldername(name))[1]::uuid));

create policy "editors upload assets"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'project-assets' and can_edit_project((storage.foldername(name))[1]::uuid));

create policy "editors update assets"
  on storage.objects for update to authenticated
  using (bucket_id = 'project-assets' and can_edit_project((storage.foldername(name))[1]::uuid))
  with check (bucket_id = 'project-assets' and can_edit_project((storage.foldername(name))[1]::uuid));

create policy "editors delete assets"
  on storage.objects for delete to authenticated
  using (bucket_id = 'project-assets' and can_edit_project((storage.foldername(name))[1]::uuid));
