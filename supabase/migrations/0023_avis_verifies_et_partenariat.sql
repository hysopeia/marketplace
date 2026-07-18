-- MIGRATION 0023 — Avis verifies + leads "Devenir partenaire"
--
-- 1) Avis verifies : un avis client peut desormais etre rattache a une
--    commande ou une reservation reelle. On en deduit un badge "avis
--    verifie" cote affichage, ce qui renforce la confiance B2B2C
--    (le client a reellement consomme chez ce restaurant).
--
-- 2) Leads partenariat : formulaire public "Devenir partenaire" pour que
--    des restaurants prospects laissent leurs coordonnees, traite ensuite
--    par le super_admin (conversion commerciale B2B).

alter table avis
  add column if not exists commande_id uuid references commandes(id) on delete set null,
  add column if not exists reservation_id uuid references reservations(id) on delete set null;

comment on column avis.commande_id is
  'Si renseigne, l''avis est rattache a une commande reelle (avis verifie).';
comment on column avis.reservation_id is
  'Si renseigne, l''avis est rattache a une reservation reelle (avis verifie).';

create table if not exists partenariat_leads (
  id uuid primary key default gen_random_uuid(),
  nom_restaurant text not null,
  nom_contact text not null,
  telephone text not null,
  email text,
  ville text,
  pays text,
  message text,
  statut text check (statut in ('nouveau','contacte','converti','abandonne')) default 'nouveau',
  created_at timestamptz default now()
);

comment on table partenariat_leads is
  'Demandes entrantes de restaurants souhaitant rejoindre AfriTable via la page publique "Devenir partenaire".';

alter table partenariat_leads enable row level security;

drop policy if exists "Creation publique lead partenariat" on partenariat_leads;
create policy "Creation publique lead partenariat" on partenariat_leads
  for insert
  with check (true);

drop policy if exists "Lecture leads reservee super_admin" on partenariat_leads;
create policy "Lecture leads reservee super_admin" on partenariat_leads
  for select
  using (exists (select 1 from super_admins where super_admins.user_id = auth.uid()));

drop policy if exists "Modification leads reservee super_admin" on partenariat_leads;
create policy "Modification leads reservee super_admin" on partenariat_leads
  for update
  using (exists (select 1 from super_admins where super_admins.user_id = auth.uid()));
