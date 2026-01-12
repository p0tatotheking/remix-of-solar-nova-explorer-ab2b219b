-- Create storage bucket for user backgrounds
INSERT INTO storage.buckets (id, name, public) 
VALUES ('backgrounds', 'backgrounds', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for background uploads
CREATE POLICY "Users can upload their own backgrounds" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'backgrounds' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own backgrounds" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'backgrounds' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own backgrounds" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'backgrounds' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Background files are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'backgrounds');