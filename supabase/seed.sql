-- Pub Scrawl — Phase 1 seed data
-- 20 real London pubs, 2 dummy submission photos each (via picsum.photos).
-- Run after 0001_init.sql. Safe to re-run: truncates first.

truncate submissions, venues restart identity cascade;

with new_venues as (
  insert into venues (name, address, lat, lng) values
    ('The Churchill Arms',         '119 Kensington Church St, W8 7LN',   51.5065, -0.1942),
    ('The Mayflower',              '117 Rotherhithe St, SE16 4NF',       51.5016, -0.0519),
    ('The Prospect of Whitby',     '57 Wapping Wall, E1W 3SH',           51.5077, -0.0478),
    ('The George Inn',             '77 Borough High St, SE1 1NH',        51.5036, -0.0896),
    ('The Dove',                   '19 Upper Mall, W6 9TA',              51.4916, -0.2339),
    ('The Anchor',                 '34 Park St, SE1 9EF',                51.5073, -0.0935),
    ('Ye Olde Cheshire Cheese',    '145 Fleet St, EC4A 2BU',             51.5144, -0.1076),
    ('The Lamb & Flag',            '33 Rose St, WC2E 9EB',               51.5124, -0.1248),
    ('The Blackfriar',             '174 Queen Victoria St, EC4V 4EG',    51.5119, -0.1047),
    ('The French House',           '49 Dean St, W1D 5BG',                51.5125, -0.1320),
    ('The Coach & Horses',         '29 Greek St, W1D 5DH',               51.5128, -0.1321),
    ('The Spaniards Inn',          'Spaniards Rd, NW3 7JJ',              51.5708, -0.1744),
    ('The Holly Bush',             '22 Holly Mount, NW3 6SG',            51.5583, -0.1783),
    ('The Jerusalem Tavern',       '55 Britton St, EC1M 5UQ',            51.5217, -0.1034),
    ('The Cittie of Yorke',        '22 High Holborn, WC1V 6BN',          51.5178, -0.1136),
    ('The Harp',                   '47 Chandos Pl, WC2N 4HS',            51.5089, -0.1263),
    ('The Seven Stars',            '53 Carey St, WC2A 2JB',              51.5158, -0.1125),
    ('The Pride of Spitalfields',  '3 Heneage St, E1 5LJ',               51.5192, -0.0729),
    ('The Ten Bells',              '84 Commercial St, E1 6LY',           51.5197, -0.0740),
    ('The Grapes',                 '76 Narrow St, E14 8BP',              51.5087, -0.0341)
  returning id, name
)
insert into submissions (venue_id, photo_url)
select
  v.id,
  'https://picsum.photos/seed/' || regexp_replace(lower(v.name), '[^a-z0-9]+', '-', 'g') || '-' || n || '/600/800'
from new_venues v
cross join generate_series(1, 2) as n;
