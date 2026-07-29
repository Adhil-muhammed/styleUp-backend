-- @rows 1

INSERT INTO service_categories (id, slug, name, icon_url, status)
VALUES (
  'cd35e64b-1029-4f6c-b67b-95d897f4e7f7',
  'haircut',
  'Haircut',
  'https://cdn.styleup.example/icons/haircut.svg',
  'active'
)
ON CONFLICT (slug) DO NOTHING;
