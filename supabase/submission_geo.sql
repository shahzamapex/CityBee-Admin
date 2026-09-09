-- Business-specific geo from Google Places address autocomplete:
-- exact coordinates of the business address (distinct from the city coords).

alter table public.business_submissions
  add column if not exists biz_lat double precision,
  add column if not exists biz_lng double precision,
  add column if not exists biz_place_id text;
