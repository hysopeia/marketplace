-- =========================================================
-- MIGRATION 0009 — Policy de lecture publique manquante sur creneaux_capacite
-- La table a ete creee avec RLS active (migration 0001) mais sans
-- aucune policy associee — comportement par defaut : acces refuse a
-- tout le monde sauf le role postgres. C'est pour ca que le formulaire
-- de reservation ne recevait jamais les creneaux, meme apres en avoir
-- insere en base.
-- =========================================================

drop policy if exists "Lecture publique creneaux capacite" on creneaux_capacite;
create policy "Lecture publique creneaux capacite" on creneaux_capacite
  for select using (true);

-- Verification : doit afficher la nouvelle policy
select tablename, policyname, cmd from pg_policies
where tablename = 'creneaux_capacite';
