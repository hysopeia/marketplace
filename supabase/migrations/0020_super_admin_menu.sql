-- =========================================================
-- MIGRATION 0020 — Super_admin autorise sur le stockage menu-photos
--
-- Le super_admin doit pouvoir uploader des photos de plats lors de la
-- creation du menu initial d'un restaurant (pack de lancement), en
-- plus du owner/manager qui gerent leur propre menu au quotidien.
-- =========================================================

drop policy if exists "Owner manager upload photos menu" on storage.objects;
create policy "Owner manager upload photos menu" on storage.objects
  for insert with check (
    bucket_id = 'menu-photos'
    and (
      (storage.foldername(name))[1]::uuid in (
        select restaurant_id from utilisateurs_restaurant
        where user_id = auth.uid() and role in ('owner', 'manager')
      )
      or exists (select 1 from super_admins where user_id = auth.uid())
    )
  );

drop policy if exists "Owner manager supprime photos menu" on storage.objects;
create policy "Owner manager supprime photos menu" on storage.objects
  for delete using (
    bucket_id = 'menu-photos'
    and (
      (storage.foldername(name))[1]::uuid in (
        select restaurant_id from utilisateurs_restaurant
        where user_id = auth.uid() and role in ('owner', 'manager')
      )
      or exists (select 1 from super_admins where user_id = auth.uid())
    )
  );

-- --- Idem pour la creation/modification des categories/plats en base ---
drop policy if exists "Owner manager cree categorie" on categories_menu;
create policy "Owner manager cree categorie" on categories_menu
  for insert with check (
    restaurant_id in (
      select restaurant_id from utilisateurs_restaurant
      where user_id = auth.uid() and role in ('owner', 'manager')
    )
    or exists (select 1 from super_admins where user_id = auth.uid())
  );

drop policy if exists "Owner manager modifie categorie" on categories_menu;
create policy "Owner manager modifie categorie" on categories_menu
  for update using (
    restaurant_id in (
      select restaurant_id from utilisateurs_restaurant
      where user_id = auth.uid() and role in ('owner', 'manager')
    )
    or exists (select 1 from super_admins where user_id = auth.uid())
  );

drop policy if exists "Owner manager supprime categorie" on categories_menu;
create policy "Owner manager supprime categorie" on categories_menu
  for delete using (
    restaurant_id in (
      select restaurant_id from utilisateurs_restaurant
      where user_id = auth.uid() and role in ('owner', 'manager')
    )
    or exists (select 1 from super_admins where user_id = auth.uid())
  );

drop policy if exists "Owner manager supprime plat" on menu_items;
create policy "Owner manager supprime plat" on menu_items
  for delete using (
    restaurant_id in (
      select restaurant_id from utilisateurs_restaurant
      where user_id = auth.uid() and role in ('owner', 'manager')
    )
    or exists (select 1 from super_admins where user_id = auth.uid())
  );

drop policy if exists "Staff gere menu de son restaurant" on menu_items;
create policy "Staff gere menu de son restaurant" on menu_items
  for insert with check (
    restaurant_id in (
      select restaurant_id from utilisateurs_restaurant where user_id = auth.uid()
    )
    or exists (select 1 from super_admins where user_id = auth.uid())
  );

drop policy if exists "Staff modifie menu de son restaurant" on menu_items;
create policy "Staff modifie menu de son restaurant" on menu_items
  for update using (
    restaurant_id in (
      select restaurant_id from utilisateurs_restaurant where user_id = auth.uid()
    )
    or exists (select 1 from super_admins where user_id = auth.uid())
  );

select 'Migration 0020 appliquee' as resultat;
