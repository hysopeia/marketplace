-- =========================================================
-- MIGRATION 0024 — Annonces restaurant (evenements/spectacles) + likes
--
-- Permet a chaque restaurant de publier des annonces (evenement,
-- spectacle, soiree speciale...) affichees sur SA fiche publique
-- uniquement, avec une reaction "j'aime" simple (compteur) cote client.
-- =========================================================

create table if not exists annonces (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  titre text not null,
  description text,
  image_url text,
  date_debut date,
  date_fin date,
  actif boolean not null default true,
  likes_count int not null default 0,
  created_at timestamptz default now()
);

comment on table annonces is
  'Annonces evenementielles publiees par un restaurant (spectacle, soiree...), visibles uniquement sur sa fiche publique.';
comment on column annonces.date_debut is 'Si renseignee, l''annonce ne s''affiche qu''a partir de cette date.';
comment on column annonces.date_fin is 'Si renseignee, l''annonce cesse de s''afficher apres cette date.';

create index if not exists idx_annonces_restaurant on annonces (restaurant_id);

alter table annonces enable row level security;

-- Lecture publique des annonces actives (la page publique du restaurant
-- filtre elle-meme sur les dates ; on garde la lecture ouverte sur
-- "actif" pour rester simple et rapide).
drop policy if exists "Lecture publique annonces actives" on annonces;
create policy "Lecture publique annonces actives" on annonces
  for select using (actif = true);

-- Owner/manager du restaurant : lecture complete (y compris annonces
-- desactivees, pour les reactiver/editer depuis le dashboard).
drop policy if exists "Owner manager lecture complete annonces" on annonces;
create policy "Owner manager lecture complete annonces" on annonces
  for select using (
    restaurant_id in (
      select restaurant_id from utilisateurs_restaurant
      where user_id = auth.uid() and role in ('owner', 'manager')
    )
    or exists (select 1 from super_admins where user_id = auth.uid())
  );

drop policy if exists "Owner manager cree annonce" on annonces;
create policy "Owner manager cree annonce" on annonces
  for insert with check (
    restaurant_id in (
      select restaurant_id from utilisateurs_restaurant
      where user_id = auth.uid() and role in ('owner', 'manager')
    )
    or exists (select 1 from super_admins where user_id = auth.uid())
  );

drop policy if exists "Owner manager modifie annonce" on annonces;
create policy "Owner manager modifie annonce" on annonces
  for update using (
    restaurant_id in (
      select restaurant_id from utilisateurs_restaurant
      where user_id = auth.uid() and role in ('owner', 'manager')
    )
    or exists (select 1 from super_admins where user_id = auth.uid())
  );

drop policy if exists "Owner manager supprime annonce" on annonces;
create policy "Owner manager supprime annonce" on annonces
  for delete using (
    restaurant_id in (
      select restaurant_id from utilisateurs_restaurant
      where user_id = auth.uid() and role in ('owner', 'manager')
    )
    or exists (select 1 from super_admins where user_id = auth.uid())
  );

-- Incrementation atomique du compteur de likes, appelee via RPC depuis
-- l'API publique (evite les race conditions d'un update classique et
-- ne necessite pas d'exposer un droit UPDATE public sur toute la table).
create or replace function incrementer_likes_annonce(annonce_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  nouveau_total int;
begin
  update annonces
  set likes_count = likes_count + 1
  where id = annonce_id and actif = true
  returning likes_count into nouveau_total;

  return nouveau_total;
end;
$$;

grant execute on function incrementer_likes_annonce(uuid) to anon, authenticated;

-- --- Stockage des images d'annonces ---
-- Limite a 5 Mo par fichier, formats image usuels + gif anime autorise
-- (les evenements/spectacles beneficient souvent d'un visuel plus vivant).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'restaurant-annonces',
  'restaurant-annonces',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Lecture publique images annonces" on storage.objects;
create policy "Lecture publique images annonces" on storage.objects
  for select using (bucket_id = 'restaurant-annonces');

drop policy if exists "Owner manager upload images annonces" on storage.objects;
create policy "Owner manager upload images annonces" on storage.objects
  for insert with check (
    bucket_id = 'restaurant-annonces'
    and (
      (storage.foldername(name))[1]::uuid in (
        select restaurant_id from utilisateurs_restaurant
        where user_id = auth.uid() and role in ('owner', 'manager')
      )
      or exists (select 1 from super_admins where user_id = auth.uid())
    )
  );

drop policy if exists "Owner manager supprime images annonces" on storage.objects;
create policy "Owner manager supprime images annonces" on storage.objects
  for delete using (
    bucket_id = 'restaurant-annonces'
    and (
      (storage.foldername(name))[1]::uuid in (
        select restaurant_id from utilisateurs_restaurant
        where user_id = auth.uid() and role in ('owner', 'manager')
      )
      or exists (select 1 from super_admins where user_id = auth.uid())
    )
  );

select 'Migration 0024 appliquee' as resultat;
