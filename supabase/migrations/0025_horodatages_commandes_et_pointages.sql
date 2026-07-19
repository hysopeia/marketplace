-- MIGRATION 0025 — Horodatages reels des commandes + pointage du personnel
--
-- 1) Horodatages par etape de commande : permet d'afficher une VRAIE
--    heure d'entree (deja disponible via created_at) et une VRAIE heure
--    de sortie (recuperee) sur l'ecran cuisine et la liste commandes,
--    au lieu de se limiter a "X minutes ecoulees".
--
-- 2) Pointage du personnel : prise de service / fin de service par
--    identifiant, pour que le owner voie les horaires reels de son
--    equipe (tres courant en restauration avec des services en quart).

alter table commandes
  add column if not exists heure_debut_preparation timestamptz,
  add column if not exists heure_prete timestamptz,
  add column if not exists heure_recuperee timestamptz;

comment on column commandes.heure_debut_preparation is
  'Horodatage reel du passage au statut en_preparation.';
comment on column commandes.heure_prete is
  'Horodatage reel du passage au statut prete.';
comment on column commandes.heure_recuperee is
  'Horodatage reel du passage au statut recuperee (= heure de sortie).';

create table if not exists pointages (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('entree', 'sortie')),
  created_at timestamptz default now()
);

comment on table pointages is
  'Prise de service (entree) et fin de service (sortie) du personnel, par identifiant utilisateur.';

create index if not exists idx_pointages_restaurant on pointages (restaurant_id, created_at desc);

alter table pointages enable row level security;

drop policy if exists "Staff cree son propre pointage" on pointages;
create policy "Staff cree son propre pointage" on pointages
  for insert
  with check (
    user_id = auth.uid()
    and restaurant_id in (
      select restaurant_id from utilisateurs_restaurant where user_id = auth.uid()
    )
  );

drop policy if exists "Lecture pointages equipe" on pointages;
create policy "Lecture pointages equipe" on pointages
  for select
  using (
    user_id = auth.uid()
    or restaurant_id in (
      select restaurant_id from utilisateurs_restaurant
      where user_id = auth.uid() and role in ('owner', 'manager')
    )
  );

select 'Migration 0025 appliquee' as resultat;
