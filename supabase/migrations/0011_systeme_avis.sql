-- =========================================================
-- MIGRATION 0011 — Systeme d'avis (likes + commentaires)
--
-- Deux types d'avis distincts :
--   - 'client'      : un client laisse un like/dislike + commentaire
--                     sur UN restaurant precis. Visible sur le
--                     dashboard du restaurateur concerne.
--   - 'proprietaire' : un temoignage du restaurateur sur son
--                      experience avec la plateforme ReservDine
--                      elle-meme (pas sur son propre restaurant).
--                      Visible uniquement par le super_admin.
--
-- Ces donnees remplacent les chiffres inventes du hero (98%
-- satisfaction, etc.) par de vraies statistiques calculees.
-- =========================================================

create table if not exists avis (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  auteur_type text not null check (auteur_type in ('client', 'proprietaire')),
  auteur_nom text,
  positif boolean not null,
  commentaire text,
  visible boolean not null default true,
  created_at timestamptz default now()
);

alter table avis enable row level security;

-- Lecture publique des avis clients visibles (pour affichage sur la
-- page publique du restaurant, plus tard).
drop policy if exists "Lecture publique avis clients visibles" on avis;
create policy "Lecture publique avis clients visibles" on avis
  for select using (auteur_type = 'client' and visible = true);

-- Un client anonyme peut laisser un avis sur un restaurant.
drop policy if exists "Client cree un avis" on avis;
create policy "Client cree un avis" on avis
  for insert with check (auteur_type = 'client');

-- Un owner peut laisser un temoignage sur la plateforme, uniquement
-- pour un restaurant dont il est reellement owner.
drop policy if exists "Owner cree un temoignage plateforme" on avis;
create policy "Owner cree un temoignage plateforme" on avis
  for insert with check (
    auteur_type = 'proprietaire'
    and restaurant_id in (
      select restaurant_id from utilisateurs_restaurant
      where user_id = auth.uid() and role = 'owner'
    )
  );

-- Le staff d'un restaurant voit tous les avis (likes + commentaires
-- clients) concernant SON restaurant, y compris les non-visibles
-- (moderation).
drop policy if exists "Staff voit les avis de son restaurant" on avis;
create policy "Staff voit les avis de son restaurant" on avis
  for select using (
    restaurant_id in (
      select restaurant_id from utilisateurs_restaurant where user_id = auth.uid()
    )
  );

-- Le super_admin voit tous les avis, tous types, tous restaurants.
drop policy if exists "Super admin voit tous les avis" on avis;
create policy "Super admin voit tous les avis" on avis
  for select using (
    auth.uid() in (select user_id from super_admins)
  );

-- Verification finale
select tablename, policyname, cmd from pg_policies
where tablename = 'avis'
order by policyname;
