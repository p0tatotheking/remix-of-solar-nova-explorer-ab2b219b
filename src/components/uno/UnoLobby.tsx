import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Users, Play, UserPlus, X, Clock, Layers, Crown } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface UnoGame {
  id: string;
  creator_id: string;
  creator_username: string;
  status: string;
  allow_stacking: boolean;
  turn_time_limit: number | null;
  max_players: number;
  created_at: string;
}

interface UnoPlayer {
  id: string;
  game_id: string;
  user_id: string;
  username: string;
  is_ready: boolean;
  turn_order: number;
}

interface UnoInvite {
  id: string;
  game_id: string;
  from_username: string;
  to_user_id: string;
  status: string;
}

interface Friend {
  id: string;
  username: string;
}

interface UnoLobbyProps {
  onJoinGame: (gameId: string) => void;
}

export function UnoLobby({ onJoinGame }: UnoLobbyProps) {
  const { user } = useAuth();
  const [games, setGames] = useState<UnoGame[]>([]);
  const [myGame, setMyGame] = useState<UnoGame | null>(null);
  const [players, setPlayers] = useState<UnoPlayer[]>([]);
  const [invites, setInvites] = useState<UnoInvite[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  // Create game form state
  const [allowStacking, setAllowStacking] = useState(true);
  const [turnTimeLimit, setTurnTimeLimit] = useState<number | null>(null);
  const [maxPlayers, setMaxPlayers] = useState(4);

  // Fetch games, invites, and friends
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Fetch lobby games
      const { data: gamesData } = await supabase
        .from('uno_games')
        .select('*')
        .eq('status', 'lobby')
        .order('created_at', { ascending: false });
      
      if (gamesData) setGames(gamesData);

      // Check if user has a game they created
      const { data: myGameData } = await supabase
        .from('uno_games')
        .select('*')
        .eq('creator_id', user.id)
        .eq('status', 'lobby')
        .single();
      
      if (myGameData) {
        setMyGame(myGameData);
        // Fetch players in my game
        const { data: playersData } = await supabase
          .from('uno_players')
          .select('*')
          .eq('game_id', myGameData.id)
          .order('turn_order');
        
        if (playersData) setPlayers(playersData);
      }

      // Fetch pending invites for the user
      const { data: invitesData } = await supabase
        .from('uno_invites')
        .select('*')
        .eq('to_user_id', user.id)
        .eq('status', 'pending');
      
      if (invitesData) setInvites(invitesData);

      // Fetch friends
      const { data: friendships } = await supabase
        .from('friendships')
        .select('friend_id')
        .eq('user_id', user.id);
      
      if (friendships && friendships.length > 0) {
        const friendIds = friendships.map(f => f.friend_id);
        const { data: allUsers } = await supabase.rpc('get_all_app_users');
        
        if (allUsers) {
          const friendUsers = allUsers.filter((u: { id: string; username: string }) =>
            friendIds.includes(u.id)
          );
          setFriends(friendUsers);
        }
      }
    };

    fetchData();

    // Subscribe to realtime updates
    const gamesChannel = supabase
      .channel('uno-lobby')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'uno_games' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'uno_players' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'uno_invites' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(gamesChannel);
    };
  }, [user]);

  const createGame = async () => {
    if (!user) return;

    try {
      const { data: game, error } = await supabase
        .from('uno_games')
        .insert({
          creator_id: user.id,
          creator_username: user.username,
          allow_stacking: allowStacking,
          turn_time_limit: turnTimeLimit,
          max_players: maxPlayers,
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as first player
      await supabase.from('uno_players').insert({
        game_id: game.id,
        user_id: user.id,
        username: user.username,
        turn_order: 0,
        is_ready: true,
      });

      setMyGame(game);
      setShowCreateForm(false);
      toast.success('Game created! Invite your friends.');
    } catch (error) {
      toast.error('Failed to create game');
    }
  };

  const inviteFriend = async (friend: Friend) => {
    if (!user || !myGame) return;

    try {
      await supabase.from('uno_invites').insert({
        game_id: myGame.id,
        from_user_id: user.id,
        from_username: user.username,
        to_user_id: friend.id,
        to_username: friend.username,
      });

      toast.success(`Invited ${friend.username}`);
    } catch (error) {
      toast.error('Failed to send invite');
    }
  };

  const acceptInvite = async (invite: UnoInvite) => {
    if (!user) return;

    try {
      // Get current player count
      const { data: existingPlayers } = await supabase
        .from('uno_players')
        .select('*')
        .eq('game_id', invite.game_id);

      const turnOrder = existingPlayers?.length || 0;

      // Add player to game
      await supabase.from('uno_players').insert({
        game_id: invite.game_id,
        user_id: user.id,
        username: user.username,
        turn_order: turnOrder,
        is_ready: false,
      });

      // Update invite status
      await supabase
        .from('uno_invites')
        .update({ status: 'accepted' })
        .eq('id', invite.id);

      onJoinGame(invite.game_id);
    } catch (error) {
      toast.error('Failed to join game');
    }
  };

  const declineInvite = async (invite: UnoInvite) => {
    await supabase
      .from('uno_invites')
      .update({ status: 'declined' })
      .eq('id', invite.id);
  };

  const joinGame = async (game: UnoGame) => {
    if (!user) return;

    try {
      const { data: existingPlayers } = await supabase
        .from('uno_players')
        .select('*')
        .eq('game_id', game.id);

      if (existingPlayers && existingPlayers.length >= game.max_players) {
        toast.error('Game is full');
        return;
      }

      const turnOrder = existingPlayers?.length || 0;

      await supabase.from('uno_players').insert({
        game_id: game.id,
        user_id: user.id,
        username: user.username,
        turn_order: turnOrder,
        is_ready: false,
      });

      onJoinGame(game.id);
    } catch (error) {
      toast.error('Failed to join game');
    }
  };

  const startGame = async () => {
    if (!myGame || players.length < 2) {
      toast.error('Need at least 2 players to start');
      return;
    }

    onJoinGame(myGame.id);
  };

  const leaveGame = async () => {
    if (!user || !myGame) return;

    // Delete the game if creator leaves
    await supabase.from('uno_games').delete().eq('id', myGame.id);
    setMyGame(null);
    setPlayers([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gradient">UNO Multiplayer</h1>
        {!myGame && !showCreateForm && (
          <Button onClick={() => setShowCreateForm(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Game
          </Button>
        )}
      </div>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 space-y-3">
          <h3 className="font-semibold text-primary flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Game Invites
          </h3>
          {invites.map((invite) => (
            <div key={invite.id} className="flex items-center justify-between bg-background/50 rounded-lg p-3">
              <span>{invite.from_username} invited you to play UNO!</span>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => acceptInvite(invite)}>Accept</Button>
                <Button size="sm" variant="outline" onClick={() => declineInvite(invite)}>Decline</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Game Form */}
      {showCreateForm && (
        <div className="bg-muted/30 border border-border/30 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold">Create New Game</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="stacking" className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Allow Stacking (+2/+4)
              </Label>
              <Switch
                id="stacking"
                checked={allowStacking}
                onCheckedChange={setAllowStacking}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeLimit" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Turn Time Limit (seconds)
              </Label>
              <Input
                id="timeLimit"
                type="number"
                placeholder="No limit"
                value={turnTimeLimit || ''}
                onChange={(e) => setTurnTimeLimit(e.target.value ? parseInt(e.target.value) : null)}
                min={10}
                max={120}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxPlayers" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Max Players
              </Label>
              <Input
                id="maxPlayers"
                type="number"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                min={2}
                max={8}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={createGame}>Create Game</Button>
            <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* My Game Lobby */}
      {myGame && (
        <div className="bg-muted/30 border border-border/30 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              Your Game Lobby
            </h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowInviteModal(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Friends
              </Button>
              <Button size="sm" variant="destructive" onClick={leaveGame}>
                <X className="w-4 h-4 mr-2" />
                Cancel Game
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Stacking: {myGame.allow_stacking ? 'On' : 'Off'}</span>
            <span>Time Limit: {myGame.turn_time_limit ? `${myGame.turn_time_limit}s` : 'None'}</span>
            <span>Max Players: {myGame.max_players}</span>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Players ({players.length}/{myGame.max_players})</h4>
            <div className="flex flex-wrap gap-2">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-2 bg-background/50 rounded-lg px-3 py-2"
                >
                  {player.user_id === myGame.creator_id && (
                    <Crown className="w-4 h-4 text-yellow-500" />
                  )}
                  <span>{player.username}</span>
                  {player.is_ready && (
                    <span className="text-xs text-green-500">Ready</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={startGame}
            disabled={players.length < 2}
            className="w-full gap-2"
          >
            <Play className="w-4 h-4" />
            Start Game ({players.length}/2 minimum)
          </Button>
        </div>
      )}

      {/* Invite Friends Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Invite Friends</h3>
              <button onClick={() => setShowInviteModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <ScrollArea className="h-64">
              {friends.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No friends to invite</p>
              ) : (
                <div className="space-y-2">
                  {friends.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center justify-between bg-muted/30 rounded-lg p-3"
                    >
                      <span>{friend.username}</span>
                      <Button size="sm" onClick={() => inviteFriend(friend)}>
                        Invite
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Available Games */}
      {!myGame && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Available Games
          </h3>
          {games.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No games available. Create one to start playing!
            </p>
          ) : (
            <div className="grid gap-4">
              {games.map((game) => (
                <div
                  key={game.id}
                  className="bg-muted/30 border border-border/30 rounded-lg p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{game.creator_username}'s Game</p>
                    <p className="text-sm text-muted-foreground">
                      Stacking: {game.allow_stacking ? 'On' : 'Off'} •
                      Time: {game.turn_time_limit ? `${game.turn_time_limit}s` : 'None'} •
                      Max: {game.max_players} players
                    </p>
                  </div>
                  <Button onClick={() => joinGame(game)}>Join</Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
