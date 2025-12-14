-- Create a function to seed admin user without RLS restrictions
CREATE OR REPLACE FUNCTION public.seed_admin_user(
  p_username TEXT,
  p_password_hash TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Function to check if admin exists
CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE role = 'admin'
  )
$$;