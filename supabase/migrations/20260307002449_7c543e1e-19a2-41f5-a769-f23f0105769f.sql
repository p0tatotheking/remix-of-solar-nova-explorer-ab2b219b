
-- Desktop file system storage per user
CREATE TABLE public.desktop_file_systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  file_system jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.desktop_file_systems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read their own file system"
  ON public.desktop_file_systems FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert their own file system"
  ON public.desktop_file_systems FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update their own file system"
  ON public.desktop_file_systems FOR UPDATE
  USING (true);

-- Desktop pinned apps per user
CREATE TABLE public.desktop_pinned_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  pinned_apps jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.desktop_pinned_apps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read pinned apps"
  ON public.desktop_pinned_apps FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert pinned apps"
  ON public.desktop_pinned_apps FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update pinned apps"
  ON public.desktop_pinned_apps FOR UPDATE
  USING (true);
