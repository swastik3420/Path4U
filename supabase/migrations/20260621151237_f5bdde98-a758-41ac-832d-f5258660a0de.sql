DROP POLICY IF EXISTS "Users can insert applications" ON public.job_applications;
CREATE POLICY "Users can insert applications"
ON public.job_applications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own assessments" ON public.assessment_results;
CREATE POLICY "Users can insert their own assessments"
ON public.assessment_results
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);