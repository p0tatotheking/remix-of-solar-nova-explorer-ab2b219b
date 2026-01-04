import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { UnoCard, Card } from './UnoCard';
import { ArrowLeft, RotateCcw, RotateCw } from 'lucide-react';

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
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  if (game.status === 'finished') {
    const winner = players.find(p => p.user_id === game.winner_id);
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <h2 className="text-3xl font-bold">Game Over!</h2>
        <p className="text-xl">{winner?.username} wins! 🎉</p>
        <Button onClick={onLeave}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Lobby
        </Button>
      </div>
    );
  }

  if (game.status === 'lobby') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <h2 className="text-2xl font-bold">Waiting for game to start...</h2>
        <p className="text-muted-foreground">Players: {players.length}</p>
        <Button variant="outline" onClick={onLeave}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Leave Game
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" size="sm" onClick={onLeave}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Leave
        </Button>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Direction: {game.direction === 1 ? <RotateCw className="inline w-4 h-4" /> : <RotateCcw className="inline w-4 h-4" />}
          </span>
          {timeLeft !== null && (
            <span className="text-sm font-bold text-primary">{timeLeft}s</span>
          )}
        </div>
      </div>

      {/* Other players */}
      <div className="flex justify-center gap-8 mb-8">
        {players.filter(p => p.user_id !== user?.id).map((player) => (
          <div
            key={player.id}
            className={`text-center p-3 rounded-lg ${
              game.current_turn_player_id === player.user_id
                ? 'bg-primary/20 ring-2 ring-primary'
                : 'bg-muted/30'
            }`}
          >
            <p className="font-medium">{player.username}</p>
            <div className="flex justify-center gap-1 mt-2">
              {Array.from({ length: player.hand.length }).map((_, i) => (
                <UnoCard key={i} card={{ id: '', color: 'wild', value: '' }} faceDown small />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{player.hand.length} cards</p>
          </div>
        ))}
      </div>

      {/* Play area */}
      <div className="flex items-center justify-center gap-8 mb-8">
        {/* Draw pile */}
        <div className="text-center">
          <button
            onClick={drawCard}
            disabled={!isMyTurn}
            className="transition-transform hover:scale-105 disabled:opacity-50"
          >
            <UnoCard card={{ id: '', color: 'wild', value: '' }} faceDown />
          </button>
          <p className="text-xs text-muted-foreground mt-1">Draw ({game.draw_pile.length})</p>
        </div>

        {/* Discard pile */}
        <div className="text-center">
          {topCard && <UnoCard card={topCard} />}
          <p className="text-xs text-muted-foreground mt-1">
            Current: <span className="capitalize font-medium">{game.current_color}</span>
          </p>
        </div>
      </div>

      {/* Color selector for wild cards */}
      {selectingColor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-center">Choose a color</h3>
            <div className="flex gap-4">
              {['red', 'blue', 'green', 'yellow'].map((color) => (
                <button
                  key={color}
                  onClick={() => selectColor(color)}
                  className={`w-16 h-16 rounded-lg transition-transform hover:scale-110 ${
                    color === 'red' ? 'bg-red-500' :
                    color === 'blue' ? 'bg-blue-500' :
                    color === 'green' ? 'bg-green-500' :
                    'bg-yellow-400'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* My hand */}
      <div className={`fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border ${isMyTurn ? 'ring-2 ring-primary' : ''}`}>
        <p className="text-center mb-2 text-sm font-medium">
          {isMyTurn ? "Your turn!" : "Waiting for other players..."}
        </p>
        <div className="flex justify-center gap-2 overflow-x-auto pb-2">
          {myHand.map((card) => (
            <UnoCard
              key={card.id}
              card={card}
              onClick={() => playCard(card)}
              disabled={!isMyTurn || !canPlayCard(card)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
