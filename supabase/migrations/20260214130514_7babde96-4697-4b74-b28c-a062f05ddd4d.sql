
CREATE TABLE public.community_whiteboard_strokes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  points jsonb NOT NULL,
  color text NOT NULL,
  size integer NOT NULL DEFAULT 4,
  tool text NOT NULL DEFAULT 'pen',
  user_id text,
  username text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.community_whiteboard_strokes ENABLE ROW LEVEL SECURITY;

-- Everyone can read strokes
CREATE POLICY "Anyone can read strokes" ON public.community_whiteboard_strokes
  FOR SELECT USING (true);

-- Anyone can insert strokes
CREATE POLICY "Anyone can insert strokes" ON public.community_whiteboard_strokes
  FOR INSERT WITH CHECK (true);

-- Only admins can delete (clear)
CREATE POLICY "Admins can delete strokes" ON public.community_whiteboard_strokes
  FOR DELETE USING (
    public.has_role(
      (SELECT au.id FROM public.app_users au WHERE au.id::text = user_id LIMIT 1),
      'admin'
    )
  );

-- Store last reset time
CREATE TABLE public.community_whiteboard_meta (
  id text PRIMARY KEY DEFAULT 'singleton',
  last_reset_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.community_whiteboard_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read meta" ON public.community_whiteboard_meta
  FOR SELECT USING (true);

CREATE POLICY "Anyone can update meta" ON public.community_whiteboard_meta
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can insert meta" ON public.community_whiteboard_meta
  FOR INSERT WITH CHECK (true);

INSERT INTO public.community_whiteboard_meta (id, last_reset_at) VALUES ('singleton', now());

-- Function for admin clear
CREATE OR REPLACE FUNCTION public.clear_community_whiteboard(p_admin_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can clear the whiteboard';
  END IF;
  
  DELETE FROM public.community_whiteboard_strokes;
  UPDATE public.community_whiteboard_meta SET last_reset_at = now() WHERE id = 'singleton';
  RETURN TRUE;
END;
$$;
