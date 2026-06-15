-- Allow users to update their own assessment results
CREATE POLICY "Users can update their own assessment results"
ON public.assessment_results
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to withdraw their own job applications
CREATE POLICY "Users can delete their own job applications"
ON public.job_applications
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Remove the broad public SELECT on avatars (public bucket files
-- remain accessible via their public URL endpoints; this just prevents
-- enumerating the bucket via the Storage API).
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
