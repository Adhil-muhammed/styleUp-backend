-- V3: Enable PostGIS (shops.location geography column) and btree_gist
--     (uuid/integer equality inside GiST exclusion constraints on schedules).
--     Also declares the custom `timerange` range type required for the scheduling
--     EXCLUDE constraint in V7.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- CREATE TYPE has no IF NOT EXISTS; guard with a DO block.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'timerange') THEN
    CREATE TYPE timerange AS RANGE (subtype = time);
  END IF;
END
$$;
