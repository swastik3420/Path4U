CREATE POLICY "Users can update their own certificate files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'certificates' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'certificates' AND (auth.uid())::text = (storage.foldername(name))[1]);