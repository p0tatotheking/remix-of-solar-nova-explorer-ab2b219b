-- Create games table
CREATE TABLE public.games (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    url TEXT NOT NULL DEFAULT '',
    preview TEXT NOT NULL DEFAULT '',
    embed BOOLEAN NOT NULL DEFAULT true,
    is_tab TEXT DEFAULT NULL,
    category TEXT NOT NULL DEFAULT 'arcade',
    thumbnail_url TEXT DEFAULT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.app_users(id) DEFAULT NULL
);

-- Enable RLS
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- Anyone can read games
CREATE POLICY "Anyone can read games" 
ON public.games 
FOR SELECT 
USING (true);

-- Create admin functions for game management
CREATE OR REPLACE FUNCTION public.create_game(
    p_admin_id UUID,
    p_title TEXT,
    p_description TEXT,
    p_url TEXT,
    p_preview TEXT,
    p_embed BOOLEAN,
    p_is_tab TEXT,
    p_category TEXT,
    p_thumbnail_url TEXT,
    p_display_order INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_id UUID;
BEGIN
    IF NOT public.has_role(p_admin_id, 'admin') THEN
        RAISE EXCEPTION 'Only admins can create games';
    END IF;
    
    INSERT INTO public.games (title, description, url, preview, embed, is_tab, category, thumbnail_url, display_order, created_by)
    VALUES (p_title, p_description, p_url, p_preview, p_embed, p_is_tab, p_category, p_thumbnail_url, p_display_order, p_admin_id)
    RETURNING id INTO new_id;
    
    RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_game(
    p_admin_id UUID,
    p_game_id UUID,
    p_title TEXT,
    p_description TEXT,
    p_url TEXT,
    p_preview TEXT,
    p_embed BOOLEAN,
    p_is_tab TEXT,
    p_category TEXT,
    p_thumbnail_url TEXT,
    p_display_order INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.has_role(p_admin_id, 'admin') THEN
        RAISE EXCEPTION 'Only admins can update games';
    END IF;
    
    UPDATE public.games
    SET title = p_title,
        description = p_description,
        url = p_url,
        preview = p_preview,
        embed = p_embed,
        is_tab = p_is_tab,
        category = p_category,
        thumbnail_url = p_thumbnail_url,
        display_order = p_display_order,
        updated_at = now()
    WHERE id = p_game_id;
    
    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_game(p_admin_id UUID, p_game_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.has_role(p_admin_id, 'admin') THEN
        RAISE EXCEPTION 'Only admins can delete games';
    END IF;
    
    DELETE FROM public.games WHERE id = p_game_id;
    RETURN TRUE;
END;
$$;

-- Create storage bucket for game thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('game-thumbnails', 'game-thumbnails', true);

-- Storage policies for game thumbnails
CREATE POLICY "Anyone can view game thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'game-thumbnails');

CREATE POLICY "Anyone can upload game thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'game-thumbnails');

CREATE POLICY "Anyone can update game thumbnails"
ON storage.objects FOR UPDATE
USING (bucket_id = 'game-thumbnails');

CREATE POLICY "Anyone can delete game thumbnails"
ON storage.objects FOR DELETE
USING (bucket_id = 'game-thumbnails');