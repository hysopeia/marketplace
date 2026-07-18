-- MIGRATION 0022 — Personnalisation des couleurs par restaurant
--
-- Chaque restaurant peut definir sa propre couleur primaire et secondaire,
-- utilisees dans sa page publique (fiche restaurant) pour se differencier
-- du theme AfriTable par defaut. Valeurs par defaut = theme actuel
-- (orange/vert bouteille) pour ne rien casser sur les restaurants existants.

alter table restaurants
  add column if not exists couleur_primaire text not null default '#F59E0B',
  add column if not exists couleur_secondaire text not null default '#3B6D11';

comment on column restaurants.couleur_primaire is
  'Couleur principale (hex) utilisee sur la fiche publique du restaurant : header, boutons, accents.';
comment on column restaurants.couleur_secondaire is
  'Couleur secondaire (hex) utilisee sur la fiche publique du restaurant : badges, textes d''accent.';
