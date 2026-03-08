
CREATE TABLE public.desktop_customizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE,
  hidden_apps jsonb NOT NULL DEFAULT '[]'::jsonb,
  custom_icons jsonb NOT NULL DEFAULT '{}'::jsonb,
  custom_names jsonb NOT NULL DEFAULT '{}'::jsonb,
  icon_positions jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.desktop_customizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read their own customizations" ON public.desktop_customizations FOR SELECT USING (true);
CREATE POLICY "Anyone can insert their own customizations" ON public.desktop_customizations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update their own customizations" ON public.desktop_customizations FOR UPDATE USING (true);
