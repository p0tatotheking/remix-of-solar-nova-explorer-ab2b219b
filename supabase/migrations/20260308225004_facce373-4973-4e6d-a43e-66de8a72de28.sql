
-- =============================================
-- SECURE RPCs FOR USER-SCOPED MUTATIONS
-- =============================================

-- 1. User Profiles: update own profile
CREATE OR REPLACE FUNCTION public.update_my_profile(
  p_caller_id uuid,
  p_display_name text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL,
  p_theme_preset text DEFAULT NULL,
  p_custom_bg_type text DEFAULT NULL,
  p_custom_bg_url text DEFAULT NULL,
  p_glass_enabled boolean DEFAULT NULL,
  p_layout_mode text DEFAULT NULL,
  p_popups_disabled boolean DEFAULT NULL,
  p_transitions_disabled boolean DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_profiles SET
    display_name = COALESCE(p_display_name, display_name),
    avatar_url = COALESCE(p_avatar_url, avatar_url),
    theme_preset = COALESCE(p_theme_preset, theme_preset),
    custom_bg_type = COALESCE(p_custom_bg_type, custom_bg_type),
    custom_bg_url = COALESCE(p_custom_bg_url, custom_bg_url),
    glass_enabled = COALESCE(p_glass_enabled, glass_enabled),
    layout_mode = COALESCE(p_layout_mode, layout_mode),
    popups_disabled = COALESCE(p_popups_disabled, popups_disabled),
    transitions_disabled = COALESCE(p_transitions_disabled, transitions_disabled),
    updated_at = now()
  WHERE user_id = p_caller_id;
  RETURN TRUE;
END;
$$;

-- 2. Upsert user profile (for initial creation)
CREATE OR REPLACE FUNCTION public.upsert_my_profile(
  p_caller_id uuid,
  p_display_name text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL,
  p_theme_preset text DEFAULT 'purple',
  p_custom_bg_type text DEFAULT 'none',
  p_custom_bg_url text DEFAULT '',
  p_glass_enabled boolean DEFAULT true,
  p_layout_mode text DEFAULT 'grid',
  p_popups_disabled boolean DEFAULT false,
  p_transitions_disabled boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_profiles (user_id, display_name, avatar_url, theme_preset, custom_bg_type, custom_bg_url, glass_enabled, layout_mode, popups_disabled, transitions_disabled)
  VALUES (p_caller_id, p_display_name, p_avatar_url, p_theme_preset, p_custom_bg_type, p_custom_bg_url, p_glass_enabled, p_layout_mode, p_popups_disabled, p_transitions_disabled)
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, user_profiles.display_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
    theme_preset = EXCLUDED.theme_preset,
    custom_bg_type = EXCLUDED.custom_bg_type,
    custom_bg_url = EXCLUDED.custom_bg_url,
    glass_enabled = EXCLUDED.glass_enabled,
    layout_mode = EXCLUDED.layout_mode,
    popups_disabled = EXCLUDED.popups_disabled,
    transitions_disabled = EXCLUDED.transitions_disabled,
    updated_at = now();
  RETURN TRUE;
END;
$$;

-- 3. Friendships: add mutual friendship (scoped to caller)
CREATE OR REPLACE FUNCTION public.add_friendship(p_caller_id uuid, p_friend_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO friendships (user_id, friend_id)
  VALUES (p_caller_id, p_friend_id)
  ON CONFLICT DO NOTHING;
  INSERT INTO friendships (user_id, friend_id)
  VALUES (p_friend_id, p_caller_id)
  ON CONFLICT DO NOTHING;
  RETURN TRUE;
END;
$$;

-- 4. Friendships: remove (only if caller is part of the friendship)
CREATE OR REPLACE FUNCTION public.remove_friendship(p_caller_id uuid, p_friend_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM friendships WHERE (user_id = p_caller_id AND friend_id = p_friend_id);
  DELETE FROM friendships WHERE (user_id = p_friend_id AND friend_id = p_caller_id);
  RETURN TRUE;
END;
$$;

-- 5. Friend requests: send (caller must be from_user)
CREATE OR REPLACE FUNCTION public.send_friend_request(p_caller_id uuid, p_caller_username text, p_to_user_id uuid, p_to_username text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO friend_requests (from_user_id, from_username, to_user_id, to_username)
  VALUES (p_caller_id, p_caller_username, p_to_user_id, p_to_username)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

-- 6. Friend requests: accept (caller must be recipient)
CREATE OR REPLACE FUNCTION public.accept_friend_request(p_caller_id uuid, p_request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req RECORD;
BEGIN
  SELECT * INTO req FROM friend_requests WHERE id = p_request_id AND to_user_id = p_caller_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found or not authorized';
  END IF;
  UPDATE friend_requests SET status = 'accepted' WHERE id = p_request_id;
  -- Create mutual friendship
  INSERT INTO friendships (user_id, friend_id) VALUES (req.from_user_id, req.to_user_id) ON CONFLICT DO NOTHING;
  INSERT INTO friendships (user_id, friend_id) VALUES (req.to_user_id, req.from_user_id) ON CONFLICT DO NOTHING;
  RETURN TRUE;
END;
$$;

-- 7. Friend requests: reject (caller must be recipient)
CREATE OR REPLACE FUNCTION public.reject_friend_request(p_caller_id uuid, p_request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE friend_requests SET status = 'rejected'
  WHERE id = p_request_id AND to_user_id = p_caller_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found or not authorized';
  END IF;
  RETURN TRUE;
END;
$$;

-- 8. User status: upsert own status
CREATE OR REPLACE FUNCTION public.upsert_my_status(p_caller_id uuid, p_is_online boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_status (user_id, is_online, last_seen)
  VALUES (p_caller_id, p_is_online, now())
  ON CONFLICT (user_id) DO UPDATE SET is_online = p_is_online, last_seen = now();
  RETURN TRUE;
END;
$$;

-- 9. Desktop customizations: upsert own
CREATE OR REPLACE FUNCTION public.upsert_my_desktop_customizations(
  p_caller_id text,
  p_hidden_apps jsonb DEFAULT '[]'::jsonb,
  p_custom_icons jsonb DEFAULT '{}'::jsonb,
  p_custom_names jsonb DEFAULT '{}'::jsonb,
  p_icon_positions jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO desktop_customizations (user_id, hidden_apps, custom_icons, custom_names, icon_positions, updated_at)
  VALUES (p_caller_id, p_hidden_apps, p_custom_icons, p_custom_names, p_icon_positions, now())
  ON CONFLICT (user_id) DO UPDATE SET
    hidden_apps = EXCLUDED.hidden_apps,
    custom_icons = EXCLUDED.custom_icons,
    custom_names = EXCLUDED.custom_names,
    icon_positions = EXCLUDED.icon_positions,
    updated_at = now();
  RETURN TRUE;
END;
$$;

-- 10. Desktop file systems: upsert own
CREATE OR REPLACE FUNCTION public.upsert_my_file_system(p_caller_id text, p_file_system jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO desktop_file_systems (user_id, file_system, updated_at)
  VALUES (p_caller_id, p_file_system, now())
  ON CONFLICT (user_id) DO UPDATE SET file_system = p_file_system, updated_at = now();
  RETURN TRUE;
END;
$$;

-- 11. Desktop pinned apps: upsert own
CREATE OR REPLACE FUNCTION public.upsert_my_pinned_apps(p_caller_id text, p_pinned_apps jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO desktop_pinned_apps (user_id, pinned_apps, updated_at)
  VALUES (p_caller_id, p_pinned_apps, now())
  ON CONFLICT (user_id) DO UPDATE SET pinned_apps = p_pinned_apps, updated_at = now();
  RETURN TRUE;
END;
$$;

-- 12. Notification settings: upsert own
CREATE OR REPLACE FUNCTION public.upsert_my_notification_setting(p_caller_id uuid, p_muted_user_id uuid, p_mute_until timestamptz DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notification_settings (user_id, muted_user_id, mute_until)
  VALUES (p_caller_id, p_muted_user_id, p_mute_until)
  ON CONFLICT (user_id, muted_user_id) DO UPDATE SET mute_until = p_mute_until;
  RETURN TRUE;
END;
$$;

-- 13. Notification settings: delete own
CREATE OR REPLACE FUNCTION public.delete_my_notification_setting(p_caller_id uuid, p_muted_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM notification_settings WHERE user_id = p_caller_id AND muted_user_id = p_muted_user_id;
  RETURN TRUE;
END;
$$;

-- 14. Friend nicknames: upsert own
CREATE OR REPLACE FUNCTION public.upsert_my_friend_nickname(p_caller_id uuid, p_friend_id uuid, p_nickname text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO friend_nicknames (user_id, friend_id, nickname)
  VALUES (p_caller_id, p_friend_id, p_nickname)
  ON CONFLICT (user_id, friend_id) DO UPDATE SET nickname = p_nickname, updated_at = now();
  RETURN TRUE;
END;
$$;

-- 15. Friend nicknames: delete own
CREATE OR REPLACE FUNCTION public.delete_my_friend_nickname(p_caller_id uuid, p_friend_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM friend_nicknames WHERE user_id = p_caller_id AND friend_id = p_friend_id;
  RETURN TRUE;
END;
$$;

-- =============================================
-- TIGHTEN RLS POLICIES - REMOVE PERMISSIVE MUTATIONS
-- =============================================

-- user_profiles: block direct updates (use RPCs)
DROP POLICY IF EXISTS "Anyone can update profiles" ON user_profiles;
CREATE POLICY "No direct update on user_profiles" ON user_profiles FOR UPDATE USING (false);

-- user_profiles: block direct inserts (use RPCs)
DROP POLICY IF EXISTS "Anyone can insert profiles" ON user_profiles;
CREATE POLICY "No direct insert on user_profiles" ON user_profiles FOR INSERT WITH CHECK (false);

-- friendships: block direct inserts and deletes (use RPCs)
DROP POLICY IF EXISTS "Anyone can insert friendships" ON friendships;
CREATE POLICY "No direct insert on friendships" ON friendships FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "Anyone can delete friendships" ON friendships;
CREATE POLICY "No direct delete on friendships" ON friendships FOR DELETE USING (false);

-- friend_requests: block direct mutations (use RPCs)
DROP POLICY IF EXISTS "Anyone can insert friend_requests" ON friend_requests;
CREATE POLICY "No direct insert on friend_requests" ON friend_requests FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "Anyone can update friend_requests" ON friend_requests;
CREATE POLICY "No direct update on friend_requests" ON friend_requests FOR UPDATE USING (false);

DROP POLICY IF EXISTS "Anyone can delete friend_requests" ON friend_requests;
CREATE POLICY "No direct delete on friend_requests" ON friend_requests FOR DELETE USING (false);

-- user_status: block direct mutations (use RPCs)
DROP POLICY IF EXISTS "Anyone can insert user status" ON user_status;
CREATE POLICY "No direct insert on user_status" ON user_status FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "Anyone can update user status" ON user_status;
CREATE POLICY "No direct update on user_status" ON user_status FOR UPDATE USING (false);

-- desktop_customizations: block direct mutations (use RPCs)
DROP POLICY IF EXISTS "Anyone can insert their own customizations" ON desktop_customizations;
CREATE POLICY "No direct insert on desktop_customizations" ON desktop_customizations FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "Anyone can update their own customizations" ON desktop_customizations;
CREATE POLICY "No direct update on desktop_customizations" ON desktop_customizations FOR UPDATE USING (false);

-- desktop_file_systems: block direct mutations (use RPCs)
DROP POLICY IF EXISTS "Anyone can insert their own file system" ON desktop_file_systems;
CREATE POLICY "No direct insert on desktop_file_systems" ON desktop_file_systems FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "Anyone can update their own file system" ON desktop_file_systems;
CREATE POLICY "No direct update on desktop_file_systems" ON desktop_file_systems FOR UPDATE USING (false);

-- desktop_pinned_apps: block direct mutations (use RPCs)
DROP POLICY IF EXISTS "Anyone can insert pinned apps" ON desktop_pinned_apps;
CREATE POLICY "No direct insert on desktop_pinned_apps" ON desktop_pinned_apps FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "Anyone can update pinned apps" ON desktop_pinned_apps;
CREATE POLICY "No direct update on desktop_pinned_apps" ON desktop_pinned_apps FOR UPDATE USING (false);

-- friend_nicknames: block direct mutations (use RPCs)
DROP POLICY IF EXISTS "Anyone can insert nicknames" ON friend_nicknames;
CREATE POLICY "No direct insert on friend_nicknames" ON friend_nicknames FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "Anyone can update nicknames" ON friend_nicknames;
CREATE POLICY "No direct update on friend_nicknames" ON friend_nicknames FOR UPDATE USING (false);

DROP POLICY IF EXISTS "Anyone can delete nicknames" ON friend_nicknames;
CREATE POLICY "No direct delete on friend_nicknames" ON friend_nicknames FOR DELETE USING (false);

-- notification_settings: block direct mutations (use RPCs)
DROP POLICY IF EXISTS "Anyone can insert notification_settings" ON notification_settings;
CREATE POLICY "No direct insert on notification_settings" ON notification_settings FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "Anyone can update notification_settings" ON notification_settings;
CREATE POLICY "No direct update on notification_settings" ON notification_settings FOR UPDATE USING (false);

DROP POLICY IF EXISTS "Anyone can delete notification_settings" ON notification_settings;
CREATE POLICY "No direct delete on notification_settings" ON notification_settings FOR DELETE USING (false);

-- message_reactions: block direct deletes (use RPCs)
DROP POLICY IF EXISTS "Anyone can delete reactions" ON message_reactions;
CREATE POLICY "No direct delete on message_reactions" ON message_reactions FOR DELETE USING (false);

-- game_progress: tighten to block cross-user mutations
DROP POLICY IF EXISTS "Allow all game progress operations" ON game_progress;
CREATE POLICY "Anyone can read game_progress" ON game_progress FOR SELECT USING (true);
CREATE POLICY "No direct insert on game_progress" ON game_progress FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct update on game_progress" ON game_progress FOR UPDATE USING (false);
CREATE POLICY "No direct delete on game_progress" ON game_progress FOR DELETE USING (false);

-- 16. Game progress RPCs
CREATE OR REPLACE FUNCTION public.upsert_my_game_progress(
  p_caller_id uuid,
  p_game_url text,
  p_game_title text,
  p_game_id uuid DEFAULT NULL,
  p_play_time integer DEFAULT 0,
  p_custom_settings jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO game_progress (user_id, game_url, game_title, game_id, play_time, custom_settings, last_played, updated_at)
  VALUES (p_caller_id, p_game_url, p_game_title, p_game_id, p_play_time, p_custom_settings, now(), now())
  ON CONFLICT (user_id, game_url) DO UPDATE SET
    play_time = game_progress.play_time + p_play_time,
    custom_settings = COALESCE(p_custom_settings, game_progress.custom_settings),
    last_played = now(),
    updated_at = now();
  RETURN TRUE;
END;
$$;

-- 17. Message reactions: delete own
CREATE OR REPLACE FUNCTION public.delete_my_reaction(p_caller_id uuid, p_reaction_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM message_reactions WHERE id = p_reaction_id AND user_id = p_caller_id;
  RETURN TRUE;
END;
$$;
