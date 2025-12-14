-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create users table for custom auth
CREATE TABLE public.app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.app_users(id) ON DELETE SET NULL
);

-- Create user roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.app_users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to verify password (for login)
CREATE OR REPLACE FUNCTION public.verify_login(p_username TEXT, p_password_hash TEXT)
RETURNS TABLE(user_id UUID, username TEXT, role app_role)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Function to create user (admin only, verified in function)
CREATE OR REPLACE FUNCTION public.create_app_user(
  p_admin_id UUID,
  p_username TEXT,
  p_password_hash TEXT,
  p_role app_role DEFAULT 'user'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Function to delete user (admin only)
CREATE OR REPLACE FUNCTION public.delete_app_user(p_admin_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Function to update user password (admin only)
CREATE OR REPLACE FUNCTION public.update_user_password(
  p_admin_id UUID,
  p_user_id UUID,
  p_new_password_hash TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can update users';
  END IF;
  
  UPDATE public.app_users SET password_hash = p_new_password_hash WHERE id = p_user_id;
  RETURN TRUE;
END;
$$;

-- Function to get all users (admin only)
CREATE OR REPLACE FUNCTION public.get_all_users(p_admin_id UUID)
RETURNS TABLE(id UUID, username TEXT, role app_role, created_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- RLS policies - only allow access through security definer functions
CREATE POLICY "No direct access to app_users"
ON public.app_users
FOR ALL
USING (false);

CREATE POLICY "No direct access to user_roles"
ON public.user_roles
FOR ALL
USING (false);