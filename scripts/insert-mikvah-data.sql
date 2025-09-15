-- Insert Mikvah Data into Database
-- Date: 2025-01-14
-- Description: Insert comprehensive mikvah data for South Florida

-- Start transaction
BEGIN;

-- Insert mikvah records
INSERT INTO mikvah (
    name, 
    address, 
    city, 
    state, 
    zip_code,
    phone_number,
    website,
    email,
    mikvah_type,
    appointment_required,
    created_at,
    updated_at
) VALUES 
(
    'Alicia Bat Freida Mikvah',
    '2655 NE 207th St',
    'Ojus',
    'FL',
    '33180',
    '954-258-5611',
    'kosherderech.com',
    
    'Women''s',
    
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'Anidjar Mikvah – Bnai Sephardim',
    '3670 Stirling Rd',
    'Hollywood',
    'FL',
    '33312',
    '850-586-1571',
    
    'mikveh@mybnai.com',
    'Women''s',
    
    
    
    
    
    
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'Chabad of Greater Ft. Lauderdale Mikvah',
    '6700 NW 44th St',
    'Lauderhill',
    'FL',
    '33319',
    '954-777-9906',
    
    
    'Women''s',
    'Rabbi Aron Lieberman',
    
    
    
    
    
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'Coral Springs Mikvah – Chabad of Coral Springs',
    '3925 N University Dr',
    'Coral Springs',
    'FL',
    '33065',
    '754-368-1050',
    'coralspringschabad.org',
    
    'Women''s',
    'Rabbi Yossi Denburg',
    
    
    
    
    
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'Grace Cayre Ladies Mikvah (Safra Synagogue)',
    '19275 Mystic Pointe Dr',
    'Aventura',
    'FL',
    '33180',
    '305-937-4313',
    
    
    'Women''s',
    
    
    
    
    
    
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'Mei Menachem Mikvah Israel',
    '1295 E Hallandale Beach Blvd',
    'Hallandale Beach',
    'FL',
    '33009',
    '954-851-6286',
    
    
    'Women''s',
    'Rabbi Raphael Tennenhaus - Chabad of Hallandale Beach',
    
    
    
    
    
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'Miami Beach Mikvah',
    '2530 Pine Tree Dr',
    'Miami Beach',
    'FL',
    '33140',
    '305-672-3500',
    'mikvahmiamibeach.com',
    
    'Women''s',
    
    
    
    
    
    
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'Mikvah Ahava',
    '2863 Stirling Rd',
    'Hollywood',
    'FL',
    '33312',
    '954-295-7788',
    'betohr.com',
    'Natalierazla@gmail.com',
    'Women''s',
    'Rabbi Nachom Rosenberg - Bet Midrash Ohr Hachayim Hakadosh',
    
    
    
    
    
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'Mikvah Am Kadosh – Aventura Chabad',
    '21001 Biscayne Blvd',
    'Aventura',
    'FL',
    '33180',
    '786-277-0336',
    
    'laivi@chabadfl.org',
    'Women''s',
    'Aventura Chabad',
    
    
    
    
    
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'Mikvah Chabad – Chabad of Central Boca Raton',
    '17950 N Military Trl',
    'Boca Raton',
    'FL',
    '33496',
    '561-674-0877',
    'chabadcentralboca.com',
    
    'Women''s',
    'Rabbi Moshe Denburg (entrance on south side)',
    
    
    
    
    
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'Mikvah Mei Menachem – Chabad of Palm Beach',
    '844 Prosperity Farms Rd',
    'North Palm Beach',
    'FL',
    '33408',
    '561-624-7004',
    'jewishcommunitysynagogue.com',
    'rsezagui@aol.com',
    'Women''s',
    'Rabbi Shlomo Ezagui',
    
    
    
    
    
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'Mikvah Mei Menachem – Chabad of Weston',
    '18501 Tequesta Trace Park Ln',
    'Weston',
    'FL',
    '33326',
    '954-349-6565',
    
    
    'Women''s',
    'Rabbi Yisroel Spalter',
    
    
    
    
    
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'Mikvah of Boca Raton Synagogue',
    '7900 N Montoya Cir',
    'Boca Del Mar',
    'FL',
    '33433',
    '561-394-5854',
    
    
    'Women''s',
    'Rabbi Efrem Goldberg',
    
    
    
    
    
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'Mikvah of Fort Lauderdale',
    '3536 N Ocean Blvd',
    'Fort Lauderdale',
    'FL',
    '33308',
    '954-568-1190 ext 7',
    
    
    'Women''s',
    'Rebbetzin Lipszyc (mikvah cost $35)',
    
    
    
    
    
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'Mikvah of South Dade',
    '7880 SW 112th St',
    'Pinecrest',
    'FL',
    '33156',
    '305-232-6833',
    
    
    'Women''s',
    
    
    
    
    
    
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'Mikvah Shulamit – Chabad of Plantation',
    '455 SW 78th Ave',
    'Plantation',
    'FL',
    '33324',
    '954-600-7772',
    'mikvah.org',
    'mcposner@comcast.net',
    'Women''s',
    'Rabbi Mendy Posner',
    
    
    
    
    
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'Mikvah Young Israel of Hollywood',
    '3291 Stirling Rd',
    'Hollywood',
    'FL',
    '33312',
    '954-963-3952',
    'yih.org',
    
    'Women''s',
    'Rabbi Edward Davis (mikvah located in rear)',
    
    
    
    
    
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'North Miami Beach – Mikvah Jovita Cojab',
    '1054 NE Miami Gardens Dr',
    'North Miami Beach',
    'FL',
    '33179',
    '305-949-9650',
    
    
    'Women''s',
    
    
    
    
    
    
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'The Mikvah at Bal Harbor (Shul of Bal Harbor)',
    '9540 Collins Ave',
    'Surfside',
    'FL',
    '33154',
    '305-866-1492',
    'theshul.org',
    
    'Women''s',
    
    
    
    
    
    
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'The Young Family Mikvah Mei Menachem – Chabad of Greater Boynton',
    '10655 El Clair Ranch Rd',
    'Boynton Beach',
    'FL',
    '33437',
    '561-734-2201',
    'chabadboynton.com',
    'rabbi@chabadboynton.com',
    'Women''s',
    'Rabbis Sholom Ciment, Avroham Korf & Gerson Grossbaum',
    
    
    
    
    
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Update search vectors for the new records
UPDATE mikvah SET search_vector = to_tsvector('english', 
    COALESCE(name, '') || ' ' || 
    COALESCE(description, '') || ' ' || 
    COALESCE(address, '') || ' ' || 
    COALESCE(city, '') || ' ' || 
    COALESCE(rabbinical_supervision, '')
) WHERE name IN (
    'Alicia Bat Freida Mikvah',
    'Anidjar Mikvah – Bnai Sephardim',
    'Chabad of Greater Ft. Lauderdale Mikvah',
    'Coral Springs Mikvah – Chabad of Coral Springs',
    'Grace Cayre Ladies Mikvah (Safra Synagogue)',
    'Mei Menachem Mikvah Israel',
    'Miami Beach Mikvah',
    'Mikvah Ahava',
    'Mikvah Am Kadosh – Aventura Chabad',
    'Mikvah Chabad – Chabad of Central Boca Raton',
    'Mikvah Mei Menachem – Chabad of Palm Beach',
    'Mikvah Mei Menachem – Chabad of Weston',
    'Mikvah of Boca Raton Synagogue',
    'Mikvah of Fort Lauderdale',
    'Mikvah of South Dade',
    'Mikvah Shulamit – Chabad of Plantation',
    'Mikvah Young Israel of Hollywood',
    'North Miami Beach – Mikvah Jovita Cojab',
    'The Mikvah at Bal Harbor (Shul of Bal Harbor)',
    'The Young Family Mikvah Mei Menachem – Chabad of Greater Boynton'
);

-- Commit the transaction
COMMIT;

-- Display summary
SELECT 
    'Mikvah data insertion completed successfully' as status,
    COUNT(*) as records_inserted,
    NOW() as completed_at
FROM mikvah 
WHERE name IN (
    'Alicia Bat Freida Mikvah',
    'Anidjar Mikvah – Bnai Sephardim',
    'Chabad of Greater Ft. Lauderdale Mikvah',
    'Coral Springs Mikvah – Chabad of Coral Springs',
    'Grace Cayre Ladies Mikvah (Safra Synagogue)',
    'Mei Menachem Mikvah Israel',
    'Miami Beach Mikvah',
    'Mikvah Ahava',
    'Mikvah Am Kadosh – Aventura Chabad',
    'Mikvah Chabad – Chabad of Central Boca Raton',
    'Mikvah Mei Menachem – Chabad of Palm Beach',
    'Mikvah Mei Menachem – Chabad of Weston',
    'Mikvah of Boca Raton Synagogue',
    'Mikvah of Fort Lauderdale',
    'Mikvah of South Dade',
    'Mikvah Shulamit – Chabad of Plantation',
    'Mikvah Young Israel of Hollywood',
    'North Miami Beach – Mikvah Jovita Cojab',
    'The Mikvah at Bal Harbor (Shul of Bal Harbor)',
    'The Young Family Mikvah Mei Menachem – Chabad of Greater Boynton'
);
