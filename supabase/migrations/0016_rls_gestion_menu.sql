-- =========================================================
-- MIGRATION 0016 — Policies RLS manquantes pour la gestion du menu
--
-- categories_menu n'avait AUCUNE policy d'ecriture (juste la lecture
-- publique) — impossible de creer/modifier/supprimer une categorie.
-- menu_items n'avait pas de policy de suppression.
-- =========================================================

drop policy if exists "Owner manager cree categorie" on categories_menu;
create policy "Owner manager cree categorie" on categories_menu
  for insert with check (
    restaurant_id in (
      select restaurant_id from utilisateurs_restaurant
      where user_id = auth.uid() and role in ('owner', 'manager')
    )
  );

drop policy if exists "Owner manager modifie categorie" on categories_menu;
create policy "Owner manager modifie categorie" on categories_menu
  for update using (
    restaurant_id in (
      select restaurant_id from utilisateurs_restaurant
      where user_id = auth.uid() and role in ('owner', 'manager')
    )
  );

drop policy if exists "Owner manager supprime categorie" on categories_menu;
create policy "Owner manager supprime categorie" on categories_menu
  for delete using (
    restaurant_id in (
      select restaurant_id from utilisateurs_restaurant
      where user_id = auth.uid() and role in ('owner', 'manager')
    )
  );

drop policy if exists "Owner manager supprime plat" on menu_items;
create policy "Owner manager supprime plat" on menu_items
  for delete using (
    restaurant_id in (
      select restaurant_id from utilisateurs_restaurant
      where user_id = auth.uid() and role in ('owner', 'manager')
    )
  );

select tablename, policyname, cmd from pg_policies
where tablename in ('categories_menu', 'menu_items')
order by tablename, cmd;
