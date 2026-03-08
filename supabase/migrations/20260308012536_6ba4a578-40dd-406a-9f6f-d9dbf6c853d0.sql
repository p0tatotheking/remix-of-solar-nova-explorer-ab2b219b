
-- Add password_salt column to app_users
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS password_salt text;

-- Create RPC for fetching DMs scoped to a user
CREATE OR REPLACE FUNCTION public.get_my_direct_messages(p_user_id uuid, p_other_user_id uuid)
RETURNS SETOF direct_messages
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM direct_messages
  WHERE (sender_id = p_user_id AND receiver_id = p_other_user_id)
     OR (sender_id = p_other_user_id AND receiver_id = p_user_id)
  ORDER BY created_at ASC;
$$;

-- Create RPC for fetching unread DMs for a user
CREATE OR REPLACE FUNCTION public.get_my_unread_dms(p_user_id uuid)
RETURNS SETOF direct_messages
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM direct_messages
  WHERE receiver_id = p_user_id AND read = false
  ORDER BY created_at DESC;
$$;

-- Create RPC for marking DMs as read
CREATE OR REPLACE FUNCTION public.mark_dms_read(p_user_id uuid, p_sender_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE direct_messages SET read = true
  WHERE receiver_id = p_user_id AND sender_id = p_sender_id AND read = false;
  RETURN true;
END;
$$;

-- Tighten DM SELECT policy: deny direct reads (use RPCs instead)
DROP POLICY IF EXISTS "Anyone can read direct_messages" ON public.direct_messages;
CREATE POLICY "No direct select on direct_messages" ON public.direct_messages FOR SELECT USING (false);

-- Tighten DM UPDATE policy: deny direct updates (use RPCs instead)  
DROP POLICY IF EXISTS "Anyone can update direct_messages" ON public.direct_messages;
CREATE POLICY "No direct update on direct_messages" ON public.direct_messages FOR UPDATE USING (false);
