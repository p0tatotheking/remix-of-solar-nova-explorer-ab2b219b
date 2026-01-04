import { useState } from 'react';
import { UnoLobby } from './uno/UnoLobby';
import { UnoGameBoard } from './uno/UnoGameBoard';

export function UnoGame() {
  const [activeGameId, setActiveGameId] = useState<string | null>(null);

  if (activeGameId) {
    return (
      <UnoGameBoard
        gameId={activeGameId}
        onLeave={() => setActiveGameId(null)}
      />
    );
  }

  return <UnoLobby onJoinGame={setActiveGameId} />;
}
