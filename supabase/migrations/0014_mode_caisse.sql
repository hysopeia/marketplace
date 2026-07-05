-- =========================================================
-- MIGRATION 0014 — Mode caisse : lien commande <-> table
--
-- Une vente en caisse (encaissement sur place par le personnel de
-- salle ou le manager) peut etre associee a une table du plan de
-- salle ET/OU a une commande existante — le choix precis appartient
-- a la personne qui encaisse au moment de la transaction.
-- =========================================================

alter table commandes
  add column if not exists table_id uuid references tables_salle(id) on delete set null;

-- Le personnel de salle et le manager doivent pouvoir creer/modifier
-- des commandes de leur restaurant (encaissement en caisse) — deja
-- couvert par la policy ALL "Staff gere commandes de son restaurant"
-- existante (migration 0001), aucune nouvelle policy necessaire ici.

select column_name, data_type
from information_schema.columns
where table_name = 'commandes' and column_name = 'table_id';
