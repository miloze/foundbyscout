-- ── Found By Scout — Seed Data ───────────────────────────────────────────────
-- Run this AFTER 001_content_tables.sql
-- If you already ran a broken version, run this first:
--   DELETE FROM curated_by_mixtape; DELETE FROM curated_by_interview;
--   DELETE FROM curated_by_things; DELETE FROM curated_by; DELETE FROM field_notes;
--   DELETE FROM music; DELETE FROM parks;

-- ── PARKS ──────────────────────────────────────────────────────────────────

INSERT INTO parks (slug, name, address, postcode, borough, location, type, surface, surface_note, is_free, is_covered, opened, builder, managed_by, description, brief, facts, lat, lng, hero_image, model_file, use_contour_model, camera_pos, camera_target, model_rotation, ping_pong, glance, transport, hours, facilities, gallery, spots, socials, sort_order, published)
VALUES
(
  'crystal-palace',
  'Crystal Palace Skatepark',
  ARRAY['Crystal Palace Park', 'Ledrington Road', 'London'],
  'SE19 2BA', 'Bromley', 'South London', 'Bowl',
  'Smooth concrete', 'New poured slab — opened March 2018',
  true, false,
  'March 2018', 'Canvas Skateparks', 'GLL / London Borough of Bromley',
  ARRAY[
    'Crystal Palace is a landmark south London skatepark on the site of the UK''s first national skateboarding competition in 1977. Designed by Canvas Skateparks in collaboration with Kinnear Landscape Architects and local riders, it opened in March 2018 after years of community campaigning.',
    'The park is arranged in three distinct zones. The cloverleaf pool is genuinely world-class — 8.5ft deep with tile and coping, unlike anything else in London. The L-shaped bowl transitions from 5.5ft to 7ft, and a mellow street section makes the park accessible for beginners.',
    'Set within Crystal Palace Park, the surrounding green space and proximity to the NSC makes it one of the most complete skate destinations in the south of England.'
  ],
  'A world-class concrete park in South London. Cloverleaf pool, L-shaped bowl, street section.',
  ARRAY['8.5ft cloverleaf pool', 'L-shaped bowl 5.5–7ft', 'Mellow street section', 'Crystal Palace Park'],
  51.4156, -0.0719,
  '/images/parks/crystal-palace/gallery-01.webp',
  '/images/parks/crystal-palace/model.glb', true,
  ARRAY[-18.0, 20.0, 20.0]::numeric[],
  ARRAY[0.0, 0.0, 0.0]::numeric[],
  ARRAY[-1.5707963, 0.0, 0.0]::numeric[],
  NULL,
  '[{"icon":"wb_sunny","value":"Outdoor","label":"Setting","available":true},{"icon":"bolt","value":"No floodlights","label":"Lighting","available":false},{"icon":"park","value":"Crystal Palace Park","label":"Green Space","available":true},{"icon":"local_parking","value":"Park car parks","label":"Car Park","available":true},{"icon":"wc","value":"Nearby","label":"Toilets","available":true},{"icon":"coffee","value":"In park","label":"Café","available":true},{"icon":"sports","value":"Bowl","label":"Style","available":true},{"icon":"confirmation_number","value":"Free","label":"Entry","available":true}]'::jsonb,
  '[{"type":"rail","name":"Crystal Palace","detail":"London Overground · 5 min walk"},{"type":"bus","name":"Routes 3, 157, 249","detail":"Crystal Palace stop · 2 min walk"},{"type":"bus","name":"Routes 122, 322, 358","detail":"Crystal Palace Park stop · 4 min walk"}]'::jsonb,
  '[{"days":"Mon – Sun","time":"08:00 – 20:00"}]'::jsonb,
  '[{"icon":"wc","name":"Toilets","status":"Nearby","available":true},{"icon":"coffee","name":"Café","status":"In park","available":true},{"icon":"local_parking","name":"Car Park","status":"Adjacent","available":true},{"icon":"park","name":"Green Space","status":"Yes","available":true},{"icon":"bolt","name":"Floodlights","status":"None","available":false}]'::jsonb,
  '[{"src":"/images/parks/crystal-palace/gallery-01.webp","span":"wide"},{"src":"/images/parks/crystal-palace/gallery-02.webp","span":"normal"},{"src":"/images/parks/crystal-palace/gallery-03.webp","span":"normal"},{"src":"/images/parks/crystal-palace/gallery-04.webp","span":"normal"},{"src":"/images/parks/crystal-palace/gallery-05.webp","span":"normal"},{"src":"/images/parks/crystal-palace/gallery-06.webp","span":"full"},{"src":"/images/parks/crystal-palace/gallery-07.webp","span":"normal"},{"src":"/images/parks/crystal-palace/gallery-08.webp","span":"wide"},{"src":"/images/parks/crystal-palace/gallery-09.webp","span":"normal"},{"src":"/images/parks/crystal-palace/gallery-10.webp","span":"normal"},{"src":"/images/parks/crystal-palace/gallery-11.webp","span":"normal"},{"src":"/images/parks/crystal-palace/gallery-12.webp","span":"normal"},{"src":"/images/parks/crystal-palace/gallery-13.webp","span":"wide"},{"src":"/images/parks/crystal-palace/gallery-14.webp","span":"normal"}]'::jsonb,
  '[{"name":"Cloverleaf Pool","description":"8.5ft deep, tile and coping. Three connected kidney shapes — the deepest and most technical section of the park.","position":"North end","bounty":"First proper frontside grind on the pool coping","difficulty":"hard"},{"name":"L-Shaped Bowl","description":"Transitions from 5.5ft to 7ft across its length. Flows naturally into the pool section.","position":"Centre","bounty":"Best line linking all three bowl sections without stopping","difficulty":"medium"},{"name":"Street Section","description":"Mellow banks, a ledge, and flat ground. The most accessible part of the park — a good warm-up before the bowls.","position":"South end","bounty":"Best nosegrind on the main ledge","difficulty":"easy"}]'::jsonb,
  '[{"platform":"instagram","url":"https://instagram.com/crystalpalaceskatepark"},{"platform":"facebook","url":"https://facebook.com/crystalpalaceskatepark"},{"platform":"website","url":"https://gll.org","label":"GLL"}]'::jsonb,
  1, true
),
(
  'southbank',
  'Southbank Undercroft',
  ARRAY['Belvedere Road', 'South Bank', 'London'],
  'SE1 8XX', 'Southwark', 'Waterloo', 'Historic',
  'Original rough concrete', 'Original early-1970s poured slab — never resurfaced',
  true, true,
  'c. 1973', 'Community', 'Long Live Southbank / Southbank Centre',
  ARRAY[
    'The Southbank Undercroft has been a skate spot since the early 1970s — the most culturally significant piece of concrete in the world. Tucked beneath the Hayward Gallery and Queen Elizabeth Hall, skaters have claimed this low-ceilinged, column-filled space for over fifty years.',
    'In 2013 the Southbank Centre announced plans to redevelop the undercroft into retail units. The campaign to save it — led by Long Live Southbank — became one of the most successful grassroots preservation efforts in skateboarding history. By 2014 the space was secured in perpetuity for skateboarding.',
    'Covered and rideable in all weather, open 24 hours. The rough original concrete, low ceiling and constant hum of the city above make it unlike any other skate spot on earth.'
  ],
  'The most culturally significant skate spot in the world. Open 24/7, covered, free.',
  ARRAY['Open 24/7', 'Covered', 'Historic since 1973', 'South Bank Centre'],
  51.5064, -0.1153,
  '/images/parks/southbank/gallery-01.webp',
  '/images/parks/southbank/model.glb', false,
  ARRAY[0.0, 7.0, 18.0]::numeric[],
  ARRAY[0.0, 7.0, 0.0]::numeric[],
  ARRAY[0.0, 3.14159265, 0.0]::numeric[],
  '[[24.91, 8.44, -6.79], [-23.18, 9.11, -10.73]]'::jsonb,
  '[{"icon":"roofing","value":"Covered","label":"Setting","available":true},{"icon":"bolt","value":"Ambient only","label":"Lighting","available":true},{"icon":"schedule","value":"24 / 7","label":"Hours","available":true},{"icon":"local_parking","value":"None nearby","label":"Car Park","available":false},{"icon":"wc","value":"Southbank Centre","label":"Toilets","available":true},{"icon":"coffee","value":"Multiple nearby","label":"Café","available":true},{"icon":"sports","value":"Street / Banks","label":"Style","available":true},{"icon":"confirmation_number","value":"Free","label":"Entry","available":true}]'::jsonb,
  '[{"type":"tube","name":"Waterloo","detail":"Jubilee, Northern, Bakerloo, Waterloo & City · 5 min walk"},{"type":"tube","name":"Embankment","detail":"District & Circle lines · 8 min walk"},{"type":"rail","name":"Waterloo","detail":"National Rail · 5 min walk"}]'::jsonb,
  '[{"days":"Mon – Sun","time":"Open 24/7"}]'::jsonb,
  '[{"icon":"roofing","name":"Covered","status":"Yes — fully","available":true},{"icon":"bolt","name":"Floodlights","status":"Ambient / city light","available":true},{"icon":"wc","name":"Toilets","status":"Southbank Centre","available":true},{"icon":"coffee","name":"Café","status":"Multiple nearby","available":true},{"icon":"local_parking","name":"Car Park","status":"None — city centre","available":false}]'::jsonb,
  '[]'::jsonb,
  '[{"name":"The Bump","description":"The centrepiece. A low concrete wedge that''s been the launch pad for fifty years of clips. Deceptively technical — the low ceiling changes everything.","position":"Centre","bounty":"Best trick over the bump — anything that clears the pillar","difficulty":"medium"},{"name":"The Banks","description":"Smooth angled concrete running the length of the undercroft. Every style of skating works here — the columns create natural lines.","position":"Both sides","bounty":"Longest line using both banks without touching flat","difficulty":"easy"},{"name":"The Ledges","description":"Original concrete ledges ground down by decades of wax and grinding. Each one slightly different — nothing is perfectly square.","position":"Throughout","bounty":"Switch nosegrind the main ledge","difficulty":"hard"},{"name":"Manual Pad","description":"Flat-top concrete block at the south end. Low enough to be approachable, worn enough to be honest.","position":"South end","bounty":"Nose manual the full length","difficulty":"medium"}]'::jsonb,
  '[{"platform":"instagram","url":"https://www.instagram.com/longlivesouthbank","label":"Long Live Southbank"},{"platform":"website","url":"https://www.llsb.com","label":"LLSB"}]'::jsonb,
  2, true
),
(
  'stockwell',
  'Stockwell Skatepark',
  ARRAY['Stockwell Road', 'Brixton', 'London'],
  'SW9 9SL', 'Lambeth', 'South London', 'Bowl',
  'Smooth concrete', 'Original 1978 slab — restored 2023/24',
  true, false,
  '1978', 'Lorne Edwards', 'London Borough of Lambeth',
  ARRAY[
    'Stockwell is one of London''s oldest surviving skateparks and arguably its most culturally significant. Built in 1978 by Lorne Edwards — who also built the UK''s first skatepark in Portland, Dorset — it sits behind Brixton Academy on Stockwell Road.',
    'The park is an organic, free-flowing concrete landscape unlike any standardised modern park. Renovated by Betongpark in 2023/24, restoring its iconic red surface.'
  ],
  'One of London''s oldest surviving skateparks. Organic bowl layout, renovated 2023/24.',
  ARRAY['Built 1978', 'Free-flowing bowl layout', 'Restored 2023/24', 'Behind Brixton Academy'],
  51.4671, -0.1157,
  '/images/parks/stockwell/gallery-01.webp',
  '/images/parks/stockwell/model.glb', true,
  ARRAY[0.0, 5.0, 31.0]::numeric[],
  ARRAY[0.0, 0.0, 0.0]::numeric[],
  ARRAY[0.0, 1.5707963, 0.0]::numeric[],
  NULL,
  '[{"icon":"wb_sunny","value":"Outdoor","label":"Setting","available":true},{"icon":"bolt","value":"No floodlights","label":"Lighting","available":false},{"icon":"park","value":"Adjacent","label":"Green Space","available":true},{"icon":"local_parking","value":"Street only","label":"Car Park","available":false},{"icon":"wc","value":"None","label":"Toilets","available":false},{"icon":"coffee","value":"None","label":"Café","available":false},{"icon":"sports","value":"Bowl / Snake Run","label":"Style","available":true},{"icon":"confirmation_number","value":"Free","label":"Entry","available":true}]'::jsonb,
  '[{"type":"tube","name":"Stockwell","detail":"Victoria & Northern lines · 8 min walk"},{"type":"tube","name":"Brixton","detail":"Victoria line · 12 min walk"},{"type":"bus","name":"Routes 2, 88, 155","detail":"Stockwell Road stop · 2 min walk"}]'::jsonb,
  '[{"days":"Mon – Sun","time":"Open 24/7"}]'::jsonb,
  '[{"icon":"wc","name":"Toilets","status":"None","available":false},{"icon":"coffee","name":"Café","status":"None","available":false},{"icon":"local_parking","name":"Car Park","status":"None","available":false},{"icon":"park","name":"Green Space","status":"Adjacent","available":true},{"icon":"bolt","name":"Floodlights","status":"None","available":false}]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  3, true
);

-- ── FIELD NOTES ────────────────────────────────────────────────────────────

INSERT INTO field_notes (slug, title, category, blurb, published, sort_order) VALUES
('the-unsung-builder',                 'The Unsung Builder',                       'Interview', 'The man who built three DIY spots and never asked for credit.',                        true, 1),
('north-west-right-now',               'The North West Right Now',                 'Regional',  'Five parks worth the drive, one city that''s quietly become essential.',                true, 2),
('rom-skatepark',                      'Rom Skatepark',                            'Spotlight', 'Britain''s oldest concrete skatepark turns 50.',                                       true, 3),
('why-skateparks-look-the-way-they-do','Why Skateparks Look the Way They Do',      'Essay',     'Sixty years of concrete, community, and compromise.',                                   true, 4),
('scotlands-hidden-parks',             'Scotland''s Hidden Parks',                 'Regional',  'From Livingston to the islands — the parks that don''t make the lists.',                true, 5);

-- ── CURATED BY ─────────────────────────────────────────────────────────────

INSERT INTO curated_by (slug, vol, curator, location, bio, published, sort_order) VALUES
('jess-bristol',    'Vol. 001', 'Jess',  'Bristol',    'Skating Lloyds before it gets busy, then whatever feels right after.',      true,  1),
('theo-manchester', 'Vol. 002', 'Theo',  'Manchester', 'The parks you''d never know about unless someone showed you.',               false, 2),
('ailsa-edinburgh', 'Vol. 003', 'Ailsa', 'Edinburgh',  'Cobblestones, closes, and one perfect concrete bowl hidden in plain sight.', false, 3);

-- Jess — Five Things
INSERT INTO curated_by_things (issue_slug, label, caption, sort_order) VALUES
('jess-bristol', 'Lurking Class', 'Dark graphics, darker humour. Always relevant.',  1),
('jess-bristol', 'Krooked',       'Gonz energy. Sketch pads and slappies.',          2),
('jess-bristol', 'Bristol Beacon','Best venue in the city. Acoustics are unreal.',   3),
('jess-bristol', 'Mild weather',  '70°F and overcast. Perfect skating conditions.',  4),
('jess-bristol', 'Early sessions','No one around. Fresh wax on everything.',         5);

-- Jess — Interview
INSERT INTO curated_by_interview (issue_slug, question, answer, sort_order) VALUES
('jess-bristol', 'How did you get into skating in Bristol?',
  'Moved here for uni. Walked past Lloyds on the first day and never looked back.', 1),
('jess-bristol', 'What''s the spot that defines the city for you?',
  'Lloyds, obviously. But there''s a little marble ledge behind the waterfront that nobody really talks about. That''s mine.', 2),
('jess-bristol', 'Five things — how''d you pick them?',
  'Stuff I''d grab if I had ten minutes to pack a bag. No overthinking.', 3);

-- Jess — Mixtape
INSERT INTO curated_by_mixtape (issue_slug, title, url) VALUES
('jess-bristol', 'Temporal Cove w/ Pavement',
  'https://www.mixcloud.com/NTSRadio/temporal-cove-w-pavement-15th-january-2026/');

-- ── MUSIC ──────────────────────────────────────────────────────────────────

INSERT INTO music (vol, region, curator, bio, mixcloud_url, published, sort_order) VALUES
('Vol. 001', 'Bristol', 'Jess',
  'Skating Lloyds before it gets busy, then whatever feels right after.',
  'https://www.mixcloud.com/NTSRadio/temporal-cove-w-pavement-15th-january-2026/',
  true, 1);
