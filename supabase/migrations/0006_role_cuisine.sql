-- =========================================================
-- MIGRATION 0006 — Ajout du role "cuisine" (Kitchen Display System)
-- Un cuisinier sur tablette n'a besoin que de la file de commandes a
-- preparer, pas du dashboard complet (reservations, recette, menu).
-- A executer dans Supabase SQL Editor.
-- =========================================================

alter table utilisateurs_restaurant
  drop constraint if exists utilisateurs_restaurant_role_check;

alter table utilisateurs_restaurant
  add constraint utilisateurs_restaurant_role_check
  check (role in ('owner', 'manager', 'staff', 'cuisine'));

-- Verification : la contrainte doit maintenant accepter 'cuisine'
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conname = 'utilisateurs_restaurant_role_check';
