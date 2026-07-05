-- =========================================================
-- MIGRATION 0013 — Plan de salle (tables physiques positionnees)
--
-- Chaque restaurant configure son propre plan (owner/manager),
-- avec des tables rondes ou carrees positionnees librement dans
-- l'espace. Le statut (libre/reservee/occupee) est calcule en
-- temps reel a partir des reservations en cours, avec une
-- possibilite de forcer manuellement "occupee" pour un client
-- arrive sans reservation (walk-in).
-- =========================================================

create table if not exists tables_salle (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  nom text not null,
  forme text not null check (forme in ('ronde', 'carree')) default 'carree',
  capacite int not null default 2,
  position_x numeric(5,2) not null default 50, -- pourcentage (0-100) dans le plan
  position_y numeric(5,2) not null default 50,
  largeur int not null default 80, -- pixels, taille visuelle de la table
  statut_manuel text check (statut_manuel in ('libre', 'occupee') or statut_manuel is null),
  created_at timestamptz default now()
);

alter table tables_salle enable row level security;

-- Lecture : tout le personnel du restaurant (owner/manager/staff/cuisine)
-- peut voir le plan — le personnel de salle en a explicitement besoin
-- pour gerer les reservations au quotidien.
drop policy if exists "Staff voit le plan de salle de son restaurant" on tables_salle;
create policy "Staff voit le plan de salle de son restaurant" on tables_salle
  for select using (
    restaurant_id in (
      select restaurant_id from utilisateurs_restaurant where user_id = auth.uid()
    )
  );

-- Modification (creer/deplacer/supprimer une table) : reserve a
-- owner et manager, pas au personnel de salle ni a la cuisine.
drop policy if exists "Owner et manager configurent le plan de salle" on tables_salle;
create policy "Owner et manager configurent le plan de salle" on tables_salle
  for all using (
    restaurant_id in (
      select restaurant_id from utilisateurs_restaurant
      where user_id = auth.uid() and role in ('owner', 'manager')
    )
  );

-- Lien optionnel entre une reservation et une table physique precise,
-- pour savoir quelle table est reservee a quelle heure.
alter table reservations
  add column if not exists table_id uuid references tables_salle(id) on delete set null;

select tablename, policyname, cmd from pg_policies
where tablename = 'tables_salle'
order by cmd;
