import { Ctx, makeGame } from "../Client";

export type GameAction = "emergency" | "vote" | "videocam" | "trade" | "vault";

export type GameState = {
  phase:
    | "decide"
    | "emergency"
    | "vote"
    | "forced-trade"
    | "videocam"
    | "trade"
    | "trade-response"
    | "vault"
    | "action"
    | "conclude";
  secret: {
    vault: number[];
    realOutliar: string;
  };
  players: Record<
    string,
    {
      hand: number[];
      handInSight: number[] | undefined;
      faceDown: number[];
      action: GameAction;
      outliarInSight: string;
      vote: number | undefined;
    }
  >;
  // Players' public information
  pub: Record<
    string,
    {
      action: GameAction | undefined;
      score: number;
      roundScore: number | undefined;
      faceDownCount: number;
      done: boolean;
      vote: number | undefined;
    }
  >;
  targets: Record<string, string>;
  winner: "outliar" | "ally" | null;
  extra: number | undefined;
};

const WILD_CARD = -2;
const BLANK_CARD = -1;

function insort<T>(array: T[], value: T) {
  const insertIndex = array.findLastIndex((item) => item <= value) + 1;
  array.splice(insertIndex, 0, value);
}

function range(end: number) {
  return Array.from({ length: end }, (_, i) => i);
}

function init({ ctx }: { ctx: Ctx }) {
  const realOutliar = ctx.playOrder[Math.floor(Math.random() * ctx.numPlayers)];
  const players = {};
  const pub = {};
  ctx.playOrder.forEach((playerID) => {
    players[playerID] = { faceDown: [] };
    pub[playerID] = { score: 0, faceDownCount: 0 };
    if (playerID !== realOutliar)
      players[playerID].outliarInSight = realOutliar;
    else {
      const randomInt = Math.floor(Math.random() * (ctx.numPlayers - 1));
      const randomIndex =
        ctx.playOrder[randomInt] === playerID ? ctx.numPlayers - 1 : randomInt;
      players[playerID].outliarInSight = ctx.playOrder[randomIndex];
    }
  });

  const deck = [
    WILD_CARD,
    ...range(ctx.numPlayers).flatMap((i) => new Array(ctx.numPlayers).fill(i)),
    ...new Array(ctx.numPlayers - 1).fill(BLANK_CARD),
  ];

  for (const playerID in players) {
    const hand = [];
    for (let i = 0; i < ctx.numPlayers - 1; i++) {
      hand.push(deck.splice(Math.floor(Math.random() * deck.length), 1)[0]);
    }
    hand.sort();
    players[playerID].hand = hand;
  }

  const vault: number[] = [];
  for (let i = 0; i < deck.length; i++) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    vault.push(deck[randomIndex]);
    deck.splice(randomIndex, 1);
  }

  return {
    phase: "decide",
    secret: { vault, realOutliar },
    players,
    pub,
    targets: {},
    winner: null,
  } as GameState;
}

function conclude({ G }: { G: GameState }) {
  G.players[G.secret.realOutliar].outliarInSight = G.secret.realOutliar;
  const numPlayers = Object.keys(G.players).length;

  if (Object.values(G.pub).some((player) => player.action === "emergency")) {
    G.pub[G.secret.realOutliar].roundScore = numPlayers - 1;
    const falseEmergency = Object.entries(G.players).filter(
      ([id, player]) =>
        player.action === "emergency" && id !== G.secret.realOutliar
    );
    if (!falseEmergency.length) {
      Object.keys(G.players).forEach((id) => {
        if (id !== G.secret.realOutliar) {
          G.pub[id].roundScore = -1;
        }
      });
    } else {
      const punish = Math.ceil((numPlayers - 1) / falseEmergency.length);
      Object.keys(G.players).forEach((id) => {
        if (id !== G.secret.realOutliar) {
          G.pub[id].roundScore =
            G.players[id].action !== "emergency" ? 0 : -punish;
        }
      });
      G.extra =
        (G.extra || 0) + (punish * falseEmergency.length - (numPlayers - 1));
    }
  } else {
    if (G.winner === "outliar") {
      Object.keys(G.players).forEach((id) => {
        G.pub[id].roundScore =
          id === G.secret.realOutliar ? numPlayers - 1 : -1;
      });
    } else {
      Object.keys(G.players).forEach((id) => {
        G.pub[id].roundScore =
          id === G.secret.realOutliar ? -(numPlayers - 1) : 1;
      });
    }
  }
}

const game = makeGame({
  setup({ ctx }) {
    return init({ ctx });
  },

  phases: {
    decide: {
      onBegin({ G, ctx }) {
        ctx.playOrder.forEach((id) => {
          G.players[id].action = undefined;
          G.pub[id].action = undefined;
          G.pub[id].done = false;
        });
      },

      onEnd({ G, ctx }) {
        ctx.playOrder.forEach((id) => {
          G.pub[id].done = undefined;
        });
      },

      moves: {
        decideAction({ G, ctx, playerID }, action: GameAction) {
          if (G.pub[playerID].done) return;

          G.players[playerID].action = action;
          G.pub[playerID].done = true;

          if (!Object.values(G.pub).every((player) => player.done)) return;

          // Publicize actions
          ctx.playOrder.forEach((id) => {
            G.pub[id].action = G.players[id].action;
          });

          G.phase = "emergency";
        },
      },
    },

    emergency: {
      onBegin({ G, ctx }) {
        if (ctx.playOrder.some((id) => G.pub[id].action === "emergency")) {
          G.phase = "conclude";
        } else {
          G.phase = "vote";
        }
      },
    },

    vote: {
      onBegin({ G }) {
        const playersChooseToVote = Object.keys(G.players).filter(
          (id) => G.players[id].action === "vote"
        );
        if (playersChooseToVote.length === 0) {
          G.phase = "videocam";
        } else if (playersChooseToVote.length === 1) {
          G.phase = "forced-trade";
        } else {
          Object.values(G.pub).forEach((player) => {
            player.done = false;
          });
        }
      },

      moves: {
        vote({ G, ctx, playerID }, cardIndex: number) {
          const me = G.players[playerID];
          if (me.vote !== undefined) return;
          me.vote = me.hand[cardIndex];
          G.pub[playerID].done = true;

          if (!Object.values(G.pub).every((player) => player.done)) return;
          ctx.playOrder.forEach((id) => {
            G.pub[id].vote = G.players[id].vote;
          });
        },

        voteConclude({ G, ctx }) {
          if (!Object.values(G.pub).every((player) => player.done)) return;

          Object.values(G.pub).forEach((player) => (player.done = undefined));

          const voteCounts = Object.values(G.pub).reduce((acc, { vote }) => {
            if (vote === WILD_CARD)
              for (let i = 0; i < ctx.numPlayers; i++)
                acc.set(i, (acc.get(i) || 0) + 1);
            else if (vote !== BLANK_CARD)
              acc.set(vote, (acc.get(vote) || 0) + 1);
            return acc;
          }, new Map<number, number>());

          const maxVotes = Math.max(...voteCounts.values());
          if (
            maxVotes >= ctx.numPlayers - 1 &&
            Array.from(voteCounts.values()).filter(
              (count) => count === maxVotes
            ).length === 1
          ) {
            const [maxVoteCard] = Array.from(voteCounts.entries()).find(
              ([, count]) => count === maxVotes
            );
            G.winner =
              ctx.playOrder[maxVoteCard] === G.secret.realOutliar
                ? "ally"
                : "outliar";
            G.phase = "conclude";
            return;
          }

          ctx.playOrder.forEach((playerID) => {
            G.players[playerID].vote = undefined;
            G.pub[playerID].vote = undefined;
          });

          G.phase = "videocam";
        },
      },
    },

    "forced-trade": {
      onBegin({ G }) {
        Object.values(G.pub).forEach((player) => {
          player.done = player.action === "vote" ? false : undefined;
        });
      },

      moves: {
        pickPlayer({ G, playerID }, target: string) {
          if (
            G.players[playerID].action !== "vote" ||
            G.targets[playerID] !== undefined
          )
            return;

          G.targets[playerID] = target;
          G.players[playerID].handInSight = G.players[target].hand;
        },

        pickOtherCard({ G, playerID }, theirCard: number) {
          if (
            G.targets[playerID] === undefined ||
            G.players[playerID].faceDown.length > 0
          )
            return;

          const me = G.players[playerID];
          const target = G.players[G.targets[playerID]];
          if (!target.hand.includes(theirCard)) return;
          me.faceDown = [theirCard];
          G.pub[playerID].faceDownCount = 1;
          me.handInSight = undefined;
          target.hand.splice(target.hand.indexOf(theirCard), 1);
        },

        pickCard({ G, playerID, ctx }, yourCard: number) {
          if (
            G.targets[playerID] === undefined ||
            G.players[playerID].faceDown.length === 0
          )
            return;

          if (
            ctx.playOrder[yourCard] !== playerID &&
            G.players[playerID].hand.some(
              (card) => ctx.playOrder[card] === playerID
            )
          )
            return;

          const me = G.players[playerID];
          const target = G.players[G.targets[playerID]];
          me.hand.splice(me.hand.indexOf(yourCard), 1);
          insort(target.hand, yourCard);
          insort(me.hand, me.faceDown[0]);
          me.faceDown = [];
          G.pub[playerID].faceDownCount = 0;
          G.targets[playerID] = undefined;

          G.phase = "videocam";
        },
      },
    },

    videocam: {
      onBegin({ G }) {
        Object.values(G.pub).forEach((player) => {
          player.done = player.action === "videocam" ? false : undefined;
        });

        if (
          Object.values(G.players).every(
            (player) => player.action !== "videocam"
          )
        )
          G.phase = "trade";
      },

      moves: {
        pickPlayer({ G, ctx, playerID }, target: string) {
          if (G.players[playerID].action !== "videocam" || playerID === target)
            return;

          G.targets[playerID] = target;
          G.pub[playerID].done = true;

          const playerMonitering = ctx.playOrder.filter(
            (id) => G.players[id].action === "videocam"
          );
          if (playerMonitering.some((id) => G.targets[id] === undefined))
            return;

          playerMonitering.forEach((id) => {
            G.players[id].handInSight = [...G.players[G.targets[id]].hand];
            G.pub[id].done = false;
          });
        },

        videocamConclude({ G, ctx, playerID }) {
          if (
            G.players[playerID].action !== "videocam" ||
            G.players[playerID].handInSight === undefined
          )
            return;

          G.players[playerID].handInSight = undefined;
          G.targets[playerID] = undefined;
          G.pub[playerID].done = true;

          const playerMonitering = ctx.playOrder.filter(
            (id) => G.players[id].action === "videocam"
          );
          if (!playerMonitering.every((id) => G.pub[id].done)) return;

          G.phase = "trade";
        },
      },
    },

    trade: {
      onBegin({ G }) {
        Object.values(G.pub).forEach((player) => {
          player.done = player.action === "trade" ? false : undefined;
        });

        if (
          Object.values(G.players).every((player) => player.action !== "trade")
        )
          G.phase = "vault";
      },

      moves: {
        pickPlayer({ G, playerID }, target: string) {
          if (
            G.players[playerID].action !== "trade" ||
            playerID === target ||
            G.targets[playerID] !== undefined
          )
            return;

          G.targets[playerID] = target;
        },

        pickCard({ G, ctx, playerID }, card: number) {
          const me = G.players[playerID];
          if (
            me.action !== "trade" ||
            G.targets[playerID] === undefined ||
            me.faceDown.length > 0
          )
            return;

          if (
            ctx.playOrder[card] !== playerID &&
            me.hand.some((card) => ctx.playOrder[card] === playerID)
          )
            return;

          const picked = me.hand.splice(me.hand.indexOf(card), 1)[0];
          me.faceDown = [picked];
          G.pub[playerID].faceDownCount = 1;
          G.pub[playerID].done = true;

          if (
            Object.entries(G.players)
              .filter(([, player]) => player.action === "trade")
              .every(([id]) => G.pub[id].done)
          )
            G.phase = "trade-response";
        },
      },
    },

    "trade-response": {
      moves: {
        pickResponse({ G, ctx, playerID }, cardIndexes: number[]) {
          const me = G.players[playerID];
          if (
            cardIndexes.some((i) => ctx.playOrder[me.hand[i]] !== playerID) &&
            G.players[playerID].hand
              .filter((_, i) => !cardIndexes.includes(i))
              .some((card) => ctx.playOrder[card] === playerID)
          )
            return;

          const sourcePlayers = Object.entries(G.players).filter(
            ([id, player]) =>
              player.action === "trade" && G.targets[id] === playerID
          );
          if (cardIndexes.length !== sourcePlayers.length) return;

          const responses = [];
          for (const index of cardIndexes.toReversed()) {
            const [response] = me.hand.splice(index, 1);
            const randomIndex = Math.floor(
              Math.random() * (responses.length + 1)
            );
            responses.splice(randomIndex, 0, response);
          }
          sourcePlayers.forEach(([id, player], index) => {
            insort(player.hand, responses[index]);
            insort(me.hand, player.faceDown[0]);
            player.faceDown = [];
            G.pub[id].faceDownCount = 0;
            G.targets[id] = undefined;
          });

          if (
            Object.values(G.pub).every((player) => player.faceDownCount === 0)
          ) {
            G.phase = "vault";
          }
        },
      },
    },

    vault: {
      onBegin({ G }) {
        Object.values(G.pub).forEach((player) => {
          player.done = player.action === "vault" ? false : undefined;
        });

        if (
          Object.values(G.players).every((player) => player.action !== "vault")
        )
          G.phase = "decide";
      },

      moves: {
        vault({ G, ctx, playerID }, card: number) {
          if (G.pub[playerID].done !== false) return;

          if (
            ctx.playOrder[card] !== playerID &&
            G.players[playerID].hand.some(
              (card) => ctx.playOrder[card] === playerID
            )
          )
            return;

          const me = G.players[playerID];
          const giveaway = me.hand.splice(me.hand.indexOf(card), 1)[0];
          const randomIndex = Math.floor(Math.random() * G.secret.vault.length);
          const receive = G.secret.vault[randomIndex];
          insort(me.hand, receive);
          G.secret.vault.splice(randomIndex, 1, giveaway);
          G.pub[playerID].done = true;

          if (
            ctx.playOrder
              .filter((id) => G.players[id].action === "vault")
              .every((id) => G.pub[id].done)
          ) {
            G.phase = "decide";
            ctx.playOrder.forEach((id) => {
              G.players[id].action = undefined;
              G.pub[id].action = undefined;
              G.pub[id].done = false;
              G.targets[id] = undefined;
            });
          }
        },
      },
    },

    conclude: {
      onBegin({ G }) {
        conclude({ G });
      },

      moves: {
        nextRound({ G, ctx }) {
          ctx.playOrder.forEach((id) => {
            G.pub[id].score +=
              G.pub[id].roundScore || 0 + (G.extra >= ctx.numPlayers ? 1 : 0);
            G.pub[id].roundScore = 0;
            G.pub[id].action = undefined;
            G.pub[id].vote = undefined;
            G.pub[id].faceDownCount = 0;
            G.pub[id].done = false;
          });

          if (G.extra >= ctx.numPlayers) G.extra -= ctx.numPlayers;

          const { pub, extra, ...state } = init({ ctx });
          Object.assign(G, state);
        },
      },
    },
  },

  moves: {
    init({ G, ctx }) {
      Object.assign(G, init({ ctx }));
    },
  },

  minPlayers: 4,
  maxPlayers: 8,
});

export default game;
