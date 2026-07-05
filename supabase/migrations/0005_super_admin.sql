-- =========================================================
-- MIGRATION 0005 — Super Admin plateforme (separe des owners par restaurant)
-- A executer dans Supabase SQL Editor.
--
-- Contexte : /admin utilisait jusqu'ici requireOwnerSession(), qui ne
-- verifie qu'un role 'owner' SUR UN restaurant quelconque. Un proprietaire
-- de restaurant normal pouvait donc techniquement acceder a /admin
-- (gestion de TOUTE la plateforme). Cette migration cree un vrai rôle
-- plateforme separe.
-- =========================================================

-- Table des super admins (toi, l'exploitant de la plateforme)
create table if not exists super_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

alter table super_admins enable row level security;

-- Un utilisateur peut seulement verifier SA PROPRE presence dans la liste
-- (necessaire pour que le helper d'auth cote serveur fonctionne), jamais
-- lire la liste complete des autres super admins.
drop policy if exists "Verifier son propre statut super admin" on super_admins;
create policy "Verifier son propre statut super admin" on super_admins
  for select using (auth.uid() = user_id);

-- Ajoute ton compte (digeoss@gmail.com) comme premier super admin.
-- Remplace l'UUID ci-dessous si jamais tu utilises un autre compte.
insert into super_admins (user_id)
values ('081024a1-16d5-4c68-8417-eaec0ab014a9')
on conflict (user_id) do nothing;

-- =========================================================
-- Durcissement des policies "restaurants" — remplace les policies
-- _dev trop permissives (probablement using(true) sans restriction,
-- ajoutees directement par GLM sans migration correspondante) par de
-- vraies regles : seul un super_admin peut creer/modifier/supprimer
-- un restaurant depuis /admin. Les owners gerent leur resto via
-- /dashboard (fonctionnalites a construire separement), pas via /admin.
-- =========================================================

drop policy if exists "resto_insert_dev" on restaurants;
drop policy if exists "resto_update_dev" on restaurants;
drop policy if exists "resto_delete_dev" on restaurants;

create policy "Super admin cree des restaurants" on restaurants
  for insert with check (
    auth.uid() in (select user_id from super_admins)
  );

create policy "Super admin modifie tous les restaurants" on restaurants
  for update using (
    auth.uid() in (select user_id from super_admins)
  );

create policy "Super admin supprime des restaurants" on restaurants
  for delete using (
    auth.uid() in (select user_id from super_admins)
  );

-- Verification finale : doit afficher les nouvelles policies restaurants
-- + la policy super_admins
select tablename, policyname, cmd from pg_policies
where tablename in ('restaurants', 'super_admins')
order by tablename, policyname;
