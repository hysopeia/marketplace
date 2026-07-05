-- =========================================================
-- Ajout d'un 3e restaurant de test — quartier different (Marcory)
-- pour verifier concretement le tri par proximite geographique.
-- A executer dans Supabase SQL Editor.
-- =========================================================

update restaurants set latitude = 5.3599, longitude = -3.9866
where slug = 'mon-resto-pilote' and latitude is null;

update restaurants set latitude = 5.3612, longitude = -3.9850
where slug = 'le-petit-bambou' and latitude is null;

insert into restaurants (nom, slug, pays, ville, quartier, latitude, longitude, tier, devise, statut_abonnement)
values (
  'Chez Marcory Grill',
  'chez-marcory-grill',
  'CI',
  'Abidjan',
  'Marcory',
  5.2926,
  -3.9868,
  'starter',
  'XOF',
  'actif'
)
on conflict (slug) do nothing;

select nom, slug, quartier, latitude, longitude from restaurants order by created_at;
