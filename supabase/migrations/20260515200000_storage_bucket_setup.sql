-- Create the pmfreak-documents bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pmfreak-documents',
  'pmfreak-documents',
  false,
  10485760,  -- 10MB
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- RLS: only service role can read/write (enforced at app layer)
-- Authenticated users access via signed URLs or server-side proxy only
DROP POLICY IF EXISTS "service_role_full_access" ON storage.objects;
CREATE POLICY "service_role_full_access" ON storage.objects
  FOR ALL TO service_role USING (bucket_id = 'pmfreak-documents');

-- No authenticated direct access — all access goes through API routes

-- DOWN:
-- DROP POLICY IF EXISTS "service_role_full_access" ON storage.objects;
-- DELETE FROM storage.buckets WHERE id = 'pmfreak-documents';
