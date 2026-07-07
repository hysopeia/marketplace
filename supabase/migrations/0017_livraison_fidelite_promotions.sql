-- =========================================================
-- MIGRATION 0017 — Livraison, fidelite et promotions
--
-- Livraison : le restaurant gere sa propre logistique, AfriTable ne
-- fait que capturer l'adresse et transmettre la commande — pas de
-- gestion de coursiers.
--
-- Fidelite : identification par numero de telephone uniquement pour
-- l'instant (deja la table clients existante). Chaque restaurant
-- definit son propre taux de points et sa propre recompense.
--
-- Promotions : un texte simple affiche sur la page publique du
-- restaurant, pas un systeme de diffusion SMS/push (a construire
-- separement si besoin plus tard).
-- =========================================================

-- --- Livraison ---
alter table commandes drop constraint if exists commandes_type_check;
alter table commandes add constraint commandes_type_check
  check (type in ('retrait', 'sur_place', 'livraison'));

alter table commandes add column if not exists adresse_livraison text;

-- --- Correctif : mode_paiement etait insere par /api/commandes sans que
-- la colonne existe jamais dans aucune migration precedente — chaque
-- creation de commande via cette route echouait probablement en
-- silence cote serveur (erreur PostgREST "colonne inexistante"). ---
alter table commandes add column if not exists mode_paiement text default 'en_ligne';

-- --- Programme de fidelite (config par restaurant) ---
create table if not exists programme_fidelite (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id) on delete cascade unique,
  actif boolean default true,
  points_par_fcfa numeric(10,6) not null default 0.01,
  seuil_recompense int not null default 100,
  description_recompense text not null default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- --- Solde de points par client, par restaurant ---
create table if not exists points_fidelite_clients (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  points_actuels int not null default 0,
  points_cumules_total int not null default 0,
  inscrit_le timestamptz default now(),
  unique(restaurant_id, client_id)
);

-- --- Promotions (texte simple, affiche publiquement) ---
create table if not exists promotions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  texte text not null,
  actif boolean default true,
  created_at timestamptz default now()
);

alter table programme_fidelite enable row level security;
alter table points_fidelite_clients enable row level security;
alter table promotions enable row level security;

-- Lecture publique de la config fidelite active (pour afficher les
-- regles au client avant qu'il rejoigne le programme)
drop policy if exists "Lecture publique programme fidelite" on programme_fidelite;
create policy "Lecture publique programme fidelite" on programme_fidelite
  for select using (true);

-- Owner/manager gerent la config de leur programme
drop policy if exists "Owner manager gere programme fidelite" on programme_fidelite;
create policy "Owner manager gere programme fidelite" on programme_fidelite
  for all using (
    restaurant_id in (
      select restaurant_id from utilisateurs_restaurant
      where user_id = auth.uid() and role in ('owner', 'manager')
    )
  );

-- Owner/manager voient le solde de points de leurs clients
drop policy if exists "Owner manager voit points clients" on points_fidelite_clients;
create policy "Owner manager voit points clients" on points_fidelite_clients
  for select using (
    restaurant_id in (
      select restaurant_id from utilisateurs_restaurant
      where user_id = auth.uid() and role in ('owner', 'manager')
    )
  );

-- Lecture publique des promotions actives
drop policy if exists "Lecture publique promotions" on promotions;
create policy "Lecture publique promotions" on promotions
  for select using (actif = true);

-- Owner/manager gerent leurs promotions
drop policy if exists "Owner manager gere promotions" on promotions;
create policy "Owner manager gere promotions" on promotions
  for all using (
    restaurant_id in (
      select restaurant_id from utilisateurs_restaurant
      where user_id = auth.uid() and role in ('owner', 'manager')
    )
  );

select 'Migration 0017 appliquee' as resultat;
