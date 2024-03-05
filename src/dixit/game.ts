import { STRIP_SECRET, makeGame } from "../Client";

export type GameState = {
  stage: "upload" | "pick" | "confuse" | "guess" | "reveal";
  description: string;
  players: Record<
    string,
    {
      hand: string[];
      submission: string | undefined;
      boardIndex: number | undefined;
      guess: number | undefined;
    }
  >;
  scores: Record<string, number>;
  board: string[];
  mapping: Record<string, number>;
  currentPlayer: string;
};

export const GuessPicture = makeGame({
  setup: ({ ctx }) => {
    return {
      stage: "upload",
      description: "",
      players: Object.fromEntries(
        ctx.playOrder.map((player) => [
          player,
          {
            hand: [],
            guess: undefined,
            submission: undefined,
            boardIndex: undefined,
          },
        ])
      ),
      scores: Object.fromEntries(ctx.playOrder.map((player) => [player, 0])),
      board: [],
      mapping: {},
      currentPlayer: ctx.playOrder[0],
    } as GameState;
  },

  moves: {
    uploadPictures({ G, playerID }, pictures: string[]) {
      if (G.stage !== "upload") return;
      if (G.players[playerID].hand.length >= 6) return;
      pictures.splice(6 - G.players[playerID].hand.length);
      G.players[playerID].hand.push(...pictures);
      if (Object.values(G.players).every((p) => p.hand.length === 6)) {
        G.stage = "pick";
      }
    },

    pickPicture({ G, playerID }, picture: string, description: string) {
      if (G.stage !== "pick") return;
      G.description = description;
      const handIndex = G.players[playerID].hand.indexOf(picture);
      G.players[playerID].hand.splice(handIndex, 1);
      G.players[playerID].submission = picture;
      G.stage = "confuse";
    },

    pickConfusingPicture({ G, playerID }, picture: string) {
      if (G.stage !== "confuse") return;
      if (G.players[playerID].submission) return;
      const handIndex = G.players[playerID].hand.indexOf(picture);
      G.players[playerID].hand.splice(handIndex, 1);
      G.players[playerID].submission = picture;
      if (Object.values(G.players).every((p) => p.submission !== undefined)) {
        G.stage = "guess";
        const playerIDs = Object.keys(G.players);
        const shuffledIndexes: number[] = [];
        for (let i = 0; i < playerIDs.length; i++) {
          const j = Math.floor(Math.random() * (i + 1));
          shuffledIndexes.splice(j, 0, i);
        }
        G.board = shuffledIndexes.map((shuffledIndex, i) => {
          const player = G.players[playerIDs[shuffledIndex]];
          player.boardIndex = i;
          return player.submission!;
        });
      }
    },

    guess({ G, playerID }, guess: number) {
      if (G.stage !== "guess") return;

      G.players[playerID].guess = guess;
      const guesses = Object.fromEntries(
        Object.entries(G.players)
          .filter(([playerID]) => playerID !== G.currentPlayer)
          .map(([playerID, value]) => [playerID, value.guess])
      );

      if (!Object.values(guesses).every((guess) => guess !== undefined)) return;

      // Everyone has made a guess
      G.stage = "reveal";

      G.mapping = Object.fromEntries(
        Object.entries(G.players).map(([playerID, value]) => [
          playerID,
          value.boardIndex!,
        ])
      );
      const answer = G.mapping[G.currentPlayer];
      let scores: Record<string, number> = {};
      if (
        Object.values(guesses).every((guess) => guess === answer) ||
        Object.values(guesses).every((guess) => guess !== answer)
      ) {
        Object.keys(guesses).forEach((p) => (scores[p] = 2));
      } else {
        for (const p in guesses) {
          if (guesses[p] === answer) {
            scores[p] = (scores[p] || 0) + 2;
            scores[G.currentPlayer] = (scores[G.currentPlayer] || 0) + 1;
          } else {
            const [owner] = Object.entries(G.mapping).find(
              ([, index]) => index === guesses[p]
            )!;
            scores[owner] = (scores[owner] || 0) + 1;
          }
        }
      }
      for (const p in scores) {
        G.scores[p] += scores[p];
      }
    },

    nextRound({ G, ctx: { playOrder } }) {
      if (G.stage !== "reveal") return;
      G.stage = "upload";
      G.description = "";
      G.board = [];
      G.mapping = {};
      for (const playerID in G.players) {
        G.players[playerID].guess = undefined;
        G.players[playerID].submission = undefined;
        G.players[playerID].boardIndex = undefined;
      }
      const currentPlayerIndex = playOrder.indexOf(G.currentPlayer);
      G.currentPlayer = playOrder[(currentPlayerIndex + 1) % playOrder.length];
    },
  },

  playerView: STRIP_SECRET,
});
