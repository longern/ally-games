import { createGame } from "../../app/game";
import { produce } from "immer";

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
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 2],
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

  [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 0],
    [1, 1],
    [1, 2],
    [2, 0],
    [2, 1],
    [2, 2],
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

function getHighestScoreBlock(G: GameState) {
  let highestScore = 0;
  let highestScoreBlocks: number[] = [];
  for (let pieceId = 0; pieceId < PIECES.length; pieceId++) {
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) {
        for (const [dx, dy] of PIECES[pieceId])
          if (G.board[y + dy]?.[x + dx] !== 0) continue;
        const newState = produce(G, (G) => placeBlock({ G }, pieceId, 1, x, y));
        if (newState.score > highestScore) {
          highestScore = newState.score;
          highestScoreBlocks = [pieceId];
        } else if (newState.score === highestScore) {
          highestScoreBlocks.push(pieceId);
        }
      }
    }
  }
  return highestScoreBlocks[
    Math.floor(Math.random() * highestScoreBlocks.length)
  ];
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

  const samples = sample(
    range(PIECES.length),
    3,
    (i) =>
      distribution(PIECES[i].length) /
      PIECES.filter((p) => p.length === PIECES[i].length).length
  );

  if (G && blockCount >= 24 && random() < 0.5)
    samples.splice(Math.floor(random() * 3), 1, getHighestScoreBlock(G));

  return samples.map(colorize);
}

function placeBlock(
  { G }: { G: GameState },
  pieceId: number,
  color: number,
  x: number,
  y: number
) {
  const piece = PIECES[pieceId];
  for (const [dx, dy] of piece) if (G.board[y + dy]?.[x + dx] !== 0) return;
  for (const [dx, dy] of piece) G.board[y + dy][x + dx] = color;

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
    placeCandidate({ G }, candidateIndex: number, x: number, y: number) {
      if (typeof G.candidates[candidateIndex] !== "object") return;
      const pieceId = G.candidates[candidateIndex].pieceId;
      const color = G.candidates[candidateIndex].color;
      const currentScore = G.score;
      placeBlock({ G }, pieceId, color, x, y);

      if (G.score > currentScore) G.candidates[candidateIndex] = null;

      if (G.candidates.every((c) => c === null))
        G.candidates = generateCandidates(G);
    },
  },

  maxPlayers: 1,
});

export default game;
