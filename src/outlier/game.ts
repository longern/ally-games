import { Ctx, makeGame } from "../Client";

export type GameAction = "emergency" | "vote" | "monitor" | "trade" | "vault";

export type GameState = {
  stage: "decide" | "action" | "conclude";
  actionStage: GameAction | undefined;
  secret: {
    vault: number[];
    realOutlier: string;
  };
  players: Record<
    string,
    {
      hand: number[];
      vote: string | undefined;
      handInSight: number[] | undefined;
      action: GameAction;
      outlierInSight: string;
    }
  >;
  // Players' public information
  pub: Record<
    string,
    {
      action: GameAction | undefined;
      score: number;
      done: boolean;
      vote: string | undefined;
    }
  >;
  targets: Record<string, string>;
};

function init({ ctx }: { ctx: Ctx }) {
  const realOutlier = ctx.playOrder[Math.floor(Math.random() * ctx.numPlayers)];
  const players = {};
  const pub = {};
  ctx.playOrder.forEach((playerID) => {
    players[playerID] = {};
    pub[playerID] = { score: 0 };
    if (playerID !== realOutlier)
      players[playerID].outlierInSight = realOutlier;
    else {
      const randomInt = Math.floor(Math.random() * (ctx.numPlayers - 1));
      const randomIndex =
        ctx.playOrder[randomInt] === playerID ? ctx.numPlayers - 1 : randomInt;
      players[playerID].outlierInSight = ctx.playOrder[randomIndex];
    }
  });

  const deck = Array.from({ length: ctx.numPlayers }).flatMap((_, i) =>
    Array.from({ length: ctx.numPlayers }, () => i)
  );

  for (const playerID in players) {
    const hand = [];
    for (let i = 0; i < ctx.numPlayers - 1; i++) {
      hand.push(deck.splice(Math.floor(Math.random() * deck.length), 1)[0]);
    }
    players[playerID].hand = hand;
  }

  const vault: number[] = [];
  for (let i = 0; i < deck.length; i++) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    vault.push(deck[randomIndex]);
    deck.splice(randomIndex, 1);
  }

  return {
    stage: "decide",
    actionStage: undefined,
    secret: { vault, realOutlier },
    players,
    pub,
    targets: {},
  } as GameState;
}

const game = makeGame({
  setup({ ctx }) {
    return init({ ctx });
  },

  moves: {
    init({ G, ctx }) {
      Object.assign(G, init({ ctx }));
    },

    decideAction({ G, ctx, playerID }, action: GameAction) {
      if (G.stage !== "decide") return;

      G.players[playerID].action = action;

      if (!ctx.playOrder.every((id) => G.players[id].action !== undefined))
        return;

      ctx.playOrder.forEach((id) => {
        G.pub[id].action = G.players[id].action;
      });

      if (ctx.playOrder.some((id) => G.pub[id].action === "emergency")) {
        G.stage = "conclude";
      } else {
        G.stage = "action";
        const nextAction = ["vote", "monitor", "trade", "vault"].find(
          (action) => ctx.playOrder.some((id) => G.pub[id].action === action)
        ) as GameAction | undefined;

        if (nextAction) G.actionStage = nextAction;
        else G.stage = "decide";
      }
    },

    forcedTradePickPlayer({ G, playerID }, target: string) {
      G.targets[playerID] = target;
    },

    forcedTradePickCard({ G, playerID }, yourCard: number, theirCard: number) {
      G.players[playerID].hand.splice(
        G.players[playerID].hand.indexOf(yourCard),
        1,
        theirCard
      );
      G.players[G.targets[playerID]].hand.splice(
        G.players[G.targets[playerID]].hand.indexOf(theirCard),
        1,
        yourCard
      );
    },

    vote({ G, ctx, playerID }, target: string) {
      if (G.stage !== "action" || G.actionStage !== "vote") return;

      G.players[playerID].vote = target;

      if (!ctx.playOrder.every((id) => G.players[id].vote !== undefined)) {
        return;
      }
      ctx.playOrder.forEach((id) => {
        G.pub[id].vote = G.players[id].vote;
      });
    },

    voteConclude({ G, ctx }) {
      if (!Object.values(G.pub).every((player) => player.vote !== undefined))
        return;

      const voteCounts = Object.values(G.pub).reduce((acc, { vote }) => {
        acc[vote] = (acc[vote] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const maxVotes = Math.max(...Object.values(voteCounts));
      if (maxVotes === ctx.numPlayers) {
        G.stage = "conclude";
        return;
      }

      ctx.playOrder.forEach((playerID) => {
        G.players[playerID].vote = undefined;
        G.pub[playerID].vote = undefined;
        if (G.players[playerID].action === "vote") G.pub[playerID].done = true;
      });
      const nextAction = ["monitor", "trade", "vault"].find((action) =>
        ctx.playOrder.some((id) => G.pub[id].action === action)
      ) as GameAction | undefined;

      if (nextAction) G.actionStage = nextAction;
      else G.stage = "decide";
    },

    monitor({ G, ctx, playerID }, target: string) {
      if (
        G.stage !== "action" ||
        G.actionStage !== "monitor" ||
        G.players[playerID].action !== "monitor" ||
        playerID === target
      )
        return;

      G.targets[playerID] = target;

      const playerMonitering = ctx.playOrder.filter(
        (id) => G.players[id].action === "monitor"
      );
      if (playerMonitering.some((id) => G.targets[id] === undefined)) return;

      playerMonitering.forEach((id) => {
        G.players[id].handInSight = [...G.players[G.targets[id]].hand];
      });
    },

    monitorConclude({ G, ctx, playerID }) {
      G.players[playerID].handInSight = undefined;

      if (!ctx.playOrder.every((id) => G.players[id].handInSight === undefined))
        return;

      const nextAction = ["trade", "vault"].find((action) =>
        ctx.playOrder.some((id) => G.pub[id].action === action)
      ) as GameAction | undefined;

      if (nextAction) G.actionStage = nextAction;
      else G.stage = "decide";
    },

    tradePickPlayer({ G, playerID }, target: string) {
      if (
        G.stage !== "action" ||
        G.actionStage !== "trade" ||
        G.players[playerID].action !== "trade" ||
        playerID === target
      )
        return;

      G.targets[playerID] = target;
    },

    tradePickCard({ G, ctx, playerID }, card: number) {
      const picked = G.players[playerID].hand.splice(
        G.players[playerID].hand.indexOf(card),
        1
      )[0];
      G.players[G.targets[playerID]].vote = ctx.playOrder[picked];
    },

    tradePickResponse({ G, playerID }, card: number) {
      const picked = G.players[playerID].hand.splice(
        G.players[playerID].hand.indexOf(card),
        1
      )[0];
      G.players[G.targets[playerID]].hand.push(picked);
    },

    vault({ G, playerID }, card: number) {
      G.players[playerID].hand.splice(
        G.players[playerID].hand.indexOf(card),
        1
      );
      const randomIndex = Math.floor(Math.random() * G.secret.vault.length);
      G.players[playerID].hand.push(G.secret.vault[randomIndex]);
      G.secret.vault.splice(randomIndex, 1);
      G.pub[playerID].done = true;

      if (Object.values(G.pub).every((player) => player.done)) {
        G.stage = "decide";
      }
    },
  },
});

export default game;
