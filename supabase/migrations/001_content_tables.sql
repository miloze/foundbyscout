-- ── Found By Scout — Content Tables Migration ────────────────────────────────
-- Run this in your Supabase SQL editor AFTER the existing schema.sql
-- This adds: parks, field_notes, curated_by, curated_by_things,
--            curated_by_interview, music

-- ── PARKS ──────────────────────────────────────────────────────────────────

CREATE TABLE parks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              text UNIQUE NOT NULL,
  name              text NOT NULL,
  address           text[]    DEFAULT '{}',
  postcode          text,
  borough           text,
  location          text,          -- display string e.g. "South London"
  type              text,          -- "Bowl", "Street", "Historic" …
  surface           text,
  surface_note      text,
  is_free           boolean   DEFAULT false,
  is_covered        boolean   DEFAULT false,
  opened            text,
  builder           text,
  managed_by        text,
  description       text[]    DEFAULT '{}',
  brief             text,          -- one-line map card description
  facts             text[]    DEFAULT '{}',
  scout             text,          -- scout's personal commentary
  lat               numeric(10,7),
  lng               numeric(10,7),
  hero_image        text,
  model_file        text,
  use_contour_model boolean   DEFAULT false,
  camera_pos        numeric[] DEFAULT '{}',
  camera_target     numeric[] DEFAULT '{}',
  model_rotation    numeric[] DEFAULT '{}',
  glance            jsonb     DEFAULT '[]',
  transport         jsonb     DEFAULT '[]',
  hours             jsonb     DEFAULT '[]',
  facilities        jsonb     DEFAULT '[]',
  gallery           jsonb     DEFAULT '[]',
  spots             jsonb     DEFAULT '[]',
  socials           jsonb     DEFAULT '[]',
  sort_order        int       DEFAULT 0,
  published         boolean   DEFAULT true,
  created_at        timestamptz DEFAULT now()
);

CREATE INDEX idx_parks_slug      ON parks(slug);
CREATE INDEX idx_parks_published ON parks(published);

-- ── FIELD NOTES ────────────────────────────────────────────────────────────

CREATE TABLE field_notes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text UNIQUE NOT NULL,
  title        text NOT NULL,
  category     text,              -- "Interview", "Regional", "Spotlight", "Essay"
  blurb        text,              -- standfirst / listing summary
  body         text,              -- full article body (markdown or HTML)
  hero_image   text,
  published    boolean   DEFAULT false,
  published_at timestamptz,
  sort_order   int       DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX idx_field_notes_published ON field_notes(published);

-- ── CURATED BY ─────────────────────────────────────────────────────────────

CREATE TABLE curated_by (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       text UNIQUE NOT NULL,
  vol        text,              -- "Vol. 001"
  curator    text NOT NULL,
  location   text,
  bio        text,
  published  boolean   DEFAULT false,
  sort_order int       DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE curated_by_things (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_slug text NOT NULL REFERENCES curated_by(slug) ON DELETE CASCADE,
  label      text,
  caption    text,
  image      text,
  sort_order int DEFAULT 0
);

CREATE TABLE curated_by_interview (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_slug text NOT NULL REFERENCES curated_by(slug) ON DELETE CASCADE,
  question   text,
  answer     text,
  sort_order int DEFAULT 0
);

CREATE TABLE curated_by_mixtape (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_slug text NOT NULL REFERENCES curated_by(slug) ON DELETE CASCADE,
  title      text,
  url        text
);

-- ── MUSIC ──────────────────────────────────────────────────────────────────

CREATE TABLE music (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vol          text,
  region       text,
  curator      text,
  bio          text,
  mixcloud_url text,
  published    boolean   DEFAULT false,
  sort_order   int       DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

-- ── ROW LEVEL SECURITY ─────────────────────────────────────────────────────

ALTER TABLE parks               ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_notes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE curated_by          ENABLE ROW LEVEL SECURITY;
ALTER TABLE curated_by_things   ENABLE ROW LEVEL SECURITY;
ALTER TABLE curated_by_interview ENABLE ROW LEVEL SECURITY;
ALTER TABLE curated_by_mixtape  ENABLE ROW LEVEL SECURITY;
ALTER TABLE music               ENABLE ROW LEVEL SECURITY;

-- Public reads published content
CREATE POLICY "Public read parks"
  ON parks FOR SELECT USING (published = true);

CREATE POLICY "Public read field_notes"
  ON field_notes FOR SELECT USING (published = true);

CREATE POLICY "Public read curated_by"
  ON curated_by FOR SELECT USING (published = true);

CREATE POLICY "Public read curated_by_things"
  ON curated_by_things FOR SELECT USING (true);

CREATE POLICY "Public read curated_by_interview"
  ON curated_by_interview FOR SELECT USING (true);

CREATE POLICY "Public read curated_by_mixtape"
  ON curated_by_mixtape FOR SELECT USING (true);

CREATE POLICY "Public read music"
  ON music FOR SELECT USING (published = true);

-- ── STORAGE BUCKET ─────────────────────────────────────────────────────────
-- Create the park-images bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('park-images', 'park-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read park-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'park-images');

CREATE POLICY "Service role upload park-images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'park-images');

CREATE POLICY "Service role delete park-images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'park-images');
