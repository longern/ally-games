import { createGame } from "../app/game";

type GameState = {
  board: number[][];
  candidates: (number | null)[];
  score: number;
};

export const PIECES: [number, number][][] = [
  [[0, 0]],
  [
    [0, 0],
    [1, 0],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
  ],
  [
    [0, 0],
    [0, 1],
  ],
  [
    [0, 0],
    [0, 1],
    [0, 2],
  ],
  [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
  ],
  [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
  ],
  [
    [0, 0],
    [0, 1],
    [1, 0],
  ],
  [
    [0, 0],
    [0, 1],
    [1, 1],
  ],
  [
    [0, 1],
    [1, 0],
    [1, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [1, 1],
  ],
  [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ],
  [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 0],
  ],
  [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 1],
  ],
  [
    [1, 0],
    [1, 1],
    [1, 2],
    [0, 2],
  ],
  [
    [1, 0],
    [1, 1],
    [1, 2],
    [0, 0],
  ],
  [
    [1, 0],
    [1, 1],
    [1, 2],
    [0, 1],
  ],
  [
    [1, 0],
    [1, 1],
    [1, 2],
    [0, 2],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [0, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [1, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [2, 1],
  ],
  [
    [0, 1],
    [1, 1],
    [2, 1],
    [0, 0],
  ],
  [
    [0, 1],
    [1, 1],
    [2, 1],
    [1, 0],
  ],
  [
    [0, 1],
    [1, 1],
    [2, 1],
    [2, 0],
  ],

  [
    [0, 0],
    [0, 1],
    [1, 1],
    [1, 2],
  ],
  [
    [1, 0],
    [1, 1],
    [0, 1],
    [0, 2],
  ],
  [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 1],
  ],
  [
    [0, 1],
    [1, 1],
    [1, 0],
    [2, 0],
  ],
];

function generateCandidates() {
  return Array.from({ length: 3 }, () =>
    Math.floor(Math.random() * PIECES.length)
  );
}

const game = createGame({
  setup: () => {
    return {
      board: Array.from({ length: 8 }, () => Array(8).fill(0)),
      candidates: generateCandidates(),
      score: 0,
    } as GameState;
  },
  moves: {
    placeBlock({ G }, candidateIndex: number, x: number, y: number) {
      if (typeof G.candidates[candidateIndex] !== "number") return;
      const piece = PIECES[G.candidates[candidateIndex]];
      for (const [dx, dy] of piece) if (G.board[y + dy]?.[x + dx] !== 0) return;
      for (const [dx, dy] of piece) G.board[y + dy][x + dx] = 1;
      G.candidates[candidateIndex] = null;

      const fullRows = Array.from({ length: 8 }, () => true);
      const fullCols = Array.from({ length: 8 }, () => true);
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          if (G.board[i][j] === 0) {
            fullRows[i] = false;
            fullCols[j] = false;
          }
        }
      }

      for (let i = 0; i < 8; i++) if (fullRows[i]) G.board[i].fill(0);
      for (let j = 0; j < 8; j++)
        if (fullCols[j]) for (let i = 0; i < 8; i++) G.board[i][j] = 0;

      G.score +=
        fullRows.filter((r) => r).length + fullCols.filter((c) => c).length;

      if (G.candidates.every((c) => c === null))
        G.candidates = generateCandidates();
    },
  },
});

export default game;
