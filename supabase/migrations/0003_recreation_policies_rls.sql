-- =========================================================
-- MIGRATION 0003 — Recreation des policies RLS
-- A executer si la requete de verification (pg_policies) montre
-- que les policies sont manquantes suite au crash du premier
-- passage du script 0001_init.sql (l'extension de traduction du
-- navigateur a coupe l'execution avant d'atteindre cette section).
-- =========================================================

drop policy if exists "Lecture publique restaurants" on restaurants;
create policy "Lecture publique restaurants" on restaurants
  for select using (true);

drop policy if exists "Lecture publique menu" on menu_items;
create policy "Lecture publique menu" on menu_items
  for select using (true);

drop policy if exists "Lecture publique categories" on categories_menu;
create policy "Lecture publique categories" on categories_menu
  for select using (true);

drop policy if exists "Staff voit son restaurant" on utilisateurs_restaurant;
create policy "Staff voit son restaurant" on utilisateurs_restaurant
  for select using (auth.uid() = user_id);

drop policy if exists "Staff gere reservations de son restaurant" on reservations;
create policy "Staff gere reservations de son restaurant" on reservations
  for all using (
    restaurant_id in (
      select restaurant_id from utilisateurs_restaurant where user_id = auth.uid()
    )
  );

drop policy if exists "Staff gere commandes de son restaurant" on commandes;
create policy "Staff gere commandes de son restaurant" on commandes
  for all using (
    restaurant_id in (
      select restaurant_id from utilisateurs_restaurant where user_id = auth.uid()
    )
  );

drop policy if exists "Staff gere menu de son restaurant" on menu_items;
create policy "Staff gere menu de son restaurant" on menu_items
  for insert with check (
    restaurant_id in (
      select restaurant_id from utilisateurs_restaurant where user_id = auth.uid()
    )
  );

drop policy if exists "Staff modifie menu de son restaurant" on menu_items;
create policy "Staff modifie menu de son restaurant" on menu_items
  for update using (
    restaurant_id in (
      select restaurant_id from utilisateurs_restaurant where user_id = auth.uid()
    )
  );