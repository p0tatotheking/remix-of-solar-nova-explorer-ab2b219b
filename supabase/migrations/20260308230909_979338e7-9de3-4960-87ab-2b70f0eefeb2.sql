
-- Drop functions with conflicting parameter names before recreating

-- User-scoped functions that had p_caller_id
DROP FUNCTION IF EXISTS public.update_my_profile(uuid, text, text, text, text, text, boolean, text, boolean, boolean);
DROP FUNCTION IF EXISTS public.upsert_my_profile(uuid, text, text, text, text, text, boolean, text, boolean, boolean);
DROP FUNCTION IF EXISTS public.add_friendship(uuid, uuid);
DROP FUNCTION IF EXISTS public.remove_friendship(uuid, uuid);
DROP FUNCTION IF EXISTS public.send_friend_request(uuid, text, uuid, text);
DROP FUNCTION IF EXISTS public.accept_friend_request(uuid, uuid);
DROP FUNCTION IF EXISTS public.reject_friend_request(uuid, uuid);
DROP FUNCTION IF EXISTS public.upsert_my_status(uuid, boolean);
DROP FUNCTION IF EXISTS public.upsert_my_desktop_customizations(text, jsonb, jsonb, jsonb, jsonb);
DROP FUNCTION IF EXISTS public.upsert_my_file_system(text, jsonb);
DROP FUNCTION IF EXISTS public.upsert_my_pinned_apps(text, jsonb);
DROP FUNCTION IF EXISTS public.upsert_my_notification_setting(uuid, uuid, timestamptz);
DROP FUNCTION IF EXISTS public.delete_my_notification_setting(uuid, uuid);
DROP FUNCTION IF EXISTS public.upsert_my_friend_nickname(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.delete_my_friend_nickname(uuid, uuid);
DROP FUNCTION IF EXISTS public.upsert_my_game_progress(uuid, text, text, uuid, integer, jsonb);
DROP FUNCTION IF EXISTS public.start_game_session(uuid, text, text, uuid);
DROP FUNCTION IF EXISTS public.update_game_play_time(uuid, text, integer);
DROP FUNCTION IF EXISTS public.save_game_settings(uuid, text, jsonb);
DROP FUNCTION IF EXISTS public.clear_my_game_progress(uuid);
DROP FUNCTION IF EXISTS public.toggle_reaction(uuid, uuid, text, text, text);
DROP FUNCTION IF EXISTS public.toggle_reaction(uuid, uuid, text, text);
DROP FUNCTION IF EXISTS public.delete_my_reaction(uuid, uuid);
DROP FUNCTION IF EXISTS public.block_user(uuid, uuid);
DROP FUNCTION IF EXISTS public.unblock_user(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_my_direct_messages(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_my_unread_dms(uuid);
DROP FUNCTION IF EXISTS public.mark_dms_read(uuid, uuid);

-- Admin functions that had p_admin_id
DROP FUNCTION IF EXISTS public.clear_community_whiteboard(uuid);
DROP FUNCTION IF EXISTS public.clear_chat_messages(uuid);
DROP FUNCTION IF EXISTS public.get_all_users(uuid);
DROP FUNCTION IF EXISTS public.create_app_user(uuid, text, text, app_role);
DROP FUNCTION IF EXISTS public.delete_app_user(uuid, uuid);
DROP FUNCTION IF EXISTS public.update_user_password(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.create_announcement(uuid, text, text);
DROP FUNCTION IF EXISTS public.update_announcement(uuid, uuid, text, text);
DROP FUNCTION IF EXISTS public.delete_announcement(uuid, uuid);
DROP FUNCTION IF EXISTS public.create_game(uuid, text, text, text, text, boolean, text, text, text, integer);
DROP FUNCTION IF EXISTS public.update_game(uuid, uuid, text, text, text, text, boolean, text, text, text, integer);
DROP FUNCTION IF EXISTS public.delete_game(uuid, uuid);
DROP FUNCTION IF EXISTS public.create_bug(uuid, text, text, text);
DROP FUNCTION IF EXISTS public.delete_bug(uuid, uuid);
DROP FUNCTION IF EXISTS public.add_uploaded_music(uuid, text, text, text);
DROP FUNCTION IF EXISTS public.delete_uploaded_music(uuid, uuid);

-- Now recreate all functions with p_session_token

-- update_my_profile
CREATE OR REPLACE FUNCTION public.update_my_profile(
  p_session_token text, p_display_name text DEFAULT NULL, p_avatar_url text DEFAULT NULL,
  p_theme_preset text DEFAULT NULL, p_custom_bg_type text DEFAULT NULL, p_custom_bg_url text DEFAULT NULL,
  p_glass_enabled boolean DEFAULT NULL, p_layout_mode text DEFAULT NULL,
  p_popups_disabled boolean DEFAULT NULL, p_transitions_disabled boolean DEFAULT NULL
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
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
  WHERE user_id = v_user_id;
  RETURN TRUE;
END;
$$;

-- upsert_my_profile
CREATE OR REPLACE FUNCTION public.upsert_my_profile(
  p_session_token text, p_display_name text DEFAULT NULL, p_avatar_url text DEFAULT NULL,
  p_theme_preset text DEFAULT 'purple', p_custom_bg_type text DEFAULT 'none',
  p_custom_bg_url text DEFAULT '', p_glass_enabled boolean DEFAULT true,
  p_layout_mode text DEFAULT 'grid', p_popups_disabled boolean DEFAULT false,
  p_transitions_disabled boolean DEFAULT false
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  INSERT INTO user_profiles (user_id, display_name, avatar_url, theme_preset, custom_bg_type, custom_bg_url, glass_enabled, layout_mode, popups_disabled, transitions_disabled)
  VALUES (v_user_id, p_display_name, p_avatar_url, p_theme_preset, p_custom_bg_type, p_custom_bg_url, p_glass_enabled, p_layout_mode, p_popups_disabled, p_transitions_disabled)
  ON CONFLICT (user_id) DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, user_profiles.display_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
    theme_preset = EXCLUDED.theme_preset, custom_bg_type = EXCLUDED.custom_bg_type,
    custom_bg_url = EXCLUDED.custom_bg_url, glass_enabled = EXCLUDED.glass_enabled,
    layout_mode = EXCLUDED.layout_mode, popups_disabled = EXCLUDED.popups_disabled,
    transitions_disabled = EXCLUDED.transitions_disabled, updated_at = now();
  RETURN TRUE;
END;
$$;

-- add_friendship
CREATE OR REPLACE FUNCTION public.add_friendship(p_session_token text, p_friend_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  INSERT INTO friendships (user_id, friend_id) VALUES (v_user_id, p_friend_id) ON CONFLICT DO NOTHING;
  INSERT INTO friendships (user_id, friend_id) VALUES (p_friend_id, v_user_id) ON CONFLICT DO NOTHING;
  RETURN TRUE;
END;
$$;

-- remove_friendship
CREATE OR REPLACE FUNCTION public.remove_friendship(p_session_token text, p_friend_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  DELETE FROM friendships WHERE (user_id = v_user_id AND friend_id = p_friend_id);
  DELETE FROM friendships WHERE (user_id = p_friend_id AND friend_id = v_user_id);
  RETURN TRUE;
END;
$$;

-- send_friend_request
CREATE OR REPLACE FUNCTION public.send_friend_request(p_session_token text, p_to_user_id uuid, p_to_username text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid; v_username text; new_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  SELECT username INTO v_username FROM app_users WHERE id = v_user_id;
  INSERT INTO friend_requests (from_user_id, from_username, to_user_id, to_username)
  VALUES (v_user_id, v_username, p_to_user_id, p_to_username)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

-- accept_friend_request
CREATE OR REPLACE FUNCTION public.accept_friend_request(p_session_token text, p_request_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid; req RECORD;
BEGIN
  v_user_id := verify_session(p_session_token);
  SELECT * INTO req FROM friend_requests WHERE id = p_request_id AND to_user_id = v_user_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Friend request not found or not authorized'; END IF;
  UPDATE friend_requests SET status = 'accepted' WHERE id = p_request_id;
  INSERT INTO friendships (user_id, friend_id) VALUES (req.from_user_id, req.to_user_id) ON CONFLICT DO NOTHING;
  INSERT INTO friendships (user_id, friend_id) VALUES (req.to_user_id, req.from_user_id) ON CONFLICT DO NOTHING;
  RETURN TRUE;
END;
$$;

-- reject_friend_request
CREATE OR REPLACE FUNCTION public.reject_friend_request(p_session_token text, p_request_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  UPDATE friend_requests SET status = 'rejected' WHERE id = p_request_id AND to_user_id = v_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Friend request not found or not authorized'; END IF;
  RETURN TRUE;
END;
$$;

-- upsert_my_status
CREATE OR REPLACE FUNCTION public.upsert_my_status(p_session_token text, p_is_online boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  INSERT INTO user_status (user_id, is_online, last_seen) VALUES (v_user_id, p_is_online, now())
  ON CONFLICT (user_id) DO UPDATE SET is_online = p_is_online, last_seen = now();
  RETURN TRUE;
END;
$$;

-- upsert_my_desktop_customizations
CREATE OR REPLACE FUNCTION public.upsert_my_desktop_customizations(p_session_token text, p_hidden_apps jsonb DEFAULT '[]', p_custom_icons jsonb DEFAULT '{}', p_custom_names jsonb DEFAULT '{}', p_icon_positions jsonb DEFAULT '{}')
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  INSERT INTO desktop_customizations (user_id, hidden_apps, custom_icons, custom_names, icon_positions, updated_at)
  VALUES (v_user_id::text, p_hidden_apps, p_custom_icons, p_custom_names, p_icon_positions, now())
  ON CONFLICT (user_id) DO UPDATE SET hidden_apps = EXCLUDED.hidden_apps, custom_icons = EXCLUDED.custom_icons,
    custom_names = EXCLUDED.custom_names, icon_positions = EXCLUDED.icon_positions, updated_at = now();
  RETURN TRUE;
END;
$$;

-- upsert_my_file_system
CREATE OR REPLACE FUNCTION public.upsert_my_file_system(p_session_token text, p_file_system jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  INSERT INTO desktop_file_systems (user_id, file_system, updated_at) VALUES (v_user_id::text, p_file_system, now())
  ON CONFLICT (user_id) DO UPDATE SET file_system = p_file_system, updated_at = now();
  RETURN TRUE;
END;
$$;

-- upsert_my_pinned_apps
CREATE OR REPLACE FUNCTION public.upsert_my_pinned_apps(p_session_token text, p_pinned_apps jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  INSERT INTO desktop_pinned_apps (user_id, pinned_apps, updated_at) VALUES (v_user_id::text, p_pinned_apps, now())
  ON CONFLICT (user_id) DO UPDATE SET pinned_apps = p_pinned_apps, updated_at = now();
  RETURN TRUE;
END;
$$;

-- upsert_my_notification_setting
CREATE OR REPLACE FUNCTION public.upsert_my_notification_setting(p_session_token text, p_muted_user_id uuid, p_mute_until timestamptz DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  INSERT INTO notification_settings (user_id, muted_user_id, mute_until) VALUES (v_user_id, p_muted_user_id, p_mute_until)
  ON CONFLICT (user_id, muted_user_id) DO UPDATE SET mute_until = p_mute_until;
  RETURN TRUE;
END;
$$;

-- delete_my_notification_setting
CREATE OR REPLACE FUNCTION public.delete_my_notification_setting(p_session_token text, p_muted_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  DELETE FROM notification_settings WHERE user_id = v_user_id AND muted_user_id = p_muted_user_id;
  RETURN TRUE;
END;
$$;

-- upsert_my_friend_nickname
CREATE OR REPLACE FUNCTION public.upsert_my_friend_nickname(p_session_token text, p_friend_id uuid, p_nickname text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  INSERT INTO friend_nicknames (user_id, friend_id, nickname) VALUES (v_user_id, p_friend_id, p_nickname)
  ON CONFLICT (user_id, friend_id) DO UPDATE SET nickname = p_nickname, updated_at = now();
  RETURN TRUE;
END;
$$;

-- delete_my_friend_nickname
CREATE OR REPLACE FUNCTION public.delete_my_friend_nickname(p_session_token text, p_friend_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  DELETE FROM friend_nicknames WHERE user_id = v_user_id AND friend_id = p_friend_id;
  RETURN TRUE;
END;
$$;

-- upsert_my_game_progress
CREATE OR REPLACE FUNCTION public.upsert_my_game_progress(p_session_token text, p_game_url text, p_game_title text, p_game_id uuid DEFAULT NULL, p_play_time integer DEFAULT 0, p_custom_settings jsonb DEFAULT '{}')
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  INSERT INTO game_progress (user_id, game_url, game_title, game_id, play_time, custom_settings, last_played, updated_at)
  VALUES (v_user_id, p_game_url, p_game_title, p_game_id, p_play_time, p_custom_settings, now(), now())
  ON CONFLICT (user_id, game_url) DO UPDATE SET
    play_time = game_progress.play_time + p_play_time,
    custom_settings = COALESCE(p_custom_settings, game_progress.custom_settings),
    last_played = now(), updated_at = now();
  RETURN TRUE;
END;
$$;

-- start_game_session
CREATE OR REPLACE FUNCTION public.start_game_session(p_session_token text, p_game_url text, p_game_title text, p_game_id uuid DEFAULT NULL)
RETURNS SETOF game_progress LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  UPDATE game_progress SET last_played = now(), updated_at = now() WHERE user_id = v_user_id AND game_url = p_game_url;
  IF FOUND THEN
    RETURN QUERY SELECT * FROM game_progress WHERE user_id = v_user_id AND game_url = p_game_url;
    RETURN;
  END IF;
  RETURN QUERY INSERT INTO game_progress (user_id, game_url, game_title, game_id, play_time, custom_settings, last_played, updated_at)
  VALUES (v_user_id, p_game_url, p_game_title, p_game_id, 0, '{}'::jsonb, now(), now()) RETURNING *;
END;
$$;

-- update_game_play_time
CREATE OR REPLACE FUNCTION public.update_game_play_time(p_session_token text, p_game_url text, p_additional_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  UPDATE game_progress SET play_time = play_time + p_additional_seconds, last_played = now(), updated_at = now()
  WHERE user_id = v_user_id AND game_url = p_game_url;
  RETURN TRUE;
END;
$$;

-- save_game_settings
CREATE OR REPLACE FUNCTION public.save_game_settings(p_session_token text, p_game_url text, p_custom_settings jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  UPDATE game_progress SET custom_settings = p_custom_settings, updated_at = now()
  WHERE user_id = v_user_id AND game_url = p_game_url;
  RETURN TRUE;
END;
$$;

-- clear_my_game_progress
CREATE OR REPLACE FUNCTION public.clear_my_game_progress(p_session_token text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  DELETE FROM game_progress WHERE user_id = v_user_id;
  RETURN TRUE;
END;
$$;

-- toggle_reaction
CREATE OR REPLACE FUNCTION public.toggle_reaction(p_session_token text, p_message_id uuid, p_emoji text, p_message_type text DEFAULT 'server')
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid; v_username text; existing_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  SELECT username INTO v_username FROM app_users WHERE id = v_user_id;
  SELECT id INTO existing_id FROM message_reactions WHERE message_id = p_message_id AND user_id = v_user_id AND emoji = p_emoji;
  IF existing_id IS NOT NULL THEN
    DELETE FROM message_reactions WHERE id = existing_id;
  ELSE
    INSERT INTO message_reactions (message_id, user_id, username, emoji, message_type)
    VALUES (p_message_id, v_user_id, v_username, p_emoji, p_message_type);
  END IF;
  RETURN TRUE;
END;
$$;

-- delete_my_reaction
CREATE OR REPLACE FUNCTION public.delete_my_reaction(p_session_token text, p_reaction_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  DELETE FROM message_reactions WHERE id = p_reaction_id AND user_id = v_user_id;
  RETURN TRUE;
END;
$$;

-- block_user
CREATE OR REPLACE FUNCTION public.block_user(p_session_token text, p_blocked_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  INSERT INTO user_blocks (blocker_id, blocked_id) VALUES (v_user_id, p_blocked_id) ON CONFLICT DO NOTHING;
  RETURN TRUE;
END;
$$;

-- unblock_user
CREATE OR REPLACE FUNCTION public.unblock_user(p_session_token text, p_blocked_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  DELETE FROM user_blocks WHERE blocker_id = v_user_id AND blocked_id = p_blocked_id;
  RETURN TRUE;
END;
$$;

-- get_my_direct_messages
CREATE OR REPLACE FUNCTION public.get_my_direct_messages(p_session_token text, p_other_user_id uuid)
RETURNS SETOF direct_messages LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  RETURN QUERY SELECT * FROM direct_messages
  WHERE (sender_id = v_user_id AND receiver_id = p_other_user_id)
     OR (sender_id = p_other_user_id AND receiver_id = v_user_id)
  ORDER BY created_at ASC;
END;
$$;

-- get_my_unread_dms
CREATE OR REPLACE FUNCTION public.get_my_unread_dms(p_session_token text)
RETURNS SETOF direct_messages LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  RETURN QUERY SELECT * FROM direct_messages
  WHERE receiver_id = v_user_id AND read = false ORDER BY created_at DESC;
END;
$$;

-- mark_dms_read
CREATE OR REPLACE FUNCTION public.mark_dms_read(p_session_token text, p_sender_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  UPDATE direct_messages SET read = true WHERE receiver_id = v_user_id AND sender_id = p_sender_id AND read = false;
  RETURN true;
END;
$$;

-- Admin RPCs

-- clear_community_whiteboard
CREATE OR REPLACE FUNCTION public.clear_community_whiteboard(p_session_token text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  IF NOT public.has_role(v_user_id, 'admin') THEN RAISE EXCEPTION 'Only admins can clear the whiteboard'; END IF;
  DELETE FROM public.community_whiteboard_strokes;
  UPDATE public.community_whiteboard_meta SET last_reset_at = now() WHERE id = 'singleton';
  RETURN TRUE;
END;
$$;

-- clear_chat_messages
CREATE OR REPLACE FUNCTION public.clear_chat_messages(p_session_token text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  IF NOT public.has_role(v_user_id, 'admin') THEN RAISE EXCEPTION 'Only admins can clear chat'; END IF;
  DELETE FROM public.chat_messages WHERE true;
  RETURN TRUE;
END;
$$;

-- get_all_users
CREATE OR REPLACE FUNCTION public.get_all_users(p_session_token text)
RETURNS TABLE(id uuid, username text, role app_role, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  IF NOT public.has_role(v_user_id, 'admin') THEN RAISE EXCEPTION 'Only admins can view all users'; END IF;
  RETURN QUERY SELECT u.id, u.username, r.role, u.created_at
  FROM public.app_users u LEFT JOIN public.user_roles r ON u.id = r.user_id ORDER BY u.created_at DESC;
END;
$$;

-- create_app_user
CREATE OR REPLACE FUNCTION public.create_app_user(p_session_token text, p_username text, p_password_hash text, p_role app_role DEFAULT 'user')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid; new_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  IF NOT public.has_role(v_user_id, 'admin') THEN RAISE EXCEPTION 'Only admins can create users'; END IF;
  INSERT INTO public.app_users (username, password_hash, created_by) VALUES (p_username, p_password_hash, v_user_id) RETURNING id INTO new_user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (new_user_id, p_role);
  RETURN new_user_id;
END;
$$;

-- delete_app_user
CREATE OR REPLACE FUNCTION public.delete_app_user(p_session_token text, p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  IF NOT public.has_role(v_user_id, 'admin') THEN RAISE EXCEPTION 'Only admins can delete users'; END IF;
  IF v_user_id = p_user_id THEN RAISE EXCEPTION 'Cannot delete your own account'; END IF;
  DELETE FROM public.app_users WHERE id = p_user_id;
  RETURN TRUE;
END;
$$;

-- update_user_password
CREATE OR REPLACE FUNCTION public.update_user_password(p_session_token text, p_user_id uuid, p_new_password_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  IF NOT public.has_role(v_user_id, 'admin') THEN RAISE EXCEPTION 'Only admins can update users'; END IF;
  UPDATE public.app_users SET password_hash = p_new_password_hash WHERE id = p_user_id;
  RETURN TRUE;
END;
$$;

-- create_announcement
CREATE OR REPLACE FUNCTION public.create_announcement(p_session_token text, p_title text, p_content text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid; new_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  IF NOT public.has_role(v_user_id, 'admin') THEN RAISE EXCEPTION 'Only admins can create announcements'; END IF;
  INSERT INTO public.announcements (title, content, created_by) VALUES (p_title, p_content, v_user_id) RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

-- update_announcement
CREATE OR REPLACE FUNCTION public.update_announcement(p_session_token text, p_announcement_id uuid, p_title text, p_content text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  IF NOT public.has_role(v_user_id, 'admin') THEN RAISE EXCEPTION 'Only admins can update announcements'; END IF;
  UPDATE public.announcements SET title = p_title, content = p_content, updated_at = now() WHERE id = p_announcement_id;
  RETURN TRUE;
END;
$$;

-- delete_announcement
CREATE OR REPLACE FUNCTION public.delete_announcement(p_session_token text, p_announcement_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  IF NOT public.has_role(v_user_id, 'admin') THEN RAISE EXCEPTION 'Only admins can delete announcements'; END IF;
  DELETE FROM public.announcements WHERE id = p_announcement_id;
  RETURN TRUE;
END;
$$;

-- create_game
CREATE OR REPLACE FUNCTION public.create_game(p_session_token text, p_title text, p_description text, p_url text, p_preview text, p_embed boolean, p_is_tab text, p_category text, p_thumbnail_url text, p_display_order integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid; new_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  IF NOT public.has_role(v_user_id, 'admin') THEN RAISE EXCEPTION 'Only admins can create games'; END IF;
  INSERT INTO public.games (title, description, url, preview, embed, is_tab, category, thumbnail_url, display_order, created_by)
  VALUES (p_title, p_description, p_url, p_preview, p_embed, p_is_tab, p_category, p_thumbnail_url, p_display_order, v_user_id)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

-- update_game
CREATE OR REPLACE FUNCTION public.update_game(p_session_token text, p_game_id uuid, p_title text, p_description text, p_url text, p_preview text, p_embed boolean, p_is_tab text, p_category text, p_thumbnail_url text, p_display_order integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  IF NOT public.has_role(v_user_id, 'admin') THEN RAISE EXCEPTION 'Only admins can update games'; END IF;
  UPDATE public.games SET title = p_title, description = p_description, url = p_url, preview = p_preview,
    embed = p_embed, is_tab = p_is_tab, category = p_category, thumbnail_url = p_thumbnail_url,
    display_order = p_display_order, updated_at = now() WHERE id = p_game_id;
  RETURN TRUE;
END;
$$;

-- delete_game
CREATE OR REPLACE FUNCTION public.delete_game(p_session_token text, p_game_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  IF NOT public.has_role(v_user_id, 'admin') THEN RAISE EXCEPTION 'Only admins can delete games'; END IF;
  DELETE FROM public.games WHERE id = p_game_id;
  RETURN TRUE;
END;
$$;

-- create_bug
CREATE OR REPLACE FUNCTION public.create_bug(p_session_token text, p_category text, p_title text, p_status text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid; new_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  IF NOT public.has_role(v_user_id, 'admin') THEN RAISE EXCEPTION 'Only admins can create bugs'; END IF;
  INSERT INTO public.bugs (category, title, status) VALUES (p_category, p_title, p_status) RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

-- delete_bug
CREATE OR REPLACE FUNCTION public.delete_bug(p_session_token text, p_bug_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  IF NOT public.has_role(v_user_id, 'admin') THEN RAISE EXCEPTION 'Only admins can delete bugs'; END IF;
  DELETE FROM public.bugs WHERE id = p_bug_id;
  RETURN TRUE;
END;
$$;

-- add_uploaded_music
CREATE OR REPLACE FUNCTION public.add_uploaded_music(p_session_token text, p_title text, p_artist text, p_file_path text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid; new_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  IF NOT public.has_role(v_user_id, 'admin') THEN RAISE EXCEPTION 'Only admins can upload music'; END IF;
  INSERT INTO public.uploaded_music (title, artist, file_path, uploaded_by) VALUES (p_title, p_artist, p_file_path, v_user_id) RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

-- delete_uploaded_music
CREATE OR REPLACE FUNCTION public.delete_uploaded_music(p_session_token text, p_music_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := verify_session(p_session_token);
  IF NOT public.has_role(v_user_id, 'admin') THEN RAISE EXCEPTION 'Only admins can delete music'; END IF;
  DELETE FROM public.uploaded_music WHERE id = p_music_id;
  RETURN TRUE;
END;
$$;
