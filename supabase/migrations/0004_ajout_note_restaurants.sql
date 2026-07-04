-- =========================================================
-- MIGRATION 0004 — Ajout note moyenne (optionnelle) aux restaurants
-- Nullable : un restaurant sans avis affiche "Nouveau" plutot qu'une
-- fausse note. Le systeme d'avis complet (table dediee, calcul
-- automatique) reste a construire en Phase 2 — ce champ est juste
-- le support de donnee pour l'instant.
-- =========================================================

alter table restaurants
  add column if not exists note_moyenne numeric(2,1) check (note_moyenne is null or (note_moyenne >= 0 and note_moyenne <= 5)),
  add column if not exists nombre_avis int default 0;
