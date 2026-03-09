
-- Additional game_progress RPCs that return data

CREATE OR REPLACE FUNCTION public.start_game_session(
  p_caller_id uuid,
  p_game_url text,
  p_game_title text,
  p_game_id uuid DEFAULT NULL
)
RETURNS SETOF game_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Try update first
  UPDATE game_progress SET last_played = now(), updated_at = now()
  WHERE user_id = p_caller_id AND game_url = p_game_url;
  
  IF FOUND THEN
    RETURN QUERY SELECT * FROM game_progress WHERE user_id = p_caller_id AND game_url = p_game_url;
    RETURN;
  END IF;
  
  -- Insert new
  RETURN QUERY
  INSERT INTO game_progress (user_id, game_url, game_title, game_id, play_time, custom_settings, last_played, updated_at)
  VALUES (p_caller_id, p_game_url, p_game_title, p_game_id, 0, '{}'::jsonb, now(), now())
  RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_game_play_time(
  p_caller_id uuid,
  p_game_url text,
  p_additional_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE game_progress SET
    play_time = play_time + p_additional_seconds,
    last_played = now(),
    updated_at = now()
  WHERE user_id = p_caller_id AND game_url = p_game_url;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_game_settings(
  p_caller_id uuid,
  p_game_url text,
  p_custom_settings jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE game_progress SET
    custom_settings = p_custom_settings,
    updated_at = now()
  WHERE user_id = p_caller_id AND game_url = p_game_url;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_my_game_progress(p_caller_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM game_progress WHERE user_id = p_caller_id;
  RETURN TRUE;
END;
$$;

-- Remove own reaction by matching user_id
CREATE OR REPLACE FUNCTION public.toggle_reaction(
  p_caller_id uuid,
  p_message_id uuid,
  p_username text,
  p_emoji text,
  p_message_type text DEFAULT 'server'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_id uuid;
BEGIN
  SELECT id INTO existing_id FROM message_reactions
  WHERE message_id = p_message_id AND user_id = p_caller_id AND emoji = p_emoji;
  
  IF existing_id IS NOT NULL THEN
    DELETE FROM message_reactions WHERE id = existing_id;
  ELSE
    INSERT INTO message_reactions (message_id, user_id, username, emoji, message_type)
    VALUES (p_message_id, p_caller_id, p_username, p_emoji, p_message_type);
  END IF;
  RETURN TRUE;
END;
$$;

-- Block/unblock RPCs
CREATE OR REPLACE FUNCTION public.block_user(p_caller_id uuid, p_blocked_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_blocks (blocker_id, blocked_id)
  VALUES (p_caller_id, p_blocked_id)
  ON CONFLICT DO NOTHING;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.unblock_user(p_caller_id uuid, p_blocked_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM user_blocks WHERE blocker_id = p_caller_id AND blocked_id = p_blocked_id;
  RETURN TRUE;
END;
$$;

-- Tighten user_blocks RLS
DROP POLICY IF EXISTS "Anyone can insert user_blocks" ON user_blocks;
CREATE POLICY "No direct insert on user_blocks" ON user_blocks FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "Anyone can delete user_blocks" ON user_blocks;
CREATE POLICY "No direct delete on user_blocks" ON user_blocks FOR DELETE USING (false);

-- Tighten message_reactions insert (use toggle_reaction RPC)
DROP POLICY IF EXISTS "Anyone can add reactions" ON message_reactions;
CREATE POLICY "No direct insert on message_reactions" ON message_reactions FOR INSERT WITH CHECK (false);
