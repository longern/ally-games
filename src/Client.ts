import {
  ReactNode,
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { produce } from "immer";

export type Ctx = {
  numPlayers: number;
  playOrder: string[];
  playerNames: Record<string, string>;
  isHost: boolean;
};

type GameMoveFunction<GameState> = (
  client: {
    G: GameState;
    ctx: Ctx;
    playerID: string;
    sendChatMessage: (data: any) => void;
  },
  ...args: any[]
) => void;

export type Game<
  GameState,
  GameMoves extends {
    [K in keyof GameMoves]: GameMoveFunction<GameState>;
  }
> = {
  setup: ({ ctx }: { ctx: Ctx }) => GameState;
  moves: GameMoves;
  phases?: Record<
    string,
    {
      moves?: GameMoves;
      onBegin?: GameMoveFunction<GameState>;
      onEnd?: GameMoveFunction<GameState>;
    }
  >;
  playerView?: (props: {
    G: GameState;
    ctx: Ctx;
    playerID: string;
  }) => GameState;
  minPlayers?: number;
  maxPlayers?: number;
};

export type GameClientMoves<Moves> = {
  [K in keyof Moves]: (
    ...args: Moves[K] extends (client: any, ...args: infer I) => void
      ? I
      : never
  ) => void;
};

export type GameBoardComponent<T> = T extends Game<infer G, infer M>
  ? (props: {
      G: G;
      ctx: Ctx;
      moves: GameClientMoves<M>;
      playerID: string;
      chatMessages: {
        id: string;
        sender: string;
        payload: any;
      }[];
      sendChatMessage: (data: any) => void;
    }) => ReactNode
  : never;

export function makeGame<
  GameState,
  GameMoves extends Record<string, GameMoveFunction<GameState>>
>(game: Game<GameState, GameMoves>) {
  return game;
}

interface Socket {
  addEventListener: (
    type: "message",
    callback: (event: MessageEvent<string>) => void
  ) => void;
  removeEventListener: (
    type: "message",
    callback: (event: MessageEvent<string>) => void
  ) => void;
  send: (data: any) => void;
  close: () => void;
}

function randomID() {
  return Array.from(crypto.getRandomValues(new Uint32Array(4)))
    .map((n) => n.toString(36))
    .join("");
}

export function STRIP_SECRET<GameState>({
  G,
  playerID,
}: {
  G: GameState;
  playerID: string;
}) {
  if (typeof G !== "object") return G;
  const stripped = { ...G };
  if ("secret" in stripped) delete stripped.secret;
  if ("players" in stripped) {
    stripped.players = { [playerID]: stripped.players[playerID] };
  }
  return stripped;
}

export function Client<T extends Game<any, any>>({
  game,
  board,
  socket,
}: {
  game: T;
  board: GameBoardComponent<T>;
  socket: Socket;
}): ReactNode {
  type GameState = ReturnType<T["setup"]>;
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [playerID, setPlayerID] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<
    {
      id: string;
      sender: string;
      payload: any;
    }[]
  >([]);

  const sendChatMessage = useCallback(
    (message: any) => {
      if (ctx!.isHost)
        setChatMessages((messages) => [
          ...messages,
          {
            id: randomID(),
            sender: playerID,
            payload: message,
          },
        ]);
      else socket.send(JSON.stringify({ type: "chat", message }));
    },
    [ctx, playerID, socket]
  );

  useEffect(() => {
    if (!ctx?.isHost || gameState.phase === undefined) return;
    setGameState(
      produce<GameState>((G) => {
        game.phases?.[gameState.phase]?.onBegin?.({
          G,
          ctx,
          playerID,
          sendChatMessage,
        });
      })
    );
    return () => {
      setGameState(
        produce<GameState>((G) => {
          game.phases?.[gameState.phase]?.onEnd?.({
            G,
            ctx,
            playerID,
            sendChatMessage,
          });
        })
      );
    };
  }, [ctx, game, gameState?.phase, playerID, sendChatMessage]);

  useEffect(() => {
    socket.send(JSON.stringify({ type: "setup" }));
  }, [socket]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<string>) => {
      const message = JSON.parse(event.data);
      if (message.type === "setup") {
        const { playerID, ctx } = message;
        if (playerID === undefined || ctx === undefined) return;
        setCtx(ctx);
        setPlayerID(playerID);
        if (ctx.isHost) {
          const gameState = game.setup({ ctx });
          setGameState(gameState);
          if (gameState.phase) {
            game.phases?.[gameState.phase]?.onBegin?.({
              G: gameState,
              ctx,
              playerID,
              sendChatMessage,
            });
          }
        }
      } else if (message.type === "sync") {
        setGameState(message.state);
        setChatMessages((chatMessages) => {
          const ids = new Set(chatMessages.map((m) => m.id));
          const newMessages = message.chatMessages.filter(
            (m: { id: string }) => !ids.has(m.id)
          );
          return [...chatMessages, ...newMessages];
        });
      } else if (message.type === "action") {
        const { playerID } = message;
        const [func, ...args] = message.args;
        setGameState(
          produce<GameState>((G) => {
            const moves =
              game.phases?.[G.phase]?.moves?.[func] ?? game.moves[func];
            moves({ G, ctx, playerID, sendChatMessage }, ...args);
          })
        );
      } else if (message.type === "chat") {
        const { playerID } = message;
        setChatMessages((messages) => [
          ...messages,
          {
            id: randomID(),
            sender: playerID,
            payload: message.message,
          },
        ]);
      }
    };
    socket.addEventListener("message", handleMessage);
    return () => {
      socket.removeEventListener("message", handleMessage);
    };
  }, [ctx, game, sendChatMessage, socket]);

  const moves = useMemo(
    () =>
      new Proxy(
        {},
        {
          get: (_, prop: string) => {
            return (...args: any[]) => {
              if (ctx.isHost)
                setGameState(
                  produce<GameState>((G) => {
                    const moves =
                      game.phases?.[G.phase]?.moves?.[prop] ?? game.moves[prop];
                    moves({ G, ctx, playerID, sendChatMessage }, ...args);
                  })
                );
              else
                socket.send(
                  JSON.stringify({
                    type: "action",
                    args: [prop, ...args],
                  })
                );
            };
          },
        }
      ) as GameClientMoves<typeof game>,
    [game, ctx, playerID, sendChatMessage, socket]
  );

  useEffect(() => {
    if (!ctx?.isHost || !gameState) return;
    ctx.playOrder.forEach((player) => {
      if (player === playerID) return;
      socket.send(
        JSON.stringify({
          type: "sync",
          playerID: player,
          state: game.playerView
            ? game.playerView({ G: gameState, ctx, playerID: player })
            : gameState,
          chatMessages,
        })
      );
    });
  }, [chatMessages, ctx, game, gameState, playerID, socket]);

  return (
    gameState &&
    ctx &&
    createElement(board, {
      G: gameState,
      ctx,
      moves,
      playerID,
      chatMessages,
      sendChatMessage,
    })
  );
}
