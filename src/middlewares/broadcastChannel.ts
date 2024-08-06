import { applyMiddleware, Middleware } from "@reduxjs/toolkit";
import {
  AppActions,
  AppDispatch,
  AppState,
  setPlayerID,
  setup,
} from "../app/game";
import { Connection } from "../peer/types";

export function createEnhancer({
  isHost,
  connections,
}: {
  isHost: boolean;
  connections: Connection[];
}) {
  const middleware: Middleware<{}, AppState, AppDispatch> = (store) => {
    setTimeout(() => {
      store.dispatch(
        setup({
          numPlayers: connections.length + 1,
          playOrder: ["0"],
          playerNames: {},
        })
      );
      store.dispatch(setPlayerID("0"));
    }, 4);

    return (next) => (action: AppActions) => {
      if (isHost) return next(action);
      return next(action);
    };
  };

  return applyMiddleware(middleware);
}
