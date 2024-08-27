import { createGame } from "../app/game";

type GameState = {
  board: number[][];
  candidates: ({ pieceId: number; color: number } | null)[];
  score: number;
  combo: number;
  comboResetCounter: number;
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

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

const accumulate = (arr: number[]) => {
  const result = [] as number[];
  let sum = 0;
  for (const n of arr) {
    sum += n;
    result.push(sum);
  }
  return result;
};

function normalDistribution(mean = 0, stdev = 1) {
  return (x: number) =>
    Math.exp(-0.5 * ((x - mean) / stdev) ** 2) /
    (stdev * Math.sqrt(2 * Math.PI));
}

function generateCandidates(G?: GameState) {
  const random = () => Math.random();

  const sample = <T>(
    arr: T[],
    n: number,
    weight?: number[] | ((x: T) => number)
  ) => {
    const remaining = arr.slice();
    weight = weight || Array(arr.length).fill(1);
    if (typeof weight === "function") weight = arr.map(weight);
    const remainingWeight = weight.slice();
    const result = [] as T[];
    for (let i = 0; i < n; i++) {
      const accumulatedWeights = accumulate(remainingWeight);
      const j = random() * accumulatedWeights[accumulatedWeights.length - 1];
      const index = accumulatedWeights.findIndex((w) => w > j);
      result.push(remaining[index]);
      remaining.splice(index, 1);
      remainingWeight.splice(index, 1);
    }
    return result;
  };

  const colorize = (pieceId: number) => ({
    pieceId,
    color: Math.floor(random() * 4) + 1,
  });

  const blockCount = G ? G.board.flat().filter((b) => b !== 0).length : 0;
  const score = G ? G.score : 0;
  const baseDifficulty = 1 - Math.pow(blockCount / 42, 2);
  const scoreDifficulty = Math.log(score / 5000 + 1) / 5;
  const difficulty = Math.min(Math.max(baseDifficulty + scoreDifficulty, 0), 1);
  const distribution = normalDistribution(difficulty + 3.5, 1);

  return sample(
    range(PIECES.length),
    3,
    (i) =>
      distribution(PIECES[i].length) /
      PIECES.filter((p) => p.length === PIECES[i].length).length
  ).map(colorize);
}

const game = createGame({
  setup: () => {
    return {
      board: Array.from({ length: 8 }, () => Array(8).fill(0)),
      candidates: generateCandidates(),
      score: 0,
      combo: 0,
      comboResetCounter: 0,
    } as GameState;
  },
  moves: {
    placeBlock({ G }, candidateIndex: number, x: number, y: number) {
      if (typeof G.candidates[candidateIndex] !== "object") return;
      const piece = PIECES[G.candidates[candidateIndex].pieceId];
      for (const [dx, dy] of piece) if (G.board[y + dy]?.[x + dx] !== 0) return;
      for (const [dx, dy] of piece)
        G.board[y + dy][x + dx] = G.candidates[candidateIndex].color;
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

      const pieceSize = piece.length;
      const cleared =
        fullRows.filter((r) => r).length + fullCols.filter((c) => c).length;
      const comboResetCounter = cleared > 0 ? 0 : G.comboResetCounter + 1;
      const combo =
        cleared > 0
          ? Math.min(G.combo + 1, 5)
          : comboResetCounter >= 3
          ? 0
          : G.combo;
      const score = G.score + pieceSize + cleared * 10 * combo;

      Object.assign(G, { score, combo, comboResetCounter });

      if (G.candidates.every((c) => c === null))
        G.candidates = generateCandidates(G);
    },
  },
});

export default game;
