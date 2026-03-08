CREATE OR REPLACE FUNCTION public.clear_chat_messages(p_admin_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can clear chat';
  END IF;
  
  DELETE FROM public.chat_messages WHERE true;
  RETURN TRUE;
END;
$$;