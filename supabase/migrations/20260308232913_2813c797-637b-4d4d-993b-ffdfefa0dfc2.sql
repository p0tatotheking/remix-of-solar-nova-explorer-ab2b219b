
CREATE OR REPLACE FUNCTION public.verify_session(p_session_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_user_id uuid;
BEGIN
  SELECT user_id INTO v_user_id FROM public.user_sessions
  WHERE session_token = p_session_token AND expires_at > now();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired session';
  END IF;
  RETURN v_user_id;
END;
$$;
