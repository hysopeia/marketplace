-- =========================================================
-- MIGRATION 0012 — Droit de moderation (UPDATE) pour le super_admin
-- La migration 0011 ne donnait au super_admin que la lecture (SELECT)
-- sur la table avis. La moderation (masquer/afficher un avis client)
-- necessite aussi le droit de modification.
-- =========================================================

drop policy if exists "Super admin modere les avis" on avis;
create policy "Super admin modere les avis" on avis
  for update using (
    auth.uid() in (select user_id from super_admins)
  );

-- Verification
select tablename, policyname, cmd from pg_policies
where tablename = 'avis'
order by cmd, policyname;
