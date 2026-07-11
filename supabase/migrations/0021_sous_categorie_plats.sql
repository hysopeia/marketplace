-- =========================================================
-- MIGRATION 0021 — Sous-categorie optionnelle sur les plats
--
-- Permet de preciser un type au sein d'une categorie plus large,
-- typiquement pour les boissons (eau, alcoolisees, non alcoolisees,
-- jus naturels, sucreries) — mais reste un champ libre generique,
-- utilisable pour n'importe quelle categorie si besoin.
-- =========================================================

alter table menu_items add column if not exists sous_categorie text;

select 'Migration 0021 appliquee' as resultat;
