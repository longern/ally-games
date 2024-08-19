import { StoreEnhancer, ThunkDispatch, UnknownAction } from "@reduxjs/toolkit";
import {
  ReactNode,
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Provider } from "react-redux";

import {
  AppDispatch,
  Ctx,
  Game,
  GameClientMoves,
  GameMoveFunctions,
  createGameStore,
  sendChatMessage as sendChatMessageAction,
  setup,
} from "./app/game";
import { AppState } from "./app/store";

export type GameBoardProps<G> = G extends Game<infer S, infer M>
  ? {
      G: S;
      ctx: Ctx;
      moves: GameClientMoves<M>;
      playerID: string;
      chatMessages: {
        id: string;
        sender: string;
        payload: any;
      }[];
      sendChatMessage: (data: any) => void;
    }
  : never;

export type GameBoardComponent<G = Game> = (
  props: GameBoardProps<G>
) => ReactNode;

export function Client<
  S = any,
  M extends GameMoveFunctions<S> = GameMoveFunctions<S>
>({
  game,
  board,
  enhancer,
}: {
  game: Game<S, M>;
  board: GameBoardComponent<Game<S, M>>;
  enhancer?: StoreEnhancer;
}): ReactNode {
  const { actions, store } = useMemo(() => {
    return createGameStore({ game, enhancer });
  }, [game, enhancer]);

  const [state, setState] = useState(store.getState());

  const dispatch = useMemo(
    () => store.dispatch as AppDispatch<Game<S, M>>,
    [store]
  );

  useEffect(() => {
    const unsubscribe = store.subscribe(() => setState(store.getState()));
    const cleanup = (
      store.dispatch as ThunkDispatch<AppState, never, UnknownAction>
    )(setup({ numPlayers: 1, playOrder: ["0"], playerNames: { "0": "Me" } }));
    return () => {
      cleanup();
      unsubscribe();
    };
  }, [store]);

  const { state: G, ctx, playerID, chatMessages } = state;

  const moves = useMemo(
    () =>
      new Proxy({} as GameClientMoves<M>, {
        get:
          (_, prop: string) =>
          (...args: any[]) =>
            actions[prop] && dispatch(actions[prop]([{ playerID }, ...args])),
      }),
    [actions, playerID, dispatch]
  );

  const sendChatMessage = useCallback(
    (data: any) => dispatch(sendChatMessageAction([{ playerID }, data])),
    [playerID, dispatch]
  );

  return createElement(Provider, {
    store: store,
    children:
      G !== null &&
      ctx &&
      createElement(board, {
        G,
        ctx,
        moves,
        playerID,
        chatMessages,
        sendChatMessage,
      }),
  });
}
