import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Users, Play, UserPlus, X, Clock, Layers, Crown, Sparkles, Gamepad2 } from 'lucide-react';
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

    // Check if user already has an active game
    if (myGame) {
      toast.error('You already have an active game. Leave it first to create a new one.');
      return;
    }

    // Double-check in database to prevent race conditions
    const { data: existingGame } = await supabase
      .from('uno_games')
      .select('id')
      .eq('creator_id', user.id)
      .eq('status', 'lobby')
      .single();

    if (existingGame) {
      toast.error('You already have an active game lobby.');
      // Refresh to show the existing game
      const { data: myGameData } = await supabase
        .from('uno_games')
        .select('*')
        .eq('id', existingGame.id)
        .single();
      if (myGameData) setMyGame(myGameData);
      setShowCreateForm(false);
      return;
    }

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
      // Check if user is already in this game
      const { data: existingPlayer } = await supabase
        .from('uno_players')
        .select('id')
        .eq('game_id', game.id)
        .eq('user_id', user.id)
        .single();

      if (existingPlayer) {
        // User is already in the game, just join
        onJoinGame(game.id);
        return;
      }

      const { data: existingPlayers } = await supabase
        .from('uno_players')
        .select('*')
        .eq('game_id', game.id);

      if (existingPlayers && existingPlayers.length >= game.max_players) {
        toast.error('Game is full');
        return;
      }

      const turnOrder = existingPlayers?.length || 0;

      const { error } = await supabase.from('uno_players').insert({
        game_id: game.id,
        user_id: user.id,
        username: user.username,
        turn_order: turnOrder,
        is_ready: false,
      });

      if (error) {
        console.error('Error joining game:', error);
        toast.error('Failed to join game');
        return;
      }

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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-red-500/20 via-yellow-500/20 via-green-500/20 to-blue-500/20 border border-white/10">
          <Gamepad2 className="w-8 h-8 text-primary" />
          <h1 className="text-3xl md:text-4xl font-black text-gradient">UNO Multiplayer</h1>
          <Sparkles className="w-6 h-6 text-yellow-500" />
        </div>
        <p className="text-muted-foreground">Challenge your friends to a game of UNO!</p>
      </div>

      {/* Create Game Button */}
      {!myGame && !showCreateForm && (
        <div className="flex justify-center">
          <Button 
            onClick={() => setShowCreateForm(true)} 
            size="lg"
            className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25"
          >
            <Plus className="w-5 h-5" />
            Create New Game
          </Button>
        </div>
      )}

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30 rounded-2xl p-5 space-y-4 backdrop-blur-sm">
          <h3 className="font-bold text-lg text-primary flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Game Invites
          </h3>
          <div className="space-y-3">
            {invites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between bg-background/60 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary-foreground">{invite.from_username[0].toUpperCase()}</span>
                  </div>
                  <span className="font-medium">{invite.from_username} invited you to play!</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => acceptInvite(invite)} className="bg-green-500 hover:bg-green-600">Accept</Button>
                  <Button size="sm" variant="outline" onClick={() => declineInvite(invite)}>Decline</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Game Form */}
      {showCreateForm && (
        <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              Create New Game
            </h3>
            <button onClick={() => setShowCreateForm(false)} className="p-2 hover:bg-muted rounded-lg transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-muted/30 rounded-xl p-4 space-y-3">
              <Label htmlFor="stacking" className="flex items-center gap-2 text-base font-semibold">
                <Layers className="w-5 h-5 text-blue-500" />
                Allow Stacking
              </Label>
              <p className="text-xs text-muted-foreground">Stack +2 and +4 cards</p>
              <Switch
                id="stacking"
                checked={allowStacking}
                onCheckedChange={setAllowStacking}
              />
            </div>

            <div className="bg-muted/30 rounded-xl p-4 space-y-3">
              <Label htmlFor="timeLimit" className="flex items-center gap-2 text-base font-semibold">
                <Clock className="w-5 h-5 text-orange-500" />
                Turn Time Limit
              </Label>
              <p className="text-xs text-muted-foreground">Seconds per turn (optional)</p>
              <Input
                id="timeLimit"
                type="number"
                placeholder="No limit"
                value={turnTimeLimit || ''}
                onChange={(e) => setTurnTimeLimit(e.target.value ? parseInt(e.target.value) : null)}
                min={10}
                max={120}
                className="bg-background/50"
              />
            </div>

            <div className="bg-muted/30 rounded-xl p-4 space-y-3">
              <Label htmlFor="maxPlayers" className="flex items-center gap-2 text-base font-semibold">
                <Users className="w-5 h-5 text-green-500" />
                Max Players
              </Label>
              <p className="text-xs text-muted-foreground">2-8 players</p>
              <Input
                id="maxPlayers"
                type="number"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                min={2}
                max={8}
                className="bg-background/50"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
            <Button onClick={createGame} className="gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600">
              <Play className="w-4 h-4" />
              Create Game
            </Button>
          </div>
        </div>
      )}

      {/* My Game Lobby */}
      {myGame && (
        <div className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-6 space-y-5 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-yellow-500/25">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Your Game Lobby</h3>
                <p className="text-sm text-muted-foreground">Waiting for players...</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowInviteModal(true)} className="gap-2">
                <UserPlus className="w-4 h-4" />
                Invite
              </Button>
              <Button size="sm" variant="destructive" onClick={leaveGame} className="gap-2">
                <X className="w-4 h-4" />
                Cancel
              </Button>
            </div>
          </div>

          {/* Game Settings */}
          <div className="flex flex-wrap gap-3">
            <div className="px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-400 text-sm font-medium">
              <Layers className="w-3.5 h-3.5 inline mr-1.5" />
              Stacking: {myGame.allow_stacking ? 'On' : 'Off'}
            </div>
            <div className="px-3 py-1.5 rounded-full bg-orange-500/20 text-orange-400 text-sm font-medium">
              <Clock className="w-3.5 h-3.5 inline mr-1.5" />
              Time: {myGame.turn_time_limit ? `${myGame.turn_time_limit}s` : 'Unlimited'}
            </div>
            <div className="px-3 py-1.5 rounded-full bg-green-500/20 text-green-400 text-sm font-medium">
              <Users className="w-3.5 h-3.5 inline mr-1.5" />
              Max: {myGame.max_players}
            </div>
          </div>

          {/* Players */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
              Players ({players.length}/{myGame.max_players})
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 bg-background/60 backdrop-blur-sm rounded-xl px-4 py-3 border border-border/30"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
                    {player.user_id === myGame.creator_id ? (
                      <Crown className="w-4 h-4 text-yellow-400" />
                    ) : (
                      <span className="text-xs font-bold text-primary-foreground">{player.username[0].toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{player.username}</p>
                    {player.is_ready && (
                      <span className="text-xs text-green-500 font-medium">Ready</span>
                    )}
                  </div>
                </div>
              ))}
              {/* Empty slots */}
              {Array.from({ length: myGame.max_players - players.length }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex items-center justify-center gap-2 bg-muted/20 rounded-xl px-4 py-3 border border-dashed border-border/30"
                >
                  <Users className="w-4 h-4 text-muted-foreground/50" />
                  <span className="text-sm text-muted-foreground/50">Empty</span>
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={startGame}
            disabled={players.length < 2}
            size="lg"
            className="w-full gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-5 h-5" />
            Start Game ({players.length}/2 minimum)
          </Button>
        </div>
      )}

      {/* Invite Friends Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                Invite Friends
              </h3>
              <button onClick={() => setShowInviteModal(false)} className="p-2 hover:bg-muted rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <ScrollArea className="h-72">
              {friends.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No friends to invite</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">Add friends in the Chat section</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {friends.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center justify-between bg-muted/30 hover:bg-muted/50 rounded-xl p-4 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary-foreground">{friend.username[0].toUpperCase()}</span>
                        </div>
                        <span className="font-medium">{friend.username}</span>
                      </div>
                      <Button size="sm" onClick={() => inviteFriend(friend)} className="gap-1.5">
                        <UserPlus className="w-4 h-4" />
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
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Available Games
          </h3>
          {games.length === 0 ? (
            <div className="text-center py-12 bg-muted/20 rounded-2xl border border-border/30">
              <Gamepad2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No games available</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Create one to start playing!</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {games.map((game) => (
                <div
                  key={game.id}
                  className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-5 flex items-center justify-between hover:bg-card/70 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                      <Crown className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-lg">{game.creator_username}'s Game</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground">
                          Stacking: {game.allow_stacking ? 'On' : 'Off'}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground">
                          Time: {game.turn_time_limit ? `${game.turn_time_limit}s` : 'None'}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground">
                          Max: {game.max_players}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button onClick={() => joinGame(game)} className="gap-2">
                    <Play className="w-4 h-4" />
                    Join
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}