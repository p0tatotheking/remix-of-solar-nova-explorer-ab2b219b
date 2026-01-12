-- Drop the existing restrictive policies
DROP POLICY IF EXISTS "Users can upload their own backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Background files are publicly accessible" ON storage.objects;

-- Create permissive policies for the backgrounds bucket
CREATE POLICY "Anyone can upload backgrounds" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'backgrounds');

CREATE POLICY "Anyone can update backgrounds" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'backgrounds');

CREATE POLICY "Anyone can delete backgrounds" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'backgrounds');

CREATE POLICY "Background files are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'backgrounds');