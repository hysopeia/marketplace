-- =========================================================
-- MIGRATION 0002 — Ajout de colonnes manquantes sur paiements
-- Le code de src/app/api/paiements/initiate/route.ts insère
-- reference_interne et metadata, absentes du schéma 0001_init.sql.
-- À exécuter dans Supabase SQL Editor (Project > SQL Editor > New query).
-- =========================================================

alter table paiements
  add column if not exists reference_interne text,
  add column if not exists metadata jsonb;

-- Index utile pour retrouver rapidement un paiement par sa référence
-- interne (reservation_id ou commande_id encodé côté app).
create index if not exists idx_paiements_reference_interne
  on paiements (reference_interne);
