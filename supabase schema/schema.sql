--
-- CityBee — Supabase PUBLIC SCHEMA backup (schema only, no data)
-- Dumped: 2026-09-11 · PostgreSQL 17.6 (Supabase) · public schema
--
-- RESTORE INSTRUCTIONS (any Postgres 15+ / Supabase / other provider):
--   1. Create a fresh database, then run this file top-to-bottom:
--        psql "$NEW_DB_URL" -f schema.sql
--   2. Extensions must exist before tables (PostGIS for geography columns).
--      On Supabase most are preinstalled; on plain Postgres run the
--      CREATE EXTENSION lines below first (needs superuser).
--   3. Supabase built-in roles (anon/authenticated/service_role) exist only
--      on Supabase. On other providers either create them or adjust the
--      role references in the last section / drop the grants.
--   4. RLS policies reference auth.uid() (Supabase). On other providers
--      replace auth.uid() with your auth solution or drop those policies.
--

-- ── Extensions (Supabase dashboard → Database → Extensions) ──────────────
CREATE EXTENSION IF NOT EXISTS postgis;            -- geography columns (businesses.location, places.location)
CREATE EXTENSION IF NOT EXISTS pgcrypto;           -- gen_random_uuid() on older PG
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;            -- ilike search performance

--
-- PostgreSQL database dump
--

\restrict 4AFNau7rj6hDeXvsNKuGhJftv9AZ9MkuxYc4zmNf86D3V3418hhgj88jp24DFFf

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: business_images_max_five(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.business_images_max_five() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if (select count(*) from public.business_images where business_id = new.business_id) >= 5 then
    raise exception 'BUSINESS_IMAGE_LIMIT_REACHED'
      using errcode = 'P0003';
  end if;
  return new;
end;
$$;


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'
  );
$$;


--
-- Name: owns_business(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.owns_business(b uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1 from public.businesses b2
    where b2.id = b and b2.owner_id = auth.uid()
  );
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
  begin
    new.updated_at = now();
    return new;
  end;
  $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bulk_import_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bulk_import_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_by uuid,
    created_by_email text,
    payload jsonb DEFAULT '[]'::jsonb NOT NULL,
    status text DEFAULT 'queued'::text NOT NULL,
    results jsonb DEFAULT '[]'::jsonb NOT NULL,
    summary jsonb,
    error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    CONSTRAINT bulk_import_jobs_status_check CHECK ((status = ANY (ARRAY['queued'::text, 'running'::text, 'done'::text, 'failed'::text])))
);


--
-- Name: business_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_categories (
    business_id uuid NOT NULL,
    category_id uuid NOT NULL
);


--
-- Name: business_claims; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_claims (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    user_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT business_claims_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: business_hours; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_hours (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    day_of_week integer NOT NULL,
    is_closed boolean DEFAULT false NOT NULL,
    open_time time without time zone DEFAULT '09:00:00'::time without time zone NOT NULL,
    close_time time without time zone DEFAULT '21:00:00'::time without time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT business_hours_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)))
);


--
-- Name: business_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    image_url text NOT NULL,
    public_id text,
    alt_text text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: business_services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    price text,
    duration_minutes integer,
    active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT business_services_duration_minutes_check CHECK (((duration_minutes IS NULL) OR (duration_minutes > 0)))
);


--
-- Name: business_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    submitter_name text NOT NULL,
    submitter_phone text NOT NULL,
    submitter_email text,
    business_name text NOT NULL,
    kind text DEFAULT 'service'::text NOT NULL,
    category_slug text,
    tagline text DEFAULT ''::text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    phone text,
    whatsapp text,
    address text DEFAULT ''::text NOT NULL,
    locality text,
    city_slug text DEFAULT 'moradabad'::text NOT NULL,
    opening_hours text,
    website text,
    status text DEFAULT 'pending'::text NOT NULL,
    admin_note text,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    cuisine text,
    price_range text,
    veg_type text,
    specialization text,
    qualification text,
    experience_years integer,
    consultation_fee text,
    hotel_type text,
    amenities text,
    check_in_time text,
    check_out_time text,
    image_urls text,
    city_name text,
    city_lat double precision,
    city_lng double precision,
    city_place_id text,
    biz_lat double precision,
    biz_lng double precision,
    biz_place_id text,
    submitter_user_id uuid,
    rejection_reason text,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT business_submissions_experience_years_check CHECK (((experience_years IS NULL) OR (experience_years >= 0))),
    CONSTRAINT business_submissions_kind_check CHECK ((kind = ANY (ARRAY['restaurant'::text, 'doctor'::text, 'hotel'::text, 'salon'::text, 'shop'::text, 'mall'::text, 'service'::text]))),
    CONSTRAINT business_submissions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))),
    CONSTRAINT business_submissions_veg_type_check CHECK (((veg_type IS NULL) OR (veg_type = ANY (ARRAY['veg'::text, 'non_veg'::text, 'mixed'::text]))))
);


--
-- Name: businesses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.businesses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid,
    name text NOT NULL,
    slug text,
    kind text DEFAULT 'service'::text NOT NULL,
    tagline text DEFAULT ''::text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    phone text,
    whatsapp text,
    email text,
    website text,
    address text DEFAULT ''::text NOT NULL,
    locality text,
    city_id uuid,
    state_region text,
    country text DEFAULT 'India'::text NOT NULL,
    postal_code text,
    location public.geography(Point,4326),
    google_place_id text,
    rating numeric(2,1) DEFAULT 0 NOT NULL,
    review_count integer DEFAULT 0 NOT NULL,
    opening_hours text,
    is_pure_veg boolean DEFAULT false NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    is_featured boolean DEFAULT false NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    external_ref text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    rejection_reason text,
    CONSTRAINT businesses_rating_check CHECK (((rating >= (0)::numeric) AND (rating <= (5)::numeric))),
    CONSTRAINT businesses_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'pending'::text, 'approved'::text, 'rejected'::text, 'inactive'::text, 'suspended'::text])))
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    icon text,
    parent_id uuid,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    kind text,
    default_kind text DEFAULT 'service'::text NOT NULL
);


--
-- Name: cities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    state_region text,
    country text DEFAULT ''::text NOT NULL,
    country_code character(2),
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    google_place_id text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    nickname text DEFAULT ''::text NOT NULL,
    default_area text DEFAULT ''::text NOT NULL
);


--
-- Name: doctors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.doctors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    name text NOT NULL,
    specialization text DEFAULT ''::text NOT NULL,
    qualification text,
    experience_years integer,
    consultation_fee text,
    bio text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT doctors_experience_years_check CHECK ((experience_years >= 0))
);


--
-- Name: favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favorites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    business_id uuid,
    offer_id uuid,
    place_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT favorites_one_target CHECK ((num_nonnulls(business_id, offer_id, place_id) = 1))
);


--
-- Name: hotel_amenities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hotel_amenities (
    hotel_id uuid NOT NULL,
    amenity text NOT NULL
);


--
-- Name: hotels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hotels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    hotel_type text,
    price_range text,
    check_in time without time zone,
    check_out time without time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: menu_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    name text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: menu_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    price text,
    image_url text,
    is_veg boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    menu_category_id uuid,
    available boolean DEFAULT true NOT NULL,
    image_public_id text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    title text NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'general'::text NOT NULL,
    target_type text,
    target_id uuid,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notifications_target_type_check CHECK ((target_type = ANY (ARRAY['business'::text, 'offer'::text, 'place'::text, 'offers_tab'::text, 'explore_tab'::text, 'more_tab'::text])))
);


--
-- Name: offer_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.offer_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    offer_id uuid NOT NULL,
    image_url text NOT NULL,
    public_id text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: offers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.offers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    badge_text text DEFAULT ''::text NOT NULL,
    subtitle text DEFAULT ''::text NOT NULL,
    coupon_code text,
    category_tag text DEFAULT 'All'::text NOT NULL,
    terms text,
    discount_type text,
    discount_value numeric(10,2),
    valid_from date,
    valid_until date,
    status text DEFAULT 'draft'::text NOT NULL,
    is_featured boolean DEFAULT false NOT NULL,
    views integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT offers_discount_type_check CHECK ((discount_type = ANY (ARRAY['percent'::text, 'flat'::text, 'bogo'::text, 'other'::text]))),
    CONSTRAINT offers_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'pending'::text, 'active'::text, 'expired'::text, 'rejected'::text, 'inactive'::text])))
);


--
-- Name: place_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.place_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    place_id uuid NOT NULL,
    image_url text NOT NULL,
    public_id text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: places; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.places (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text,
    description text,
    category_id uuid,
    city_id uuid,
    address text,
    locality text,
    country text,
    location public.geography(Point,4326),
    google_place_id text,
    website text,
    phone text,
    rating numeric(2,1) DEFAULT 0 NOT NULL,
    review_count integer DEFAULT 0 NOT NULL,
    is_featured boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    timings text,
    entry_fee text,
    external_ref text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT places_rating_check CHECK (((rating >= (0)::numeric) AND (rating <= (5)::numeric)))
);


--
-- Name: restaurants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.restaurants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    cuisine text,
    price_range text,
    veg_type text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT restaurants_veg_type_check CHECK ((veg_type = ANY (ARRAY['veg'::text, 'non_veg'::text, 'mixed'::text])))
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    business_id uuid,
    place_id uuid,
    rating integer NOT NULL,
    review_text text,
    status text DEFAULT 'approved'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reviews_one_target CHECK ((num_nonnulls(business_id, place_id) = 1)),
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT reviews_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    category text,
    badge text DEFAULT ''::text NOT NULL,
    rating text DEFAULT '4.5'::text NOT NULL,
    services_summary text DEFAULT ''::text NOT NULL,
    price_text text DEFAULT ''::text NOT NULL,
    eta_text text DEFAULT ''::text NOT NULL,
    stats_text text DEFAULT ''::text NOT NULL,
    trust_note text DEFAULT ''::text NOT NULL,
    image_url text DEFAULT ''::text NOT NULL,
    action_label text DEFAULT 'Call Now'::text NOT NULL,
    phone text DEFAULT ''::text NOT NULL,
    city_id uuid,
    is_city_specialty boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    name text DEFAULT ''::text NOT NULL,
    phone text,
    email text,
    profile_image_url text,
    role text DEFAULT 'user'::text NOT NULL,
    selected_city_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    selected_location_name text,
    selected_location_lat double precision,
    selected_location_lng double precision,
    selected_location_google_place_id text,
    selected_location_country text,
    selected_location_country_code text,
    selected_location_state text,
    selected_location_locality text,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['user'::text, 'business_owner'::text, 'admin'::text])))
);


--
-- Name: bulk_import_jobs bulk_import_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bulk_import_jobs
    ADD CONSTRAINT bulk_import_jobs_pkey PRIMARY KEY (id);


--
-- Name: business_categories business_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_categories
    ADD CONSTRAINT business_categories_pkey PRIMARY KEY (business_id, category_id);


--
-- Name: business_claims business_claims_business_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_claims
    ADD CONSTRAINT business_claims_business_id_user_id_key UNIQUE (business_id, user_id);


--
-- Name: business_claims business_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_claims
    ADD CONSTRAINT business_claims_pkey PRIMARY KEY (id);


--
-- Name: business_hours business_hours_business_id_day_of_week_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_hours
    ADD CONSTRAINT business_hours_business_id_day_of_week_key UNIQUE (business_id, day_of_week);


--
-- Name: business_hours business_hours_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_hours
    ADD CONSTRAINT business_hours_pkey PRIMARY KEY (id);


--
-- Name: business_images business_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_images
    ADD CONSTRAINT business_images_pkey PRIMARY KEY (id);


--
-- Name: business_services business_services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_services
    ADD CONSTRAINT business_services_pkey PRIMARY KEY (id);


--
-- Name: business_submissions business_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_submissions
    ADD CONSTRAINT business_submissions_pkey PRIMARY KEY (id);


--
-- Name: businesses businesses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_pkey PRIMARY KEY (id);


--
-- Name: businesses businesses_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_slug_key UNIQUE (slug);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: cities cities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_pkey PRIMARY KEY (id);


--
-- Name: cities cities_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cities
    ADD CONSTRAINT cities_slug_key UNIQUE (slug);


--
-- Name: doctors doctors_business_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_business_id_key UNIQUE (business_id);


--
-- Name: doctors doctors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_pkey PRIMARY KEY (id);


--
-- Name: favorites favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (id);


--
-- Name: favorites favorites_unique_business; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_unique_business UNIQUE (user_id, business_id);


--
-- Name: favorites favorites_unique_offer; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_unique_offer UNIQUE (user_id, offer_id);


--
-- Name: favorites favorites_unique_place; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_unique_place UNIQUE (user_id, place_id);


--
-- Name: hotel_amenities hotel_amenities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_amenities
    ADD CONSTRAINT hotel_amenities_pkey PRIMARY KEY (hotel_id, amenity);


--
-- Name: hotels hotels_business_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotels
    ADD CONSTRAINT hotels_business_id_key UNIQUE (business_id);


--
-- Name: hotels hotels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotels
    ADD CONSTRAINT hotels_pkey PRIMARY KEY (id);


--
-- Name: menu_categories menu_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_categories
    ADD CONSTRAINT menu_categories_pkey PRIMARY KEY (id);


--
-- Name: menu_items menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: offer_images offer_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offer_images
    ADD CONSTRAINT offer_images_pkey PRIMARY KEY (id);


--
-- Name: offers offers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_pkey PRIMARY KEY (id);


--
-- Name: place_images place_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.place_images
    ADD CONSTRAINT place_images_pkey PRIMARY KEY (id);


--
-- Name: places places_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.places
    ADD CONSTRAINT places_pkey PRIMARY KEY (id);


--
-- Name: places places_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.places
    ADD CONSTRAINT places_slug_key UNIQUE (slug);


--
-- Name: restaurants restaurants_business_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurants
    ADD CONSTRAINT restaurants_business_id_key UNIQUE (business_id);


--
-- Name: restaurants restaurants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurants
    ADD CONSTRAINT restaurants_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: services services_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_slug_key UNIQUE (slug);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: bulk_import_jobs_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bulk_import_jobs_created_idx ON public.bulk_import_jobs USING btree (created_at DESC);


--
-- Name: bulk_import_jobs_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bulk_import_jobs_status_idx ON public.bulk_import_jobs USING btree (status) WHERE (status = ANY (ARRAY['queued'::text, 'running'::text]));


--
-- Name: business_categories_cat_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX business_categories_cat_idx ON public.business_categories USING btree (category_id);


--
-- Name: business_hours_biz_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX business_hours_biz_idx ON public.business_hours USING btree (business_id);


--
-- Name: business_images_biz_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX business_images_biz_idx ON public.business_images USING btree (business_id, sort_order);


--
-- Name: business_images_one_primary; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX business_images_one_primary ON public.business_images USING btree (business_id) WHERE is_primary;


--
-- Name: business_images_public_id_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX business_images_public_id_uidx ON public.business_images USING btree (public_id) WHERE (public_id IS NOT NULL);


--
-- Name: business_services_biz_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX business_services_biz_idx ON public.business_services USING btree (business_id);


--
-- Name: business_submissions_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX business_submissions_created_idx ON public.business_submissions USING btree (created_at DESC);


--
-- Name: business_submissions_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX business_submissions_status_idx ON public.business_submissions USING btree (status) WHERE (status = 'pending'::text);


--
-- Name: business_submissions_submitter_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX business_submissions_submitter_idx ON public.business_submissions USING btree (submitter_user_id);


--
-- Name: businesses_city_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX businesses_city_idx ON public.businesses USING btree (city_id);


--
-- Name: businesses_extref_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX businesses_extref_idx ON public.businesses USING btree (external_ref);


--
-- Name: businesses_featured_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX businesses_featured_idx ON public.businesses USING btree (is_featured) WHERE is_featured;


--
-- Name: businesses_google_place_id_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX businesses_google_place_id_uidx ON public.businesses USING btree (google_place_id) WHERE (google_place_id IS NOT NULL);


--
-- Name: businesses_kind_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX businesses_kind_idx ON public.businesses USING btree (kind);


--
-- Name: businesses_location_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX businesses_location_idx ON public.businesses USING gist (location);


--
-- Name: businesses_name_trgm_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX businesses_name_trgm_idx ON public.businesses USING gin (name public.gin_trgm_ops);


--
-- Name: businesses_owner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX businesses_owner_idx ON public.businesses USING btree (owner_id);


--
-- Name: businesses_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX businesses_status_idx ON public.businesses USING btree (status) WHERE (status = 'approved'::text);


--
-- Name: categories_parent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX categories_parent_idx ON public.categories USING btree (parent_id);


--
-- Name: categories_sort_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX categories_sort_idx ON public.categories USING btree (sort_order);


--
-- Name: cities_google_place_id_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cities_google_place_id_uidx ON public.cities USING btree (google_place_id) WHERE (google_place_id IS NOT NULL);


--
-- Name: doctors_spec_trgm_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX doctors_spec_trgm_idx ON public.doctors USING gin (specialization public.gin_trgm_ops);


--
-- Name: favorites_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX favorites_user_idx ON public.favorites USING btree (user_id);


--
-- Name: menu_categories_biz_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX menu_categories_biz_idx ON public.menu_categories USING btree (business_id);


--
-- Name: menu_items_biz_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX menu_items_biz_idx ON public.menu_items USING btree (business_id, sort_order);


--
-- Name: menu_items_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX menu_items_category_idx ON public.menu_items USING btree (menu_category_id);


--
-- Name: notifications_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_user_idx ON public.notifications USING btree (user_id, is_read);


--
-- Name: offer_images_offer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX offer_images_offer_idx ON public.offer_images USING btree (offer_id, sort_order);


--
-- Name: offer_images_one_primary; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX offer_images_one_primary ON public.offer_images USING btree (offer_id) WHERE is_primary;


--
-- Name: offer_images_public_id_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX offer_images_public_id_uidx ON public.offer_images USING btree (public_id) WHERE (public_id IS NOT NULL);


--
-- Name: offers_business_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX offers_business_idx ON public.offers USING btree (business_id);


--
-- Name: offers_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX offers_status_idx ON public.offers USING btree (status) WHERE (status = 'active'::text);


--
-- Name: offers_tag_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX offers_tag_idx ON public.offers USING btree (category_tag);


--
-- Name: offers_valid_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX offers_valid_idx ON public.offers USING btree (valid_until);


--
-- Name: place_images_one_primary; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX place_images_one_primary ON public.place_images USING btree (place_id) WHERE is_primary;


--
-- Name: place_images_place_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX place_images_place_idx ON public.place_images USING btree (place_id, sort_order);


--
-- Name: place_images_public_id_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX place_images_public_id_uidx ON public.place_images USING btree (public_id) WHERE (public_id IS NOT NULL);


--
-- Name: places_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX places_active_idx ON public.places USING btree (is_active) WHERE is_active;


--
-- Name: places_city_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX places_city_idx ON public.places USING btree (city_id);


--
-- Name: places_extref_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX places_extref_idx ON public.places USING btree (external_ref);


--
-- Name: places_location_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX places_location_idx ON public.places USING gist (location);


--
-- Name: reviews_business_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reviews_business_idx ON public.reviews USING btree (business_id);


--
-- Name: reviews_place_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reviews_place_idx ON public.reviews USING btree (place_id);


--
-- Name: reviews_unique_business; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX reviews_unique_business ON public.reviews USING btree (user_id, business_id) WHERE (business_id IS NOT NULL);


--
-- Name: reviews_unique_place; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX reviews_unique_place ON public.reviews USING btree (user_id, place_id) WHERE (place_id IS NOT NULL);


--
-- Name: reviews_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reviews_user_idx ON public.reviews USING btree (user_id);


--
-- Name: services_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX services_active_idx ON public.services USING btree (is_active) WHERE is_active;


--
-- Name: services_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX services_category_idx ON public.services USING btree (category);


--
-- Name: services_city_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX services_city_idx ON public.services USING btree (city_id);


--
-- Name: business_images business_images_max_five_trg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER business_images_max_five_trg BEFORE INSERT ON public.business_images FOR EACH ROW EXECUTE FUNCTION public.business_images_max_five();


--
-- Name: business_claims set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.business_claims FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: business_hours set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.business_hours FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: business_services set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.business_services FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: businesses set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: categories set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: cities set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.cities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: doctors set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.doctors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: hotels set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.hotels FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: menu_categories set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.menu_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: menu_items set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: offers set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: places set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.places FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: restaurants set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: reviews set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: services set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: users set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: bulk_import_jobs bulk_import_jobs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bulk_import_jobs
    ADD CONSTRAINT bulk_import_jobs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: business_categories business_categories_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_categories
    ADD CONSTRAINT business_categories_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: business_categories business_categories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_categories
    ADD CONSTRAINT business_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: business_claims business_claims_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_claims
    ADD CONSTRAINT business_claims_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: business_claims business_claims_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_claims
    ADD CONSTRAINT business_claims_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: business_hours business_hours_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_hours
    ADD CONSTRAINT business_hours_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: business_images business_images_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_images
    ADD CONSTRAINT business_images_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: business_services business_services_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_services
    ADD CONSTRAINT business_services_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: business_submissions business_submissions_submitter_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_submissions
    ADD CONSTRAINT business_submissions_submitter_user_id_fkey FOREIGN KEY (submitter_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: businesses businesses_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id) ON DELETE SET NULL;


--
-- Name: businesses businesses_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: doctors doctors_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: favorites favorites_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: favorites favorites_offer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE CASCADE;


--
-- Name: favorites favorites_place_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_place_id_fkey FOREIGN KEY (place_id) REFERENCES public.places(id) ON DELETE CASCADE;


--
-- Name: favorites favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: hotel_amenities hotel_amenities_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotel_amenities
    ADD CONSTRAINT hotel_amenities_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE CASCADE;


--
-- Name: hotels hotels_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hotels
    ADD CONSTRAINT hotels_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: menu_categories menu_categories_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_categories
    ADD CONSTRAINT menu_categories_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: menu_items menu_items_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: menu_items menu_items_menu_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_menu_category_id_fkey FOREIGN KEY (menu_category_id) REFERENCES public.menu_categories(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: offer_images offer_images_offer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offer_images
    ADD CONSTRAINT offer_images_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE CASCADE;


--
-- Name: offers offers_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: place_images place_images_place_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.place_images
    ADD CONSTRAINT place_images_place_id_fkey FOREIGN KEY (place_id) REFERENCES public.places(id) ON DELETE CASCADE;


--
-- Name: places places_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.places
    ADD CONSTRAINT places_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: places places_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.places
    ADD CONSTRAINT places_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id) ON DELETE SET NULL;


--
-- Name: restaurants restaurants_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurants
    ADD CONSTRAINT restaurants_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_place_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_place_id_fkey FOREIGN KEY (place_id) REFERENCES public.places(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: services services_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.cities(id) ON DELETE CASCADE;


--
-- Name: users users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: users users_selected_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_selected_city_id_fkey FOREIGN KEY (selected_city_id) REFERENCES public.cities(id) ON DELETE SET NULL;


--
-- Name: bulk_import_jobs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bulk_import_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: business_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.business_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: business_categories business_categories_owner_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY business_categories_owner_delete ON public.business_categories FOR DELETE TO authenticated USING ((public.owns_business(business_id) OR public.is_admin()));


--
-- Name: business_categories business_categories_owner_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY business_categories_owner_write ON public.business_categories FOR INSERT TO authenticated WITH CHECK ((public.owns_business(business_id) OR public.is_admin()));


--
-- Name: business_categories business_categories_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY business_categories_public_read ON public.business_categories FOR SELECT TO authenticated, anon USING (true);


--
-- Name: business_claims; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.business_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: business_claims business_claims_own_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY business_claims_own_insert ON public.business_claims FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: business_claims business_claims_own_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY business_claims_own_read ON public.business_claims FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_admin()));


--
-- Name: business_hours; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

--
-- Name: business_hours business_hours_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY business_hours_owner_all ON public.business_hours TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.businesses b
  WHERE ((b.id = business_hours.business_id) AND ((b.owner_id = auth.uid()) OR public.is_admin()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.businesses b
  WHERE ((b.id = business_hours.business_id) AND ((b.owner_id = auth.uid()) OR public.is_admin())))));


--
-- Name: business_hours business_hours_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY business_hours_public_read ON public.business_hours FOR SELECT TO authenticated, anon USING ((EXISTS ( SELECT 1
   FROM public.businesses b
  WHERE ((b.id = business_hours.business_id) AND (b.status = 'approved'::text)))));


--
-- Name: business_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.business_images ENABLE ROW LEVEL SECURITY;

--
-- Name: business_images business_images_owner_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY business_images_owner_delete ON public.business_images FOR DELETE TO authenticated USING ((public.owns_business(business_id) OR public.is_admin()));


--
-- Name: business_images business_images_owner_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY business_images_owner_write ON public.business_images FOR INSERT TO authenticated WITH CHECK ((public.owns_business(business_id) OR public.is_admin()));


--
-- Name: business_images business_images_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY business_images_public_read ON public.business_images FOR SELECT TO authenticated, anon USING (true);


--
-- Name: business_services; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.business_services ENABLE ROW LEVEL SECURITY;

--
-- Name: business_services business_services_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY business_services_owner_all ON public.business_services TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.businesses b
  WHERE ((b.id = business_services.business_id) AND ((b.owner_id = auth.uid()) OR public.is_admin()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.businesses b
  WHERE ((b.id = business_services.business_id) AND ((b.owner_id = auth.uid()) OR public.is_admin())))));


--
-- Name: business_services business_services_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY business_services_public_read ON public.business_services FOR SELECT TO authenticated, anon USING ((EXISTS ( SELECT 1
   FROM public.businesses b
  WHERE ((b.id = business_services.business_id) AND (b.status = 'approved'::text)))));


--
-- Name: business_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.business_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: businesses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

--
-- Name: businesses businesses_owner_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY businesses_owner_delete ON public.businesses FOR DELETE TO authenticated USING (((owner_id = auth.uid()) OR public.is_admin()));


--
-- Name: businesses businesses_owner_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY businesses_owner_insert ON public.businesses FOR INSERT TO authenticated WITH CHECK (((owner_id = auth.uid()) OR public.is_admin()));


--
-- Name: businesses businesses_owner_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY businesses_owner_update ON public.businesses FOR UPDATE TO authenticated USING (((owner_id = auth.uid()) OR public.is_admin())) WITH CHECK (((owner_id = auth.uid()) OR public.is_admin()));


--
-- Name: businesses businesses_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY businesses_public_read ON public.businesses FOR SELECT TO authenticated, anon USING (((status = 'approved'::text) OR (owner_id = auth.uid()) OR public.is_admin()));


--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: categories categories_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categories_admin_update ON public.categories FOR UPDATE TO authenticated USING (public.is_admin());


--
-- Name: categories categories_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categories_admin_write ON public.categories FOR INSERT TO authenticated WITH CHECK (public.is_admin());


--
-- Name: categories categories_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categories_public_read ON public.categories FOR SELECT TO authenticated, anon USING ((is_active OR public.is_admin()));


--
-- Name: cities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

--
-- Name: cities cities_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cities_public_read ON public.cities FOR SELECT TO authenticated, anon USING (true);


--
-- Name: doctors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

--
-- Name: doctors doctors_owner_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY doctors_owner_update ON public.doctors FOR UPDATE TO authenticated USING ((public.owns_business(business_id) OR public.is_admin())) WITH CHECK ((public.owns_business(business_id) OR public.is_admin()));


--
-- Name: doctors doctors_owner_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY doctors_owner_write ON public.doctors FOR INSERT TO authenticated WITH CHECK ((public.owns_business(business_id) OR public.is_admin()));


--
-- Name: doctors doctors_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY doctors_public_read ON public.doctors FOR SELECT TO authenticated, anon USING (true);


--
-- Name: favorites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

--
-- Name: favorites favorites_own_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY favorites_own_delete ON public.favorites FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: favorites favorites_own_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY favorites_own_insert ON public.favorites FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: favorites favorites_own_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY favorites_own_read ON public.favorites FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: hotel_amenities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hotel_amenities ENABLE ROW LEVEL SECURITY;

--
-- Name: hotel_amenities hotel_amenities_owner_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hotel_amenities_owner_delete ON public.hotel_amenities FOR DELETE TO authenticated USING ((public.owns_business(( SELECT h.business_id
   FROM public.hotels h
  WHERE (h.id = hotel_amenities.hotel_id))) OR public.is_admin()));


--
-- Name: hotel_amenities hotel_amenities_owner_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hotel_amenities_owner_write ON public.hotel_amenities FOR INSERT TO authenticated WITH CHECK ((public.owns_business(( SELECT h.business_id
   FROM public.hotels h
  WHERE (h.id = hotel_amenities.hotel_id))) OR public.is_admin()));


--
-- Name: hotel_amenities hotel_amenities_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hotel_amenities_public_read ON public.hotel_amenities FOR SELECT TO authenticated, anon USING (true);


--
-- Name: hotels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;

--
-- Name: hotels hotels_owner_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hotels_owner_update ON public.hotels FOR UPDATE TO authenticated USING ((public.owns_business(business_id) OR public.is_admin())) WITH CHECK ((public.owns_business(business_id) OR public.is_admin()));


--
-- Name: hotels hotels_owner_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hotels_owner_write ON public.hotels FOR INSERT TO authenticated WITH CHECK ((public.owns_business(business_id) OR public.is_admin()));


--
-- Name: hotels hotels_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hotels_public_read ON public.hotels FOR SELECT TO authenticated, anon USING (true);


--
-- Name: menu_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: menu_categories menu_categories_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY menu_categories_owner_all ON public.menu_categories TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.businesses b
  WHERE ((b.id = menu_categories.business_id) AND ((b.owner_id = auth.uid()) OR public.is_admin()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.businesses b
  WHERE ((b.id = menu_categories.business_id) AND ((b.owner_id = auth.uid()) OR public.is_admin())))));


--
-- Name: menu_categories menu_categories_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY menu_categories_public_read ON public.menu_categories FOR SELECT TO authenticated, anon USING ((EXISTS ( SELECT 1
   FROM public.businesses b
  WHERE ((b.id = menu_categories.business_id) AND (b.status = 'approved'::text)))));


--
-- Name: menu_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

--
-- Name: menu_items menu_items_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY menu_items_owner_all ON public.menu_items TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.businesses b
  WHERE ((b.id = menu_items.business_id) AND ((b.owner_id = auth.uid()) OR public.is_admin()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.businesses b
  WHERE ((b.id = menu_items.business_id) AND ((b.owner_id = auth.uid()) OR public.is_admin())))));


--
-- Name: menu_items menu_items_owner_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY menu_items_owner_delete ON public.menu_items FOR DELETE TO authenticated USING ((public.owns_business(business_id) OR public.is_admin()));


--
-- Name: menu_items menu_items_owner_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY menu_items_owner_write ON public.menu_items FOR INSERT TO authenticated WITH CHECK ((public.owns_business(business_id) OR public.is_admin()));


--
-- Name: menu_items menu_items_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY menu_items_public_read ON public.menu_items FOR SELECT TO authenticated, anon USING (true);


--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications notifications_own_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_own_read ON public.notifications FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR (user_id IS NULL)));


--
-- Name: notifications notifications_own_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_own_update ON public.notifications FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: offer_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.offer_images ENABLE ROW LEVEL SECURITY;

--
-- Name: offer_images offer_images_owner_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY offer_images_owner_delete ON public.offer_images FOR DELETE TO authenticated USING ((public.owns_business(( SELECT o.business_id
   FROM public.offers o
  WHERE (o.id = offer_images.offer_id))) OR public.is_admin()));


--
-- Name: offer_images offer_images_owner_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY offer_images_owner_write ON public.offer_images FOR INSERT TO authenticated WITH CHECK ((public.owns_business(( SELECT o.business_id
   FROM public.offers o
  WHERE (o.id = offer_images.offer_id))) OR public.is_admin()));


--
-- Name: offer_images offer_images_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY offer_images_public_read ON public.offer_images FOR SELECT TO authenticated, anon USING (true);


--
-- Name: offers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

--
-- Name: offers offers_owner_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY offers_owner_delete ON public.offers FOR DELETE TO authenticated USING ((public.owns_business(business_id) OR public.is_admin()));


--
-- Name: offers offers_owner_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY offers_owner_insert ON public.offers FOR INSERT TO authenticated WITH CHECK ((public.owns_business(business_id) OR public.is_admin()));


--
-- Name: offers offers_owner_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY offers_owner_update ON public.offers FOR UPDATE TO authenticated USING ((public.owns_business(business_id) OR public.is_admin())) WITH CHECK ((public.owns_business(business_id) OR public.is_admin()));


--
-- Name: offers offers_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY offers_public_read ON public.offers FOR SELECT TO authenticated, anon USING (((status = 'active'::text) OR public.owns_business(business_id) OR public.is_admin()));


--
-- Name: place_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.place_images ENABLE ROW LEVEL SECURITY;

--
-- Name: place_images place_images_admin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY place_images_admin_delete ON public.place_images FOR DELETE TO authenticated USING (public.is_admin());


--
-- Name: place_images place_images_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY place_images_admin_write ON public.place_images FOR INSERT TO authenticated WITH CHECK (public.is_admin());


--
-- Name: place_images place_images_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY place_images_public_read ON public.place_images FOR SELECT TO authenticated, anon USING (true);


--
-- Name: places; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;

--
-- Name: places places_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY places_admin_update ON public.places FOR UPDATE TO authenticated USING (public.is_admin());


--
-- Name: places places_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY places_admin_write ON public.places FOR INSERT TO authenticated WITH CHECK (public.is_admin());


--
-- Name: places places_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY places_public_read ON public.places FOR SELECT TO authenticated, anon USING ((is_active OR public.is_admin()));


--
-- Name: restaurants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

--
-- Name: restaurants restaurants_owner_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY restaurants_owner_update ON public.restaurants FOR UPDATE TO authenticated USING ((public.owns_business(business_id) OR public.is_admin())) WITH CHECK ((public.owns_business(business_id) OR public.is_admin()));


--
-- Name: restaurants restaurants_owner_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY restaurants_owner_write ON public.restaurants FOR INSERT TO authenticated WITH CHECK ((public.owns_business(business_id) OR public.is_admin()));


--
-- Name: restaurants restaurants_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY restaurants_public_read ON public.restaurants FOR SELECT TO authenticated, anon USING (true);


--
-- Name: reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: reviews reviews_own_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reviews_own_insert ON public.reviews FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (status = 'pending'::text)));


--
-- Name: reviews reviews_own_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reviews_own_update ON public.reviews FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: reviews reviews_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reviews_public_read ON public.reviews FOR SELECT TO authenticated, anon USING (((status = 'approved'::text) OR (user_id = auth.uid()) OR public.is_admin()));


--
-- Name: services; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

--
-- Name: services services_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY services_public_read ON public.services FOR SELECT TO authenticated, anon USING (true);


--
-- Name: business_submissions submissions_public_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY submissions_public_insert ON public.business_submissions FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: users users_read_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_read_self ON public.users FOR SELECT TO authenticated USING (((id = auth.uid()) OR public.is_admin()));


--
-- Name: users users_update_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_update_self ON public.users FOR UPDATE TO authenticated USING ((id = auth.uid())) WITH CHECK (((id = auth.uid()) AND (role = ( SELECT users_1.role
   FROM public.users users_1
  WHERE (users_1.id = auth.uid())))));


--
-- PostgreSQL database dump complete
--

\unrestrict 4AFNau7rj6hDeXvsNKuGhJftv9AZ9MkuxYc4zmNf86D3V3418hhgj88jp24DFFf


-- ── Supabase role grants (pg_dump --no-privileges skips these) ───────────
-- anon = guest browsing (public_read policies), authenticated = logged-in users.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT INSERT, UPDATE, DELETE ON TABLES TO authenticated;
