import { Middleware } from "@reduxjs/toolkit";

import {
  AppActions,
  AppDispatch,
  AppState,
  Ctx,
  setCtx,
  setPlayerID,
  setup,
} from "../app/game";
import { Connection } from "../peer/types";

export function createClientMiddleware({
  ctx,
  playerID,
  isHost,
  connections,
}: {
  ctx: Ctx;
  playerID: string;
  isHost: boolean;
  connections: Record<string, Connection>;
}) {
  const middleware: Middleware<{}, AppState, AppDispatch> = (store) => {
    Promise.resolve().then(() => {
      store.dispatch(setPlayerID(playerID));
      store.dispatch(setCtx(ctx));
      if (isHost) store.dispatch(setup(ctx));
    });

    const cleanup = (
      (handlers) => () =>
        handlers.forEach((handler) => handler())
    )(
      Object.entries(connections).map(([playerID, connection]) => {
        const handler = (event: MessageEvent) => {
          const action = JSON.parse(event.data);
          if (action.type === "client/setGameState")
            return store.dispatch(action);
          if (
            Array.isArray(action.payload) &&
            action.payload[0]?.playerID === playerID
          )
            store.dispatch(action);
        };
        connection.addEventListener("message", handler);
        return () => connection.removeEventListener("message", handler);
      })
    );

    return (next) => (action: AppActions) => {
      if (action.type === "client/reset") {
        cleanup();
        return next(action);
      }

      if (isHost) {
        const result = next(action);
        Object.values(connections).forEach((connection) => {
          connection.send(
            JSON.stringify({
              type: "client/setGameState",
              payload: store.getState().state,
            })
          );
        });
        return result;
      } else {
        if (
          action.type.startsWith("client/") &&
          action.type !== "client/sendChatMessage" &&
          action.type !== "client/setup"
        )
          return next(action);
        Object.values(connections)[0].send(JSON.stringify(action));
        return;
      }
    };
  };

  return middleware;
}
