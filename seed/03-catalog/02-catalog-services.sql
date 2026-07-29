-- @rows 1
-- Resolves category by slug so ON CONFLICT (slug) on categories stays consistent.

INSERT INTO catalog_services (
  id,
  category_id,
  name,
  target_gender,
  description,
  is_active
)
SELECT
  '66e42043-f4e7-433d-abfb-933d9563d387'::uuid,
  sc.id,
  'Classic Men''s Haircut',
  'male',
  'Wash, scissor cut, and finish — the everyday Kochi salon staple.',
  TRUE
FROM service_categories sc
WHERE sc.slug = 'haircut'
ON CONFLICT (id) DO NOTHING;
