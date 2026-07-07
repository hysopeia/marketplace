-- =========================================================
-- MIGRATION 0019 — Stockage des logos de restaurant
--
-- Cree un bucket public "restaurant-logos" ou le super_admin peut
-- uploader le logo qu'un restaurant lui fournit — necessaire pour
-- que le QR code de communication affiche le vrai logo du restaurant
-- au centre, plutot que le logo AfriTable par defaut.
-- =========================================================

insert into storage.buckets (id, name, public)
values ('restaurant-logos', 'restaurant-logos', true)
on conflict (id) do nothing;

-- Lecture publique (necessaire pour l'affichage sur la page publique
-- du restaurant et dans le QR code)
drop policy if exists "Lecture publique logos restaurant" on storage.objects;
create policy "Lecture publique logos restaurant" on storage.objects
  for select using (bucket_id = 'restaurant-logos');

-- Upload/suppression reserves au super_admin
drop policy if exists "Super admin gere logos restaurant" on storage.objects;
create policy "Super admin gere logos restaurant" on storage.objects
  for all using (
    bucket_id = 'restaurant-logos'
    and exists (select 1 from super_admins where user_id = auth.uid())
  )
  with check (
    bucket_id = 'restaurant-logos'
    and exists (select 1 from super_admins where user_id = auth.uid())
  );

select id, name, public from storage.buckets where id = 'restaurant-logos';
