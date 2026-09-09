-- City selection via Google Places: store resolved city data on the
-- submission so approval can find-or-create the city row.

alter table public.business_submissions
  add column if not exists city_name text,
  add column if not exists city_lat double precision,
  add column if not exists city_lng double precision,
  add column if not exists city_place_id text;
