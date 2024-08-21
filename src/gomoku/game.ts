import { createGame } from "../app/game";

function isVictory(
  board: number[][],
  player: number,
  [x, y]: [number, number]
) {
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];

  for (const [dx, dy] of directions) {
    let count = 1;
    for (let i = 1; i < 5; i++) {
      const nx = x + i * dx;
      const ny = y + i * dy;
      if (nx < 0 || nx >= 19 || ny < 0 || ny >= 19) break;
      if (board[ny][nx] !== player) break;
      count++;
    }
    for (let i = 1; i < 5; i++) {
      const nx = x - i * dx;
      const ny = y - i * dy;
      if (nx < 0 || nx >= 19 || ny < 0 || ny >= 19) break;
      if (board[ny][nx] !== player) break;
      count++;
    }
    if (count >= 5) return true;
  }

  return false;
}

export const gomoku = createGame({
  setup: () => ({
    board: Array.from({ length: 19 }, () =>
      Array.from({ length: 19 }, () => null as number | null)
    ),
    currentPlayer: 0,
    winner: null as number | null,
  }),

  moves: {
    clickCell: ({ G, ctx, playerID }, [x, y]: [number, y: number]) => {
      if (G.winner !== null) return;
      const index =
        ctx.numPlayers === 1
          ? G.currentPlayer
          : ctx.playOrder.indexOf(playerID);
      if (G.currentPlayer !== index) return;
      if (G.board[y][x] !== null) return;
      G.board[y][x] = index;
      if (isVictory(G.board, index, [x, y])) G.winner = index;
      G.currentPlayer = (G.currentPlayer + 1) % 2;
    },
  },
});
