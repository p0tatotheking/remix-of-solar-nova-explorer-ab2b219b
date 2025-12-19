import { useState, useEffect } from 'react';
import { 
  Search,
  Music,
  Loader2,
  Trash2,
  Upload as UploadIcon
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMusicPlayer } from './PersistentMusicPlayer';
import { useAuth } from '@/contexts/AuthContext';
import { MusicUpload } from './MusicUpload';
import { toast } from 'sonner';
import { SpotifyMusicPlayer } from './music/SpotifyMusicPlayer';

// Re-export the new Spotify-style player as the default
export function MusicPlayer() {
  return <SpotifyMusicPlayer />;
}
