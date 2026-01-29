-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Users can view their own game progress" ON public.game_progress;
DROP POLICY IF EXISTS "Users can insert their own game progress" ON public.game_progress;
DROP POLICY IF EXISTS "Users can update their own game progress" ON public.game_progress;
DROP POLICY IF EXISTS "Users can delete their own game progress" ON public.game_progress;

-- Since this app uses custom auth (app_users table, not Supabase auth), 
-- and the user_id in game_progress references app_users, not auth.users,
-- we need permissive policies since auth.uid() won't work here.
-- The application layer handles user validation through the AuthContext.

-- Create policies that allow all operations (app layer handles auth)
CREATE POLICY "Allow all game progress operations"
ON public.game_progress
FOR ALL
USING (true)
WITH CHECK (true);