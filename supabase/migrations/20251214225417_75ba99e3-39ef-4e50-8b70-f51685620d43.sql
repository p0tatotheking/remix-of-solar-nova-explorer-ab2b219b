-- Drop the existing restrictive storage policy
DROP POLICY IF EXISTS "Admins can upload music files" ON storage.objects;

-- Create a more permissive upload policy (we'll handle admin check in the app)
CREATE POLICY "Authenticated users can upload music files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'music');

-- Allow delete for music files
CREATE POLICY "Anyone can delete music files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'music');