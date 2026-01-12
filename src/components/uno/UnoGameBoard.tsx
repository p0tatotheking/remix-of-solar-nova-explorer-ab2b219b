import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { UnoCard, Card } from './UnoCard';
import { ArrowLeft, RotateCcw, RotateCw, Trophy, Clock, Users, Sparkles } from 'lucide-react';

interface UnoGame {
  id: string;
  creator_id: string;
  creator_username: string;
  status: string;
  allow_stacking: boolean;
  turn_time_limit: number | null;
  direction: number;
  current_color: string | null;
  current_turn_player_id: string | null;
  draw_pile: Card[];
  discard_pile: Card[];
  winner_id: string | null;
}

interface UnoPlayer {
  id: string;
  game_id: string;
  user_id: string;
  username: string;
  hand: Card[];
  turn_order: number;
  is_ready: boolean;
}

interface UnoGameBoardProps {
  gameId: string;
  onLeave: () => void;
}

const COLORS = ['red', 'blue', 'green', 'yellow'] as const;
const VALUES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2'];

function generateDeck(): Card[] {
  const deck: Card[] = [];
  let id = 0;

  // Add colored cards
  for (const color of COLORS) {
    // One 0 per color
    deck.push({ id: `card-${id++}`, color, value: '0' });
    
    // Two of each 1-9, skip, reverse, draw2
    for (const value of VALUES.slice(1)) {
      deck.push({ id: `card-${id++}`, color, value });
      deck.push({ id: `card-${id++}`, color, value });
    }
  }

  // Add wild cards (4 of each)
  for (let i = 0; i < 4; i++) {
    deck.push({ id: `card-${id++}`, color: 'wild', value: 'wild' });
    deck.push({ id: `card-${id++}`, color: 'wild', value: 'wild4' });
  }

  return shuffle(deck);
}

function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function UnoGameBoard({ gameId, onLeave }: UnoGameBoardProps) {
  const { user } = useAuth();
  const [game, setGame] = useState<UnoGame | null>(null);
  const [players, setPlayers] = useState<UnoPlayer[]>([]);
  const [myHand, setMyHand] = useState<Card[]>([]);
  const [selectingColor, setSelectingColor] = useState(false);
  const [pendingCard, setPendingCard] = useState<Card | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const isMyTurn = game?.current_turn_player_id === user?.id;
  const topCard = game?.discard_pile?.[game.discard_pile.length - 1];

  // Fetch game state
  const fetchGameState = useCallback(async () => {
    const { data: gameData } = await supabase
      .from('uno_games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameData) {
      // Parse JSONB fields with proper type casting
      const parsedGame = {
        ...gameData,
        draw_pile: (gameData.draw_pile as unknown as Card[]) || [],
        discard_pile: (gameData.discard_pile as unknown as Card[]) || [],
      };
      setGame(parsedGame);
    }

    const { data: playersData } = await supabase
      .from('uno_players')
      .select('*')
      .eq('game_id', gameId)
      .order('turn_order');

    if (playersData) {
      const parsedPlayers = playersData.map(p => ({
        ...p,
        hand: (p.hand as unknown as Card[]) || [],
      }));
      setPlayers(parsedPlayers);

      const me = parsedPlayers.find(p => p.user_id === user?.id);
      if (me) {
        setMyHand(me.hand);
      }
    }
  }, [gameId, user?.id]);

  useEffect(() => {
    fetchGameState();

    const channel = supabase
      .channel(`uno-game-${gameId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'uno_games', filter: `id=eq.${gameId}` }, fetchGameState)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'uno_players', filter: `game_id=eq.${gameId}` }, fetchGameState)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, fetchGameState]);

  // Initialize game if creator and game hasn't started
  useEffect(() => {
    const initializeGame = async () => {
      if (!game || !user || game.status !== 'lobby') return;
      if (game.creator_id !== user.id) return;
      if (players.length < 2) return;

      // Start the game
      const deck = generateDeck();
      const hands: Card[][] = [];
      let currentDeck = [...deck];

      // Deal 7 cards to each player
      for (let i = 0; i < players.length; i++) {
        hands.push(currentDeck.splice(0, 7));
      }

      // Find first non-wild card for discard pile
      let firstCardIndex = currentDeck.findIndex(c => c.color !== 'wild');
      if (firstCardIndex === -1) firstCardIndex = 0;
      const firstCard = currentDeck.splice(firstCardIndex, 1)[0];

      // Update all players' hands
      for (let i = 0; i < players.length; i++) {
        await supabase
          .from('uno_players')
          .update({ hand: hands[i] as unknown as string })
          .eq('id', players[i].id);
      }

      // Update game state
      await supabase
        .from('uno_games')
        .update({
          status: 'playing',
          draw_pile: currentDeck as unknown as string,
          discard_pile: [firstCard] as unknown as string,
          current_color: firstCard.color === 'wild' ? 'red' : firstCard.color,
          current_turn_player_id: players[0].user_id,
          started_at: new Date().toISOString(),
        })
        .eq('id', gameId);

      toast.success('Game started!');
    };

    initializeGame();
  }, [game, players, user, gameId]);

  // Timer for turn time limit
  useEffect(() => {
    if (!game?.turn_time_limit || !isMyTurn) {
      setTimeLeft(null);
      return;
    }

    setTimeLeft(game.turn_time_limit);
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          // Auto draw card when time runs out
          drawCard();
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [game?.turn_time_limit, isMyTurn, game?.current_turn_player_id]);

  const canPlayCard = (card: Card): boolean => {
    if (!topCard || !game?.current_color) return true;
    
    // Wild cards can always be played
    if (card.color === 'wild') return true;
    
    // Match color or value
    return card.color === game.current_color || card.value === topCard.value;
  };

  const getNextPlayer = (currentIndex: number, direction: number): UnoPlayer => {
    const nextIndex = (currentIndex + direction + players.length) % players.length;
    return players[nextIndex];
  };

  const playCard = async (card: Card) => {
    if (!isMyTurn || !game || !user) return;
    if (!canPlayCard(card)) {
      toast.error('Cannot play this card');
      return;
    }

    // Handle wild cards - need to select color
    if (card.color === 'wild') {
      setPendingCard(card);
      setSelectingColor(true);
      return;
    }

    await executePlay(card, card.color);
  };

  const executePlay = async (card: Card, newColor: string) => {
    if (!game || !user) return;

    const currentPlayerIndex = players.findIndex(p => p.user_id === user.id);
    let newDirection = game.direction;
    let nextPlayer = getNextPlayer(currentPlayerIndex, game.direction);
    const newHand = myHand.filter(c => c.id !== card.id);
    const newDiscard = [...game.discard_pile, card];

    // Handle special cards
    if (card.value === 'reverse') {
      newDirection = -game.direction;
      if (players.length === 2) {
        // In 2 player, reverse acts like skip
        nextPlayer = players[currentPlayerIndex];
      } else {
        nextPlayer = getNextPlayer(currentPlayerIndex, newDirection);
      }
    } else if (card.value === 'skip') {
      nextPlayer = getNextPlayer(currentPlayerIndex + game.direction, game.direction);
    } else if (card.value === 'draw2') {
      const skipPlayer = getNextPlayer(currentPlayerIndex, game.direction);
      const drawnCards = game.draw_pile.slice(0, 2);
      const newDrawPile = game.draw_pile.slice(2);
      
      // Give cards to next player
      const skipPlayerData = players.find(p => p.user_id === skipPlayer.user_id);
      if (skipPlayerData) {
        await supabase
          .from('uno_players')
          .update({ hand: [...skipPlayerData.hand, ...drawnCards] as unknown as string })
          .eq('id', skipPlayerData.id);
      }

      await supabase
        .from('uno_games')
        .update({ draw_pile: newDrawPile as unknown as string })
        .eq('id', gameId);

      nextPlayer = getNextPlayer(currentPlayerIndex + game.direction, game.direction);
    } else if (card.value === 'wild4') {
      const skipPlayer = getNextPlayer(currentPlayerIndex, game.direction);
      const drawnCards = game.draw_pile.slice(0, 4);
      const newDrawPile = game.draw_pile.slice(4);
      
      const skipPlayerData = players.find(p => p.user_id === skipPlayer.user_id);
      if (skipPlayerData) {
        await supabase
          .from('uno_players')
          .update({ hand: [...skipPlayerData.hand, ...drawnCards] as unknown as string })
          .eq('id', skipPlayerData.id);
      }

      await supabase
        .from('uno_games')
        .update({ draw_pile: newDrawPile as unknown as string })
        .eq('id', gameId);

      nextPlayer = getNextPlayer(currentPlayerIndex + game.direction, game.direction);
    }

    // Check for win
    if (newHand.length === 0) {
      await supabase
        .from('uno_games')
        .update({
          status: 'finished',
          winner_id: user.id,
          finished_at: new Date().toISOString(),
          discard_pile: newDiscard as unknown as string,
          current_color: newColor,
        })
        .eq('id', gameId);

      await supabase
        .from('uno_players')
        .update({ hand: newHand as unknown as string })
        .eq('game_id', gameId)
        .eq('user_id', user.id);

      toast.success('You won! 🎉');
      return;
    }

    // Update game state
    await supabase
      .from('uno_games')
      .update({
        discard_pile: newDiscard as unknown as string,
        current_color: newColor,
        direction: newDirection,
        current_turn_player_id: nextPlayer.user_id,
      })
      .eq('id', gameId);

    // Update my hand
    await supabase
      .from('uno_players')
      .update({ hand: newHand as unknown as string })
      .eq('game_id', gameId)
      .eq('user_id', user.id);

    setSelectingColor(false);
    setPendingCard(null);
  };

  const selectColor = (color: string) => {
    if (pendingCard) {
      executePlay(pendingCard, color);
    }
  };

  const drawCard = async () => {
    if (!isMyTurn || !game || !user) return;

    if (game.draw_pile.length === 0) {
      // Reshuffle discard pile
      const newDraw = shuffle(game.discard_pile.slice(0, -1));
      const newDiscard = [game.discard_pile[game.discard_pile.length - 1]];
      
      await supabase
        .from('uno_games')
        .update({
          draw_pile: newDraw as unknown as string,
          discard_pile: newDiscard as unknown as string,
        })
        .eq('id', gameId);
    }

    const drawnCard = game.draw_pile[0];
    const newDrawPile = game.draw_pile.slice(1);
    const newHand = [...myHand, drawnCard];

    // Update draw pile
    await supabase
      .from('uno_games')
      .update({ draw_pile: newDrawPile as unknown as string })
      .eq('id', gameId);

    // Update my hand
    await supabase
      .from('uno_players')
      .update({ hand: newHand as unknown as string })
      .eq('game_id', gameId)
      .eq('user_id', user?.id);

    // Move to next player
    const currentPlayerIndex = players.findIndex(p => p.user_id === user?.id);
    const nextPlayer = getNextPlayer(currentPlayerIndex, game.direction);

    await supabase
      .from('uno_games')
      .update({ current_turn_player_id: nextPlayer.user_id })
      .eq('id', gameId);
  };

  if (!game) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading game...</p>
        </div>
      </div>
    );
  }

  if (game.status === 'finished') {
    const winner = players.find(p => p.user_id === game.winner_id);
    const isWinner = game.winner_id === user?.id;
    
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-fade-in">
        <div className={`relative ${isWinner ? 'animate-bounce' : ''}`}>
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-2xl shadow-yellow-500/50">
            <Trophy className="w-12 h-12 text-white" />
          </div>
          <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-400 animate-pulse" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-4xl font-black text-gradient">Game Over!</h2>
          <p className="text-2xl font-bold">
            {isWinner ? '🎉 You Won! 🎉' : `${winner?.username} wins!`}
          </p>
        </div>
        <Button onClick={onLeave} size="lg" className="gap-2 mt-4">
          <ArrowLeft className="w-5 h-5" />
          Back to Lobby
        </Button>
      </div>
    );
  }

  if (game.status === 'lobby') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Waiting for game to start...</h2>
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            <Users className="w-4 h-4" />
            {players.length} players joined
          </p>
        </div>
        <Button variant="outline" onClick={onLeave} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Leave Game
        </Button>
      </div>
    );
  }

  const currentColor = game.current_color;
  const colorGradients: Record<string, string> = {
    red: 'from-red-500/20 to-red-600/10',
    blue: 'from-blue-500/20 to-blue-600/10',
    green: 'from-emerald-500/20 to-emerald-600/10',
    yellow: 'from-yellow-400/20 to-amber-500/10',
  };

  return (
    <div className={`min-h-screen bg-gradient-to-b ${currentColor ? colorGradients[currentColor] : 'from-background to-background'} transition-colors duration-500`}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onLeave} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Leave
          </Button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 text-sm">
              <span className="text-muted-foreground">Direction:</span>
              {game.direction === 1 ? (
                <RotateCw className="w-4 h-4 text-primary" />
              ) : (
                <RotateCcw className="w-4 h-4 text-primary" />
              )}
            </div>
            {timeLeft !== null && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-sm ${
                timeLeft <= 5 ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-primary/20 text-primary'
              }`}>
                <Clock className="w-4 h-4" />
                {timeLeft}s
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Other players */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex flex-wrap justify-center gap-4">
          {players.filter(p => p.user_id !== user?.id).map((player) => {
            const isCurrentTurn = game.current_turn_player_id === player.user_id;
            return (
              <div
                key={player.id}
                className={`text-center p-4 rounded-2xl transition-all duration-300 ${
                  isCurrentTurn
                    ? 'bg-gradient-to-b from-primary/30 to-primary/10 ring-2 ring-primary shadow-lg shadow-primary/25 scale-105'
                    : 'bg-card/50 backdrop-blur-sm border border-border/30'
                }`}
              >
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary-foreground">{player.username[0].toUpperCase()}</span>
                  </div>
                  <p className="font-bold">{player.username}</p>
                  {isCurrentTurn && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full animate-pulse">
                      Playing
                    </span>
                  )}
                </div>
                <div className="flex justify-center -space-x-3">
                  {player.hand.slice(0, 10).map((_, i) => (
                    <div key={i} className="transform hover:translate-y-0" style={{ transform: `rotate(${(i - 2) * 5}deg)` }}>
                      <UnoCard card={{ id: '', color: 'wild', value: '' }} faceDown small />
                    </div>
                  ))}
                  {player.hand.length > 10 && (
                    <div className="w-7 h-10 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                      +{player.hand.length - 10}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2 font-medium">{player.hand.length} cards</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Play area */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center gap-12">
          {/* Draw pile */}
          <div className="text-center">
            <button
              onClick={drawCard}
              disabled={!isMyTurn}
              className="relative transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 group"
            >
              <div className="absolute -inset-2 bg-gradient-to-r from-primary/30 to-primary/10 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              <UnoCard card={{ id: '', color: 'wild', value: '' }} faceDown />
              {isMyTurn && (
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-primary font-medium animate-pulse">
                  Click to draw
                </div>
              )}
            </button>
            <p className="text-xs text-muted-foreground mt-10">Draw ({game.draw_pile.length})</p>
          </div>

          {/* Discard pile */}
          <div className="text-center">
            <div className="relative">
              {topCard && <UnoCard card={topCard} />}
              {/* Current color indicator */}
              <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-2 border-background shadow-lg ${
                currentColor === 'red' ? 'bg-red-500' :
                currentColor === 'blue' ? 'bg-blue-500' :
                currentColor === 'green' ? 'bg-emerald-500' :
                'bg-yellow-400'
              }`} />
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              <span className="capitalize font-bold" style={{
                color: currentColor === 'red' ? '#ef4444' :
                       currentColor === 'blue' ? '#3b82f6' :
                       currentColor === 'green' ? '#10b981' :
                       '#f59e0b'
              }}>{currentColor}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Color selector for wild cards */}
      {selectingColor && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-card border border-border rounded-3xl p-8 shadow-2xl animate-scale-in">
            <h3 className="text-xl font-bold mb-6 text-center">Choose a color</h3>
            <div className="flex gap-4">
              {['red', 'blue', 'green', 'yellow'].map((color) => (
                <button
                  key={color}
                  onClick={() => selectColor(color)}
                  className={`w-16 h-16 rounded-2xl transition-all duration-200 hover:scale-110 hover:shadow-xl ${
                    color === 'red' ? 'bg-gradient-to-br from-red-400 to-red-600 hover:shadow-red-500/50' :
                    color === 'blue' ? 'bg-gradient-to-br from-blue-400 to-blue-600 hover:shadow-blue-500/50' :
                    color === 'green' ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 hover:shadow-emerald-500/50' :
                    'bg-gradient-to-br from-yellow-300 to-amber-500 hover:shadow-yellow-500/50'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* My hand */}
      <div className={`fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t transition-all duration-300 ${
        isMyTurn ? 'border-primary shadow-[0_-4px_20px_rgba(var(--primary),0.2)]' : 'border-border/30'
      }`}>
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="text-center mb-3">
            <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
              isMyTurn 
                ? 'bg-primary text-primary-foreground animate-pulse' 
                : 'bg-muted text-muted-foreground'
            }`}>
              {isMyTurn ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  Your turn!
                </>
              ) : (
                'Waiting for other players...'
              )}
            </span>
          </div>
          <div className="flex justify-center gap-1 overflow-x-auto pb-2 scrollbar-hide">
            {myHand.map((card, index) => (
              <div 
                key={card.id} 
                className="flex-shrink-0 transition-transform duration-200"
                style={{ 
                  transform: `rotate(${(index - myHand.length / 2) * 2}deg)`,
                  transformOrigin: 'bottom center'
                }}
              >
                <UnoCard
                  card={card}
                  onClick={() => playCard(card)}
                  disabled={!isMyTurn || !canPlayCard(card)}
                  highlight={isMyTurn && canPlayCard(card)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
