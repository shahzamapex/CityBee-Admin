-- Extend business_submissions for category-specific details + images.

alter table public.business_submissions
  add column if not exists cuisine text,             -- restaurants
  add column if not exists price_range text,         -- restaurants / hotels
  add column if not exists veg_type text             -- restaurants
    check (veg_type is null or veg_type in ('veg','non_veg','mixed')),
  add column if not exists specialization text,      -- doctors
  add column if not exists qualification text,       -- doctors
  add column if not exists experience_years int      -- doctors
    check (experience_years is null or experience_years >= 0),
  add column if not exists consultation_fee text,    -- doctors
  add column if not exists hotel_type text,          -- hotels
  add column if not exists amenities text,           -- hotels (comma list)
  add column if not exists check_in_time text,       -- hotels
  add column if not exists check_out_time text;      -- hotels

-- Submitted images (Cloudinary URLs, stored as a JSON array text column —
-- the admin links them into business_images on approval).
alter table public.business_submissions
  add column if not exists image_urls text;
