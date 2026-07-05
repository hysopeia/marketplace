-- =========================================================
-- MIGRATION 0010 — Confidentialite reservations/commandes
--
-- Probleme trouve : plusieurs policies laissaient n'importe quel
-- visiteur (meme non connecte, pour les "*_dev") lire OU MODIFIER
-- les reservations/commandes de TOUS les restaurants :
--   - cmd_read_dev / res_read_dev        (SELECT, qual: true)
--   - cmd_update_dev / res_update_dev    (UPDATE, qual: true)
--   - "Lire ses commandes si connecte"   (SELECT, juste
--     authentifie, sans filtre par restaurant — un owner du
--     resto A pouvait lire les commandes du resto B)
--   - meme chose pour les reservations
--
-- Ces policies sont supprimees. Seule reste "Staff gere ... de
-- son restaurant" (deja correctement filtree par restaurant_id
-- via utilisateurs_restaurant), qui couvre les besoins legitimes
-- du personnel : lire/modifier UNIQUEMENT les commandes et
-- reservations de SON PROPRE restaurant.
--
-- Les policies d'INSERT (permettant a un client anonyme de
-- soumettre une reservation/commande) ne sont PAS touchees ici —
-- elles restent necessaires pour le parcours client sans compte.
-- =========================================================

drop policy if exists "cmd_read_dev" on commandes;
drop policy if exists "cmd_update_dev" on commandes;
drop policy if exists "Lire ses commandes si connecté" on commandes;

drop policy if exists "res_read_dev" on reservations;
drop policy if exists "res_update_dev" on reservations;
drop policy if exists "Lire ses réservations si connecté" on reservations;

-- Verification : ne doivent plus rester que les policies d'INSERT
-- et la policy "Staff gere ... de son restaurant" (ALL, filtree)
select tablename, policyname, cmd, qual
from pg_policies
where tablename in ('commandes', 'reservations')
order by tablename, cmd;
