-- =========================================================
-- MIGRATION 0008 — Correction du type heure_retrait_souhaitee
-- La colonne avait ete changee en "time without time zone" (heure
-- seule, sans date) directement dans Supabase, sans migration
-- correspondante — a l'origine du bug "Invalid Date" dans la vue
-- cuisine. On revient au type timestamptz du schema original,
-- pour permettre de precommander a n'importe quelle date future.
--
-- Les lignes existantes (heure seule, ex: '19:00:00') sont converties
-- en combinant avec la date du jour, comme valeur de transition
-- raisonnable pour des donnees de test.
-- =========================================================

alter table commandes
  alter column heure_retrait_souhaitee type timestamptz
  using (
    case
      when heure_retrait_souhaitee is null then null
      else (current_date + heure_retrait_souhaitee::time)::timestamptz
    end
  );

-- Verification : doit afficher timestamp with time zone
select column_name, data_type
from information_schema.columns
where table_name = 'commandes' and column_name = 'heure_retrait_souhaitee';
