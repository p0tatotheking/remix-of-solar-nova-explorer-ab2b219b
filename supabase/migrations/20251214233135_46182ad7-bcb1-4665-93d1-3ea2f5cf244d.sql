-- Create announcements table
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES public.app_users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create announcement comments table
CREATE TABLE public.announcement_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.app_users(id),
  display_name TEXT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bugs table for admin-managed bugs
CREATE TABLE public.bugs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('down', 'issue')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bugs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for announcements (everyone can read)
CREATE POLICY "Anyone can read announcements" ON public.announcements FOR SELECT USING (true);

-- RLS Policies for announcement_comments (everyone can read and insert)
CREATE POLICY "Anyone can read comments" ON public.announcement_comments FOR SELECT USING (true);
CREATE POLICY "Anyone can add comments" ON public.announcement_comments FOR INSERT WITH CHECK (true);

-- RLS Policies for bugs (everyone can read)
CREATE POLICY "Anyone can read bugs" ON public.bugs FOR SELECT USING (true);

-- Admin functions for announcements
CREATE OR REPLACE FUNCTION public.create_announcement(p_admin_id UUID, p_title TEXT, p_content TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can create announcements';
  END IF;
  
  INSERT INTO public.announcements (title, content, created_by)
  VALUES (p_title, p_content, p_admin_id)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_announcement(p_admin_id UUID, p_announcement_id UUID, p_title TEXT, p_content TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can update announcements';
  END IF;
  
  UPDATE public.announcements 
  SET title = p_title, content = p_content, updated_at = now()
  WHERE id = p_announcement_id;
  
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_announcement(p_admin_id UUID, p_announcement_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can delete announcements';
  END IF;
  
  DELETE FROM public.announcements WHERE id = p_announcement_id;
  RETURN TRUE;
END;
$$;

-- Admin functions for bugs
CREATE OR REPLACE FUNCTION public.create_bug(p_admin_id UUID, p_category TEXT, p_title TEXT, p_status TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can create bugs';
  END IF;
  
  INSERT INTO public.bugs (category, title, status)
  VALUES (p_category, p_title, p_status)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_bug(p_admin_id UUID, p_bug_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can delete bugs';
  END IF;
  
  DELETE FROM public.bugs WHERE id = p_bug_id;
  RETURN TRUE;
END;
$$;

-- Enable realtime for comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;