CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user'
);


--
-- Name: add_uploaded_music(uuid, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.add_uploaded_music(p_admin_id uuid, p_title text, p_artist text, p_file_path text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  new_id UUID;
BEGIN
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can upload music';
  END IF;
  
  INSERT INTO public.uploaded_music (title, artist, file_path, uploaded_by)
  VALUES (p_title, p_artist, p_file_path, p_admin_id)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;


--
-- Name: admin_exists(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_exists() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE role = 'admin'
  )
$$;


--
-- Name: create_announcement(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_announcement(p_admin_id uuid, p_title text, p_content text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  new_id UUID;
BEGIN
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can create announcements';
  END IF;
  
  INSERT INTO public.announcements (title, content, created_by)
  VALUES (p_title, p_content, p_admin_id)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;


--
-- Name: create_app_user(uuid, text, text, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_app_user(p_admin_id uuid, p_username text, p_password_hash text, p_role public.app_role DEFAULT 'user'::public.app_role) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can create users';
  END IF;
  
  -- Create user
  INSERT INTO public.app_users (username, password_hash, created_by)
  VALUES (p_username, p_password_hash, p_admin_id)
  RETURNING id INTO new_user_id;
  
  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new_user_id, p_role);
  
  RETURN new_user_id;
END;
$$;


--
-- Name: create_bug(uuid, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_bug(p_admin_id uuid, p_category text, p_title text, p_status text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  new_id UUID;
BEGIN
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can create bugs';
  END IF;
  
  INSERT INTO public.bugs (category, title, status)
  VALUES (p_category, p_title, p_status)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;


--
-- Name: create_game(uuid, text, text, text, text, boolean, text, text, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_game(p_admin_id uuid, p_title text, p_description text, p_url text, p_preview text, p_embed boolean, p_is_tab text, p_category text, p_thumbnail_url text, p_display_order integer) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    new_id UUID;
BEGIN
    IF NOT public.has_role(p_admin_id, 'admin') THEN
        RAISE EXCEPTION 'Only admins can create games';
    END IF;
    
    INSERT INTO public.games (title, description, url, preview, embed, is_tab, category, thumbnail_url, display_order, created_by)
    VALUES (p_title, p_description, p_url, p_preview, p_embed, p_is_tab, p_category, p_thumbnail_url, p_display_order, p_admin_id)
    RETURNING id INTO new_id;
    
    RETURN new_id;
END;
$$;


--
-- Name: delete_announcement(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_announcement(p_admin_id uuid, p_announcement_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can delete announcements';
  END IF;
  
  DELETE FROM public.announcements WHERE id = p_announcement_id;
  RETURN TRUE;
END;
$$;


--
-- Name: delete_app_user(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_app_user(p_admin_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;
  
  -- Prevent deleting self
  IF p_admin_id = p_user_id THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;
  
  DELETE FROM public.app_users WHERE id = p_user_id;
  RETURN TRUE;
END;
$$;


--
-- Name: delete_bug(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_bug(p_admin_id uuid, p_bug_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can delete bugs';
  END IF;
  
  DELETE FROM public.bugs WHERE id = p_bug_id;
  RETURN TRUE;
END;
$$;


--
-- Name: delete_game(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_game(p_admin_id uuid, p_game_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    IF NOT public.has_role(p_admin_id, 'admin') THEN
        RAISE EXCEPTION 'Only admins can delete games';
    END IF;
    
    DELETE FROM public.games WHERE id = p_game_id;
    RETURN TRUE;
END;
$$;


--
-- Name: delete_uploaded_music(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_uploaded_music(p_admin_id uuid, p_music_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can delete music';
  END IF;
  
  DELETE FROM public.uploaded_music WHERE id = p_music_id;
  RETURN TRUE;
END;
$$;


--
-- Name: get_all_app_users(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_all_app_users() RETURNS TABLE(id uuid, username text, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT au.id, au.username, au.created_at
  FROM app_users au
  ORDER BY au.username;
END;
$$;


--
-- Name: get_all_users(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_all_users(p_admin_id uuid) RETURNS TABLE(id uuid, username text, role public.app_role, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can view all users';
  END IF;
  
  RETURN QUERY
  SELECT u.id, u.username, r.role, u.created_at
  FROM public.app_users u
  LEFT JOIN public.user_roles r ON u.id = r.user_id
  ORDER BY u.created_at DESC;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: seed_admin_user(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.seed_admin_user(p_username text, p_password_hash text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  new_user_id UUID;
  existing_admin UUID;
BEGIN
  -- Check if any admin exists
  SELECT u.id INTO existing_admin
  FROM public.app_users u
  JOIN public.user_roles r ON u.id = r.user_id
  WHERE r.role = 'admin'
  LIMIT 1;
  
  IF existing_admin IS NOT NULL THEN
    RAISE EXCEPTION 'Admin already exists';
  END IF;
  
  -- Create admin user
  INSERT INTO public.app_users (username, password_hash)
  VALUES (p_username, p_password_hash)
  RETURNING id INTO new_user_id;
  
  -- Assign admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new_user_id, 'admin');
  
  RETURN new_user_id;
END;
$$;


--
-- Name: update_announcement(uuid, uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_announcement(p_admin_id uuid, p_announcement_id uuid, p_title text, p_content text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can update announcements';
  END IF;
  
  UPDATE public.announcements 
  SET title = p_title, content = p_content, updated_at = now()
  WHERE id = p_announcement_id;
  
  RETURN TRUE;
END;
$$;


--
-- Name: update_game(uuid, uuid, text, text, text, text, boolean, text, text, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_game(p_admin_id uuid, p_game_id uuid, p_title text, p_description text, p_url text, p_preview text, p_embed boolean, p_is_tab text, p_category text, p_thumbnail_url text, p_display_order integer) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    IF NOT public.has_role(p_admin_id, 'admin') THEN
        RAISE EXCEPTION 'Only admins can update games';
    END IF;
    
    UPDATE public.games
    SET title = p_title,
        description = p_description,
        url = p_url,
        preview = p_preview,
        embed = p_embed,
        is_tab = p_is_tab,
        category = p_category,
        thumbnail_url = p_thumbnail_url,
        display_order = p_display_order,
        updated_at = now()
    WHERE id = p_game_id;
    
    RETURN TRUE;
END;
$$;


--
-- Name: update_user_password(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_password(p_admin_id uuid, p_user_id uuid, p_new_password_hash text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can update users';
  END IF;
  
  UPDATE public.app_users SET password_hash = p_new_password_hash WHERE id = p_user_id;
  RETURN TRUE;
END;
$$;


--
-- Name: verify_login(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_login(p_username text, p_password_hash text) RETURNS TABLE(user_id uuid, username text, role public.app_role)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.username, r.role
  FROM public.app_users u
  LEFT JOIN public.user_roles r ON u.id = r.user_id
  WHERE u.username = p_username
    AND u.password_hash = p_password_hash;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: announcement_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcement_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    announcement_id uuid NOT NULL,
    user_id uuid,
    display_name text NOT NULL,
    comment text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: app_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);


--
-- Name: bugs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bugs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category text NOT NULL,
    title text NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bugs_status_check CHECK ((status = ANY (ARRAY['down'::text, 'issue'::text])))
);


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    reply_to_id uuid
);


--
-- Name: direct_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.direct_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_id uuid NOT NULL,
    sender_username text NOT NULL,
    receiver_id uuid NOT NULL,
    receiver_username text NOT NULL,
    message text NOT NULL,
    read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    reply_to_id uuid
);


--
-- Name: favorite_songs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favorite_songs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    music_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: friend_nicknames; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.friend_nicknames (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    friend_id uuid NOT NULL,
    nickname text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: friend_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.friend_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_user_id uuid NOT NULL,
    from_username text NOT NULL,
    to_user_id uuid NOT NULL,
    to_username text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT friend_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text])))
);


--
-- Name: friendships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.friendships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    friend_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: games; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.games (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    url text DEFAULT ''::text NOT NULL,
    preview text DEFAULT ''::text NOT NULL,
    embed boolean DEFAULT true NOT NULL,
    is_tab text,
    category text DEFAULT 'arcade'::text NOT NULL,
    thumbnail_url text,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);


--
-- Name: message_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id uuid NOT NULL,
    user_id uuid NOT NULL,
    username text NOT NULL,
    emoji text NOT NULL,
    message_type text DEFAULT 'server'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notification_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    muted_user_id uuid NOT NULL,
    mute_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: playlist_songs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.playlist_songs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    playlist_id uuid NOT NULL,
    music_id uuid NOT NULL,
    added_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: uno_games; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.uno_games (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    creator_id uuid NOT NULL,
    creator_username text NOT NULL,
    status text DEFAULT 'lobby'::text NOT NULL,
    allow_stacking boolean DEFAULT true NOT NULL,
    turn_time_limit integer,
    max_players integer DEFAULT 4 NOT NULL,
    current_turn_player_id uuid,
    direction integer DEFAULT 1 NOT NULL,
    current_color text,
    draw_pile jsonb DEFAULT '[]'::jsonb,
    discard_pile jsonb DEFAULT '[]'::jsonb,
    winner_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    started_at timestamp with time zone,
    finished_at timestamp with time zone
);


--
-- Name: uno_invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.uno_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    game_id uuid NOT NULL,
    from_user_id uuid NOT NULL,
    from_username text NOT NULL,
    to_user_id uuid NOT NULL,
    to_username text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: uno_players; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.uno_players (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    game_id uuid NOT NULL,
    user_id uuid NOT NULL,
    username text NOT NULL,
    hand jsonb DEFAULT '[]'::jsonb,
    turn_order integer NOT NULL,
    is_ready boolean DEFAULT false NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: uploaded_music; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.uploaded_music (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    artist text DEFAULT 'Unknown Artist'::text NOT NULL,
    file_path text NOT NULL,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    genre text DEFAULT 'Other'::text,
    cover_url text
);


--
-- Name: user_blocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_blocks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blocker_id uuid NOT NULL,
    blocked_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_playlists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_playlists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    display_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL
);


--
-- Name: user_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_status (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    last_seen timestamp with time zone DEFAULT now() NOT NULL,
    is_online boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: announcement_comments announcement_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcement_comments
    ADD CONSTRAINT announcement_comments_pkey PRIMARY KEY (id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: app_users app_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_pkey PRIMARY KEY (id);


--
-- Name: app_users app_users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_username_key UNIQUE (username);


--
-- Name: bugs bugs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bugs
    ADD CONSTRAINT bugs_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: direct_messages direct_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direct_messages
    ADD CONSTRAINT direct_messages_pkey PRIMARY KEY (id);


--
-- Name: favorite_songs favorite_songs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_songs
    ADD CONSTRAINT favorite_songs_pkey PRIMARY KEY (id);


--
-- Name: favorite_songs favorite_songs_user_id_music_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_songs
    ADD CONSTRAINT favorite_songs_user_id_music_id_key UNIQUE (user_id, music_id);


--
-- Name: friend_nicknames friend_nicknames_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friend_nicknames
    ADD CONSTRAINT friend_nicknames_pkey PRIMARY KEY (id);


--
-- Name: friend_nicknames friend_nicknames_user_id_friend_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friend_nicknames
    ADD CONSTRAINT friend_nicknames_user_id_friend_id_key UNIQUE (user_id, friend_id);


--
-- Name: friend_requests friend_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friend_requests
    ADD CONSTRAINT friend_requests_pkey PRIMARY KEY (id);


--
-- Name: friendships friendships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_pkey PRIMARY KEY (id);


--
-- Name: friendships friendships_user_id_friend_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_user_id_friend_id_key UNIQUE (user_id, friend_id);


--
-- Name: games games_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_pkey PRIMARY KEY (id);


--
-- Name: message_reactions message_reactions_message_id_user_id_emoji_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_message_id_user_id_emoji_key UNIQUE (message_id, user_id, emoji);


--
-- Name: message_reactions message_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_pkey PRIMARY KEY (id);


--
-- Name: notification_settings notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_pkey PRIMARY KEY (id);


--
-- Name: notification_settings notification_settings_user_id_muted_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_user_id_muted_user_id_key UNIQUE (user_id, muted_user_id);


--
-- Name: playlist_songs playlist_songs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlist_songs
    ADD CONSTRAINT playlist_songs_pkey PRIMARY KEY (id);


--
-- Name: playlist_songs playlist_songs_playlist_id_music_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlist_songs
    ADD CONSTRAINT playlist_songs_playlist_id_music_id_key UNIQUE (playlist_id, music_id);


--
-- Name: uno_games uno_games_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uno_games
    ADD CONSTRAINT uno_games_pkey PRIMARY KEY (id);


--
-- Name: uno_invites uno_invites_game_id_to_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uno_invites
    ADD CONSTRAINT uno_invites_game_id_to_user_id_key UNIQUE (game_id, to_user_id);


--
-- Name: uno_invites uno_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uno_invites
    ADD CONSTRAINT uno_invites_pkey PRIMARY KEY (id);


--
-- Name: uno_players uno_players_game_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uno_players
    ADD CONSTRAINT uno_players_game_id_user_id_key UNIQUE (game_id, user_id);


--
-- Name: uno_players uno_players_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uno_players
    ADD CONSTRAINT uno_players_pkey PRIMARY KEY (id);


--
-- Name: uploaded_music uploaded_music_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uploaded_music
    ADD CONSTRAINT uploaded_music_pkey PRIMARY KEY (id);


--
-- Name: user_blocks user_blocks_blocker_id_blocked_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT user_blocks_blocker_id_blocked_id_key UNIQUE (blocker_id, blocked_id);


--
-- Name: user_blocks user_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_blocks
    ADD CONSTRAINT user_blocks_pkey PRIMARY KEY (id);


--
-- Name: user_playlists user_playlists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_playlists
    ADD CONSTRAINT user_playlists_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: user_status user_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_status
    ADD CONSTRAINT user_status_pkey PRIMARY KEY (id);


--
-- Name: user_status user_status_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_status
    ADD CONSTRAINT user_status_user_id_key UNIQUE (user_id);


--
-- Name: announcement_comments announcement_comments_announcement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcement_comments
    ADD CONSTRAINT announcement_comments_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES public.announcements(id) ON DELETE CASCADE;


--
-- Name: announcement_comments announcement_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcement_comments
    ADD CONSTRAINT announcement_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id);


--
-- Name: announcements announcements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_users(id);


--
-- Name: app_users app_users_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_users(id) ON DELETE SET NULL;


--
-- Name: chat_messages chat_messages_reply_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_reply_to_id_fkey FOREIGN KEY (reply_to_id) REFERENCES public.chat_messages(id) ON DELETE SET NULL;


--
-- Name: direct_messages direct_messages_reply_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direct_messages
    ADD CONSTRAINT direct_messages_reply_to_id_fkey FOREIGN KEY (reply_to_id) REFERENCES public.direct_messages(id) ON DELETE SET NULL;


--
-- Name: favorite_songs favorite_songs_music_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_songs
    ADD CONSTRAINT favorite_songs_music_id_fkey FOREIGN KEY (music_id) REFERENCES public.uploaded_music(id) ON DELETE CASCADE;


--
-- Name: games games_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_users(id);


--
-- Name: playlist_songs playlist_songs_music_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlist_songs
    ADD CONSTRAINT playlist_songs_music_id_fkey FOREIGN KEY (music_id) REFERENCES public.uploaded_music(id) ON DELETE CASCADE;


--
-- Name: playlist_songs playlist_songs_playlist_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlist_songs
    ADD CONSTRAINT playlist_songs_playlist_id_fkey FOREIGN KEY (playlist_id) REFERENCES public.user_playlists(id) ON DELETE CASCADE;


--
-- Name: uno_invites uno_invites_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uno_invites
    ADD CONSTRAINT uno_invites_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.uno_games(id) ON DELETE CASCADE;


--
-- Name: uno_players uno_players_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uno_players
    ADD CONSTRAINT uno_players_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.uno_games(id) ON DELETE CASCADE;


--
-- Name: uploaded_music uploaded_music_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uploaded_music
    ADD CONSTRAINT uploaded_music_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.app_users(id) ON DELETE SET NULL;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;


--
-- Name: announcement_comments Anyone can add comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can add comments" ON public.announcement_comments FOR INSERT WITH CHECK (true);


--
-- Name: message_reactions Anyone can add reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can add reactions" ON public.message_reactions FOR INSERT WITH CHECK (true);


--
-- Name: favorite_songs Anyone can delete favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete favorites" ON public.favorite_songs FOR DELETE USING (true);


--
-- Name: friend_requests Anyone can delete friend_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete friend_requests" ON public.friend_requests FOR DELETE USING (true);


--
-- Name: friendships Anyone can delete friendships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete friendships" ON public.friendships FOR DELETE USING (true);


--
-- Name: friend_nicknames Anyone can delete nicknames; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete nicknames" ON public.friend_nicknames FOR DELETE USING (true);


--
-- Name: notification_settings Anyone can delete notification_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete notification_settings" ON public.notification_settings FOR DELETE USING (true);


--
-- Name: playlist_songs Anyone can delete playlist songs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete playlist songs" ON public.playlist_songs FOR DELETE USING (true);


--
-- Name: user_playlists Anyone can delete playlists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete playlists" ON public.user_playlists FOR DELETE USING (true);


--
-- Name: message_reactions Anyone can delete reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete reactions" ON public.message_reactions FOR DELETE USING (true);


--
-- Name: uno_games Anyone can delete uno_games; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete uno_games" ON public.uno_games FOR DELETE USING (true);


--
-- Name: uno_invites Anyone can delete uno_invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete uno_invites" ON public.uno_invites FOR DELETE USING (true);


--
-- Name: uno_players Anyone can delete uno_players; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete uno_players" ON public.uno_players FOR DELETE USING (true);


--
-- Name: user_blocks Anyone can delete user_blocks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can delete user_blocks" ON public.user_blocks FOR DELETE USING (true);


--
-- Name: direct_messages Anyone can insert direct_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert direct_messages" ON public.direct_messages FOR INSERT WITH CHECK (true);


--
-- Name: favorite_songs Anyone can insert favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert favorites" ON public.favorite_songs FOR INSERT WITH CHECK (true);


--
-- Name: friend_requests Anyone can insert friend_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert friend_requests" ON public.friend_requests FOR INSERT WITH CHECK (true);


--
-- Name: friendships Anyone can insert friendships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert friendships" ON public.friendships FOR INSERT WITH CHECK (true);


--
-- Name: chat_messages Anyone can insert messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert messages" ON public.chat_messages FOR INSERT WITH CHECK (true);


--
-- Name: friend_nicknames Anyone can insert nicknames; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert nicknames" ON public.friend_nicknames FOR INSERT WITH CHECK (true);


--
-- Name: notification_settings Anyone can insert notification_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert notification_settings" ON public.notification_settings FOR INSERT WITH CHECK (true);


--
-- Name: playlist_songs Anyone can insert playlist songs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert playlist songs" ON public.playlist_songs FOR INSERT WITH CHECK (true);


--
-- Name: user_playlists Anyone can insert playlists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert playlists" ON public.user_playlists FOR INSERT WITH CHECK (true);


--
-- Name: user_profiles Anyone can insert profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert profiles" ON public.user_profiles FOR INSERT WITH CHECK (true);


--
-- Name: uno_games Anyone can insert uno_games; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert uno_games" ON public.uno_games FOR INSERT WITH CHECK (true);


--
-- Name: uno_invites Anyone can insert uno_invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert uno_invites" ON public.uno_invites FOR INSERT WITH CHECK (true);


--
-- Name: uno_players Anyone can insert uno_players; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert uno_players" ON public.uno_players FOR INSERT WITH CHECK (true);


--
-- Name: user_status Anyone can insert user status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert user status" ON public.user_status FOR INSERT WITH CHECK (true);


--
-- Name: user_blocks Anyone can insert user_blocks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert user_blocks" ON public.user_blocks FOR INSERT WITH CHECK (true);


--
-- Name: announcements Anyone can read announcements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read announcements" ON public.announcements FOR SELECT USING (true);


--
-- Name: bugs Anyone can read bugs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read bugs" ON public.bugs FOR SELECT USING (true);


--
-- Name: announcement_comments Anyone can read comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read comments" ON public.announcement_comments FOR SELECT USING (true);


--
-- Name: direct_messages Anyone can read direct_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read direct_messages" ON public.direct_messages FOR SELECT USING (true);


--
-- Name: favorite_songs Anyone can read favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read favorites" ON public.favorite_songs FOR SELECT USING (true);


--
-- Name: friend_requests Anyone can read friend_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read friend_requests" ON public.friend_requests FOR SELECT USING (true);


--
-- Name: friendships Anyone can read friendships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read friendships" ON public.friendships FOR SELECT USING (true);


--
-- Name: games Anyone can read games; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read games" ON public.games FOR SELECT USING (true);


--
-- Name: chat_messages Anyone can read messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read messages" ON public.chat_messages FOR SELECT USING (true);


--
-- Name: friend_nicknames Anyone can read nicknames; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read nicknames" ON public.friend_nicknames FOR SELECT USING (true);


--
-- Name: notification_settings Anyone can read notification_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read notification_settings" ON public.notification_settings FOR SELECT USING (true);


--
-- Name: playlist_songs Anyone can read playlist songs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read playlist songs" ON public.playlist_songs FOR SELECT USING (true);


--
-- Name: user_playlists Anyone can read playlists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read playlists" ON public.user_playlists FOR SELECT USING (true);


--
-- Name: user_profiles Anyone can read profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read profiles" ON public.user_profiles FOR SELECT USING (true);


--
-- Name: message_reactions Anyone can read reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read reactions" ON public.message_reactions FOR SELECT USING (true);


--
-- Name: uno_games Anyone can read uno_games; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read uno_games" ON public.uno_games FOR SELECT USING (true);


--
-- Name: uno_invites Anyone can read uno_invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read uno_invites" ON public.uno_invites FOR SELECT USING (true);


--
-- Name: uno_players Anyone can read uno_players; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read uno_players" ON public.uno_players FOR SELECT USING (true);


--
-- Name: user_status Anyone can read user status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read user status" ON public.user_status FOR SELECT USING (true);


--
-- Name: user_blocks Anyone can read user_blocks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read user_blocks" ON public.user_blocks FOR SELECT USING (true);


--
-- Name: direct_messages Anyone can update direct_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update direct_messages" ON public.direct_messages FOR UPDATE USING (true);


--
-- Name: friend_requests Anyone can update friend_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update friend_requests" ON public.friend_requests FOR UPDATE USING (true);


--
-- Name: friend_nicknames Anyone can update nicknames; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update nicknames" ON public.friend_nicknames FOR UPDATE USING (true);


--
-- Name: notification_settings Anyone can update notification_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update notification_settings" ON public.notification_settings FOR UPDATE USING (true);


--
-- Name: user_playlists Anyone can update playlists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update playlists" ON public.user_playlists FOR UPDATE USING (true);


--
-- Name: user_profiles Anyone can update profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update profiles" ON public.user_profiles FOR UPDATE USING (true);


--
-- Name: uno_games Anyone can update uno_games; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update uno_games" ON public.uno_games FOR UPDATE USING (true);


--
-- Name: uno_invites Anyone can update uno_invites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update uno_invites" ON public.uno_invites FOR UPDATE USING (true);


--
-- Name: uno_players Anyone can update uno_players; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update uno_players" ON public.uno_players FOR UPDATE USING (true);


--
-- Name: user_status Anyone can update user status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update user status" ON public.user_status FOR UPDATE USING (true);


--
-- Name: uploaded_music Anyone can view uploaded music; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view uploaded music" ON public.uploaded_music FOR SELECT USING (true);


--
-- Name: app_users No direct access to app_users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct access to app_users" ON public.app_users USING (false);


--
-- Name: user_roles No direct access to user_roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct access to user_roles" ON public.user_roles USING (false);


--
-- Name: uploaded_music No direct delete on uploaded_music; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct delete on uploaded_music" ON public.uploaded_music FOR DELETE USING (false);


--
-- Name: uploaded_music No direct insert on uploaded_music; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct insert on uploaded_music" ON public.uploaded_music FOR INSERT WITH CHECK (false);


--
-- Name: announcement_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.announcement_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: announcements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

--
-- Name: app_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

--
-- Name: bugs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bugs ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: direct_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: favorite_songs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.favorite_songs ENABLE ROW LEVEL SECURITY;

--
-- Name: friend_nicknames; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.friend_nicknames ENABLE ROW LEVEL SECURITY;

--
-- Name: friend_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: friendships; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

--
-- Name: games; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

--
-- Name: message_reactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: playlist_songs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.playlist_songs ENABLE ROW LEVEL SECURITY;

--
-- Name: uno_games; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.uno_games ENABLE ROW LEVEL SECURITY;

--
-- Name: uno_invites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.uno_invites ENABLE ROW LEVEL SECURITY;

--
-- Name: uno_players; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.uno_players ENABLE ROW LEVEL SECURITY;

--
-- Name: uploaded_music; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.uploaded_music ENABLE ROW LEVEL SECURITY;

--
-- Name: user_blocks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

--
-- Name: user_playlists; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_playlists ENABLE ROW LEVEL SECURITY;

--
-- Name: user_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_status; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;