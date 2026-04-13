-- ── Found By Scout — Supabase Schema ──────────────────────────────────────
-- Run this in Supabase SQL editor to set up the bounty/submissions system.
-- Parks and spots are seeded manually; bounties and submissions are live.

-- ── SPOTS ──────────────────────────────────────────────────────────────────
-- Named zones within a park (e.g. "Cloverleaf Pool", "L-Shaped Bowl")
CREATE TABLE spots (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  park_slug     text NOT NULL,           -- matches the URL slug, e.g. "crystal-palace"
  name          text NOT NULL,           -- "Cloverleaf Pool"
  description   text,                   -- "8.5ft deep, tile and coping"
  position_label text,                  -- "North end of the park"
  sort_order    int  DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_spots_park_slug ON spots(park_slug);

-- ── BOUNTIES ───────────────────────────────────────────────────────────────
-- One active bounty per spot at a time.
-- When claimed, status → 'claimed' and claimed_submission_id is set.
-- A new bounty is then created manually by Scout.
CREATE TABLE bounties (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id               uuid REFERENCES spots(id) ON DELETE CASCADE,
  title                 text NOT NULL,     -- "First backside air over the pool hip"
  description           text,             -- Optional longer context / rules
  difficulty            text CHECK (difficulty IN ('open','easy','medium','hard')) DEFAULT 'open',
  status                text CHECK (status IN ('open','claimed','expired')) DEFAULT 'open',
  set_at                timestamptz DEFAULT now(),
  expires_at            timestamptz,       -- NULL = no expiry
  claimed_at            timestamptz,
  claimed_submission_id uuid               -- FK added below after submissions table
);

CREATE INDEX idx_bounties_spot_id ON bounties(spot_id);
CREATE INDEX idx_bounties_status  ON bounties(status);

-- ── SUBMISSIONS ────────────────────────────────────────────────────────────
-- Clip links submitted by the community against an open bounty.
CREATE TABLE submissions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_id     uuid REFERENCES bounties(id) ON DELETE CASCADE,
  skater_name   text NOT NULL,
  skater_handle text,                      -- "@handle" — Instagram, TikTok etc
  clip_url      text NOT NULL,
  platform      text CHECK (platform IN ('instagram','youtube','tiktok','other')),
  submitted_at  timestamptz DEFAULT now(),
  votes         int DEFAULT 0,
  status        text CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  notes         text                       -- Internal Scout review notes
);

CREATE INDEX idx_submissions_bounty_id ON submissions(bounty_id);
CREATE INDEX idx_submissions_status    ON submissions(status);

-- Add the FK back to bounties now submissions exists
ALTER TABLE bounties
  ADD CONSTRAINT fk_claimed_submission
  FOREIGN KEY (claimed_submission_id) REFERENCES submissions(id);

-- ── PARK IMAGES ────────────────────────────────────────────────────────────
-- Tracks editorial gallery images per park (and optionally per spot).
-- For now these point to files in /public/images/parks/{slug}/.
-- When Supabase Storage is wired up, storage_url replaces the path.
CREATE TABLE park_images (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  park_slug   text NOT NULL,
  spot_id     uuid REFERENCES spots(id) ON DELETE SET NULL,  -- NULL = park-level image
  path        text NOT NULL,   -- e.g. "/images/parks/crystal-palace/gallery-01.webp"
  type        text CHECK (type IN ('photo','gif')) DEFAULT 'photo',
  caption     text,
  credit      text,            -- "Scout / Sony RX100"
  sort_order  int DEFAULT 0,
  is_hero     boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_park_images_park_slug ON park_images(park_slug);

-- ── ROW LEVEL SECURITY ─────────────────────────────────────────────────────
ALTER TABLE spots       ENABLE ROW LEVEL SECURITY;
ALTER TABLE bounties    ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE park_images ENABLE ROW LEVEL SECURITY;

-- Public can read spots, bounties, approved submissions, and images
CREATE POLICY "Public read spots"       ON spots       FOR SELECT USING (true);
CREATE POLICY "Public read bounties"    ON bounties    FOR SELECT USING (true);
CREATE POLICY "Public read submissions" ON submissions FOR SELECT USING (status = 'approved');
CREATE POLICY "Public read images"      ON park_images FOR SELECT USING (true);

-- Anyone can insert a submission (pending review)
CREATE POLICY "Public submit clips"     ON submissions FOR INSERT WITH CHECK (status = 'pending');

-- ── SEED DATA — Crystal Palace ─────────────────────────────────────────────
INSERT INTO spots (park_slug, name, description, position_label, sort_order) VALUES
  ('crystal-palace', 'Cloverleaf Pool',   '8.5ft deep, tile and coping. Three connected kidney shapes.', 'North end', 1),
  ('crystal-palace', 'L-Shaped Bowl',     'Transitions from 5.5ft to 7ft. Flows into the pool section.', 'Centre', 2),
  ('crystal-palace', 'Street Section',    'Mellow banks, ledge, and flat. Entry-level friendly.', 'South end', 3);

-- Bounties (open — to be updated once live)
INSERT INTO bounties (spot_id, title, difficulty, status)
SELECT id, 'First proper frontside grind on the pool coping', 'hard', 'open'
FROM spots WHERE park_slug = 'crystal-palace' AND name = 'Cloverleaf Pool';

INSERT INTO bounties (spot_id, title, difficulty, status)
SELECT id, 'Best line linking all three bowl sections without stopping', 'medium', 'open'
FROM spots WHERE park_slug = 'crystal-palace' AND name = 'L-Shaped Bowl';

INSERT INTO bounties (spot_id, title, difficulty, status)
SELECT id, 'Best nosegrind on the main ledge', 'easy', 'open'
FROM spots WHERE park_slug = 'crystal-palace' AND name = 'Street Section';
