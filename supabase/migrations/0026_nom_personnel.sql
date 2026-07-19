-- MIGRATION 0026 — Nom du personnel
--
-- Jusqu'ici seul l'email etait disponible pour identifier un membre du
-- personnel (recupere via l'API admin Supabase). Le owner retient les
-- noms, pas les emails — on ajoute donc un champ nom, saisi a
-- l'invitation, utilise en priorite dans toutes les interfaces
-- (equipe, pointages) avec repli sur l'email si absent.

alter table utilisateurs_restaurant
  add column if not exists nom text;

comment on column utilisateurs_restaurant.nom is
  'Nom affiche du membre du personnel (saisi a l''invitation). Repli sur l''email si absent.';

select 'Migration 0026 appliquee' as resultat;
