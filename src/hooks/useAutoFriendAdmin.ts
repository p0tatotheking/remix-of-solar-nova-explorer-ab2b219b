import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const AUTO_FRIEND_ADMIN_KEY = 'solarnova_auto_friend_admin';

export function useAutoFriendAdmin() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    
    // Don't run for admin users
    if (user.role === 'admin') return;

    // Check if we've already done this for this user
    const processedUsers = JSON.parse(localStorage.getItem(AUTO_FRIEND_ADMIN_KEY) || '[]');
    if (processedUsers.includes(user.id)) return;

    const autoFriendWithAdmin = async () => {
      try {
        // Find the admin user
        const { data: adminRole } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin')
          .limit(1)
          .single();

        if (!adminRole) return;

        const adminId = adminRole.user_id;
        
        // Check if already friends
        const { data: existingFriendship } = await supabase
          .from('friendships')
          .select('id')
          .or(`and(user_id.eq.${user.id},friend_id.eq.${adminId}),and(user_id.eq.${adminId},friend_id.eq.${user.id})`)
          .limit(1);

        if (existingFriendship && existingFriendship.length > 0) {
          // Already friends, mark as processed
          processedUsers.push(user.id);
          localStorage.setItem(AUTO_FRIEND_ADMIN_KEY, JSON.stringify(processedUsers));
          return;
        }

        // Check if there's already a friend request
        const { data: existingRequest } = await supabase
          .from('friend_requests')
          .select('id')
          .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${adminId}),and(from_user_id.eq.${adminId},to_user_id.eq.${user.id})`)
          .limit(1);

        if (existingRequest && existingRequest.length > 0) {
          // Already has a request, mark as processed
          processedUsers.push(user.id);
          localStorage.setItem(AUTO_FRIEND_ADMIN_KEY, JSON.stringify(processedUsers));
          return;
        }

        // Get admin username
        const { data: adminUser } = await supabase
          .from('app_users')
          .select('username')
          .eq('id', adminId)
          .single();

        if (!adminUser) return;

        // Create mutual friendship directly (skip friend request flow)
        await supabase.from('friendships').insert([
          { user_id: user.id, friend_id: adminId },
          { user_id: adminId, friend_id: user.id },
        ]);

        // Mark this user as processed
        processedUsers.push(user.id);
        localStorage.setItem(AUTO_FRIEND_ADMIN_KEY, JSON.stringify(processedUsers));

        console.log('Auto-friended with admin account');
      } catch (error) {
        console.error('Error auto-friending with admin:', error);
      }
    };

    autoFriendWithAdmin();
  }, [user]);
}
