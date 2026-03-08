
CREATE TABLE public.pinned_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  message_type text NOT NULL DEFAULT 'server',
  channel_id text NOT NULL DEFAULT 'general',
  message_text text NOT NULL,
  message_username text NOT NULL,
  pinned_by text NOT NULL,
  pinned_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(message_id, channel_id)
);

ALTER TABLE public.pinned_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read pinned messages" ON public.pinned_messages FOR SELECT USING (true);
CREATE POLICY "Anyone can insert pinned messages" ON public.pinned_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete pinned messages" ON public.pinned_messages FOR DELETE USING (true);
