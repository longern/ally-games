import { Ctx, makeGame } from "../Client";

export type GameAction = "emergency" | "vote" | "monitor" | "trade" | "vault";

export type GameState = {
  stage: "decide" | "action" | "conclude";
  actionStage: GameAction | "trade-response" | undefined;
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
  extra: number | undefined;
};

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
    -2,
    ...Array.from({ length: ctx.numPlayers }).flatMap((_, i) =>
      new Array(ctx.numPlayers).fill(i)
    ),
    ...new Array(ctx.numPlayers - 1).fill(-1),
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
    stage: "decide",
    actionStage: undefined,
    secret: { vault, realOutliar },
    players,
    pub,
    targets: {},
  } as GameState;
}

function nextAction({ G }: { G: GameState }) {
  const actions: GameAction[] = ["vote", "monitor", "trade", "vault"];
  const currentIndex = actions.findIndex((action) =>
    G.actionStage?.startsWith(action)
  );
  const nextAction = actions
    .slice(currentIndex + 1)
    .find((action) =>
      Object.values(G.players).some((player) => player.action === action)
    );

  G.targets = {};
  if (nextAction) {
    G.actionStage = nextAction;
    G.targets = {};
  } else {
    G.stage = "decide";
    Object.keys(G.players).forEach((id) => {
      G.players[id].action = undefined;
      G.actionStage = undefined;
      G.pub[id].action = undefined;
      G.pub[id].done = false;
    });
  }
}

function conclude({ G, ctx }: { G: GameState; ctx: Ctx }) {
  G.stage = "conclude";
  G.actionStage = undefined;
  G.players[G.secret.realOutliar].outliarInSight = G.secret.realOutliar;
  const numPlayers = Object.keys(G.players).length;

  if (Object.values(G.pub).some((player) => player.action === "emergency")) {
    const falseEmergency = Object.entries(G.players).filter(
      ([id, player]) =>
        player.action === "emergency" && id !== G.secret.realOutliar
    );
    const punish = Math.ceil((numPlayers - 1) / falseEmergency.length);
    const extra =
      (G.extra || 0) + (punish * falseEmergency.length - (numPlayers - 1));
    Object.keys(G.players).forEach((id) => {
      if (G.secret.realOutliar === id) {
        G.pub[id].roundScore = numPlayers - 1;
      } else {
        if (!falseEmergency.length) G.pub[id].roundScore = -1;
        else if (G.players[id].action !== "emergency") G.pub[id].roundScore = 0;
        else {
          G.pub[id].roundScore = -punish;
        }
      }
    });
    G.extra = extra;
  } else {
    const voteCounts = Object.values(G.pub).reduce((acc, { vote }) => {
      if (vote === -2)
        for (let i = 0; i < numPlayers; i++) acc.set(i, (acc.get(i) || 0) + 1);
      else if (vote !== -1) acc.set(vote, (acc.get(vote) || 0) + 1);
      return acc;
    }, new Map<number, number>());
    const maxVotes = Math.max(...voteCounts.values());
    const [maxVoteCard] = Array.from(voteCounts.entries()).find(
      ([, count]) => count === maxVotes
    );
    if (ctx.playOrder[maxVoteCard] === G.secret.realOutliar) {
      Object.keys(G.players).forEach((id) => {
        if (G.secret.realOutliar === id) {
          G.pub[id].roundScore = -(numPlayers - 1);
        } else {
          G.pub[id].roundScore = 1;
        }
      });
    } else {
      Object.keys(G.players).forEach((id) => {
        if (G.secret.realOutliar === id) {
          G.pub[id].roundScore = numPlayers - 1;
        } else {
          G.pub[id].roundScore = -1;
        }
      });
    }
  }
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
      if (G.stage !== "decide" || G.players[playerID].action !== undefined)
        return;

      G.players[playerID].action = action;

      if (!ctx.playOrder.every((id) => G.players[id].action !== undefined))
        return;

      // Publicize actions
      ctx.playOrder.forEach((id) => {
        G.pub[id].action = G.players[id].action;
      });

      if (ctx.playOrder.some((id) => G.pub[id].action === "emergency")) {
        conclude({ G, ctx });
      } else {
        G.stage = "action";
        nextAction({ G });
      }
    },

    forcedTradePickPlayer({ G, playerID }, target: string) {
      if (
        G.stage !== "action" ||
        G.actionStage !== "vote" ||
        // This is the only player that choose to vote
        !Object.entries(G.players).every(
          ([id, player]) =>
            (id === playerID && player.action === "vote") ||
            player.action !== "vote"
        )
      )
        return;

      G.targets[playerID] = target;
      G.players[playerID].handInSight = G.players[target].hand;
    },

    forcedTradePickOtherCard({ G, playerID }, theirCard: number) {
      if (
        G.stage !== "action" ||
        G.actionStage !== "vote" ||
        // This is the only player that choose to vote
        !Object.entries(G.players).every(
          ([id, player]) =>
            (id === playerID && player.action === "vote") ||
            player.action !== "vote"
        ) ||
        G.targets[playerID] === undefined
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

    forcedTradePickCard({ G, playerID, ctx }, yourCard: number) {
      if (
        G.stage !== "action" ||
        G.actionStage !== "vote" ||
        // This is the only player that choose to vote
        !Object.entries(G.players).every(
          ([id, player]) =>
            (id === playerID && player.action === "vote") ||
            player.action !== "vote"
        ) ||
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
      const theirCard = me.faceDown[0];
      const giveaway = me.hand.splice(me.hand.indexOf(yourCard), 1)[0];
      target.hand.splice(
        target.hand.findLastIndex((card) => card <= theirCard) + 1,
        0,
        giveaway
      );
      me.hand.splice(
        me.hand.findLastIndex((card) => card <= theirCard) + 1,
        0,
        theirCard
      );
      me.faceDown = [];
      G.pub[playerID].faceDownCount = 0;

      nextAction({ G });
    },

    vote({ G, ctx, playerID }, cardIndex: number) {
      if (
        G.stage !== "action" ||
        G.actionStage !== "vote" ||
        Object.values(G.players).filter((player) => player.action === "vote")
          .length < 2
      )
        return;

      const card = G.players[playerID].hand[cardIndex];
      G.players[playerID].vote = card;

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
        if (vote === -2)
          for (let i = 0; i < ctx.numPlayers; i++)
            acc.set(i, (acc.get(i) || 0) + 1);
        else if (vote !== -1) acc.set(vote, (acc.get(vote) || 0) + 1);
        return acc;
      }, new Map<number, number>());

      const maxVotes = Math.max(...voteCounts.values());
      if (
        maxVotes >= ctx.numPlayers - 1 &&
        Array.from(voteCounts.values()).filter((count) => count === maxVotes)
          .length === 1
      ) {
        conclude({ G, ctx });
        return;
      }

      ctx.playOrder.forEach((playerID) => {
        G.players[playerID].vote = undefined;
        G.pub[playerID].vote = undefined;
        if (G.players[playerID].action === "vote") G.pub[playerID].done = true;
      });

      nextAction({ G });
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
      if (
        G.stage !== "action" ||
        G.actionStage !== "monitor" ||
        G.players[playerID].action !== "monitor" ||
        G.players[playerID].handInSight === undefined
      )
        return;

      G.players[playerID].handInSight = undefined;

      if (!ctx.playOrder.every((id) => G.players[id].handInSight === undefined))
        return;

      nextAction({ G });
    },

    tradePickPlayer({ G, playerID }, target: string) {
      if (
        G.stage !== "action" ||
        G.actionStage !== "trade" ||
        G.players[playerID].action !== "trade" ||
        playerID === target ||
        G.targets[playerID] !== undefined
      )
        return;

      G.targets[playerID] = target;
    },

    tradePickCard({ G, ctx, playerID }, card: number) {
      const me = G.players[playerID];
      if (
        G.stage !== "action" ||
        G.actionStage !== "trade" ||
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

      if (
        Object.entries(G.players)
          .filter(([, player]) => player.action === "trade")
          .every(
            ([id, player]) =>
              player.faceDown.length > 0 && G.targets[id] !== undefined
          )
      )
        G.actionStage = "trade-response";
    },

    tradePickResponse({ G, ctx, playerID }, cardIndexes: number[]) {
      if (G.stage !== "action" || G.actionStage !== "trade-response") return;

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
        const randomIndex = Math.floor(Math.random() * (responses.length + 1));
        responses.splice(randomIndex, 0, response);
      }
      sourcePlayers.forEach(([id, player], index) => {
        const insertIndex =
          player.hand.findLastIndex((card) => card <= responses[index]) + 1;
        player.hand.splice(insertIndex, 0, responses[index]);
        me.hand.splice(
          me.hand.findLastIndex((card) => card <= player.faceDown[0]) + 1,
          0,
          player.faceDown[0]
        );
        player.faceDown = [];
        G.pub[id].faceDownCount = 0;
        G.targets[id] = undefined;
      });

      if (Object.values(G.pub).every((player) => player.faceDownCount === 0)) {
        nextAction({ G });
      }
    },

    vault({ G, ctx, playerID }, card: number) {
      if (
        G.stage !== "action" ||
        G.actionStage !== "vault" ||
        G.players[playerID].action !== "vault" ||
        G.pub[playerID].done
      )
        return;

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
      me.hand.splice(
        me.hand.findLastIndex((card) => card <= receive) + 1,
        0,
        receive
      );
      G.secret.vault.splice(randomIndex, 1, giveaway);
      G.pub[playerID].done = true;

      if (
        ctx.playOrder
          .filter((id) => G.players[id].action === "vault")
          .every((id) => G.pub[id].done)
      ) {
        G.stage = "decide";
        ctx.playOrder.forEach((id) => {
          G.players[id].action = undefined;
          G.actionStage = undefined;
          G.pub[id].action = undefined;
          G.pub[id].done = false;
        });
      }
    },

    nextRound({ G, ctx }) {
      if (G.stage !== "conclude") return;

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

  minPlayers: 4,
  maxPlayers: 8,
});

export default game;
