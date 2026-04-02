update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'application/pdf'
]
where id = 'fixy-assets';
