
-- Make certificates bucket private so RLS controls access
UPDATE storage.buckets SET public = false WHERE id = 'certificates';

-- Storage policies for certificates (owner-only)
DROP POLICY IF EXISTS "Users can view own certificates" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own certificates" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own certificates" ON storage.objects;

CREATE POLICY "Users can view own certificates"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own certificates"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own certificates"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Revoke EXECUTE on internal SECURITY DEFINER trigger functions from public/api roles
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
