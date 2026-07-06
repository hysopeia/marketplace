-- =========================================================
-- MIGRATION 0015 — Stockage des photos de plats (Supabase Storage)
--
-- Cree un bucket public "menu-photos" ou les proprietaires/managers
-- peuvent uploader des photos de plats, organisees par dossier
-- restaurant_id/nom-fichier — permet un vrai upload depuis le
-- navigateur au lieu de fichiers statiques codes en dur.
-- =========================================================

insert into storage.buckets (id, name, public)
values ('menu-photos', 'menu-photos', true)
on conflict (id) do nothing;

-- Lecture publique des photos (necessaire pour les afficher sur le
-- site, y compris pour un visiteur non connecte)
drop policy if exists "Lecture publique photos menu" on storage.objects;
create policy "Lecture publique photos menu" on storage.objects
  for select using (bucket_id = 'menu-photos');

-- Upload reserve a owner/manager, uniquement dans le dossier de LEUR
-- propre restaurant (le premier segment du chemin doit correspondre
-- a un restaurant_id dont ils sont owner/manager)
drop policy if exists "Owner manager upload photos menu" on storage.objects;
create policy "Owner manager upload photos menu" on storage.objects
  for insert with check (
    bucket_id = 'menu-photos'
    and (storage.foldername(name))[1]::uuid in (
      select restaurant_id from utilisateurs_restaurant
      where user_id = auth.uid() and role in ('owner', 'manager')
    )
  );

-- Suppression reservee de la meme facon
drop policy if exists "Owner manager supprime photos menu" on storage.objects;
create policy "Owner manager supprime photos menu" on storage.objects
  for delete using (
    bucket_id = 'menu-photos'
    and (storage.foldername(name))[1]::uuid in (
      select restaurant_id from utilisateurs_restaurant
      where user_id = auth.uid() and role in ('owner', 'manager')
    )
  );

select id, name, public from storage.buckets where id = 'menu-photos';
