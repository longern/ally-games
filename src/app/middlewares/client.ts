import {
  AppActions,
  AppDispatch,
  AppMiddleware,
  AppState,
  Ctx,
  gameSetup,
  sendChatMessage,
  setCtx,
  setGameState,
  setPlayerID,
  setup,
} from "../../app/game";
import { Connection } from "../../peer/types";
import { jsonRpcWrapper } from "../../peer/jsonrpc";

function serverFunctions({
  dispatch,
  getState,
}: {
  dispatch: AppDispatch;
  getState: () => AppState;
  playerID: string;
}) {
  return {
    async sync() {
      return getState().game;
    },
    async dispatch(action: AppActions) {
      dispatch(action);
    },
  };
}

function clientFunctions({
  dispatch,
}: {
  dispatch: AppDispatch;
  playerID: string;
}) {
  return {
    async dispatch(action: AppActions) {
      dispatch(action);
    },
  };
}

function createServerMiddleware({
  ctx,
  playerID,
  connections,
}: {
  ctx: Ctx;
  playerID: string;
  connections: Record<string, Connection>;
}) {
  const middleware: AppMiddleware = (store) => {
    const wrappers: Record<
      string,
      ReturnType<typeof jsonRpcWrapper<ReturnType<typeof clientFunctions>>>
    > = {};

    return (next) => (action) => {
      if (action.type === setup.type) {
        store.dispatch(setPlayerID(playerID));
        store.dispatch(gameSetup(ctx));

        for (const [playerID, connection] of Object.entries(connections)) {
          wrappers[playerID] = jsonRpcWrapper<
            ReturnType<typeof clientFunctions>
          >(connection, {
            remotePrefix: "game.client.",
            localPrefix: "game.server.",
            localFunctions: serverFunctions({
              dispatch: store.dispatch,
              getState: store.getState,
              playerID,
            }),
            timeout: 5000,
          });
        }

        return () => {
          Object.values(wrappers).forEach((wrapper) => wrapper.close());
        };
      }

      const result = next(action);
      const remoteAction = setGameState(store.getState().game);
      Object.values(wrappers).forEach((wrapper) => {
        wrapper.notify.dispatch(remoteAction);
      });
      return result;
    };
  };

  return middleware;
}

function createClientMiddleware({
  ctx,
  playerID,
  connection,
}: {
  ctx: Ctx;
  playerID: string;
  connection: Connection;
}) {
  const middleware: AppMiddleware = (store) => {
    let wrapper: ReturnType<
      typeof jsonRpcWrapper<ReturnType<typeof serverFunctions>>
    >;

    return (next) => (action) => {
      if (action.type === setup.type) {
        store.dispatch(setPlayerID(playerID));
        store.dispatch(setCtx(ctx));

        wrapper = jsonRpcWrapper(connection, {
          remotePrefix: "game.server.",
          localPrefix: "game.client.",
          localFunctions: clientFunctions({
            dispatch: store.dispatch,
            playerID,
          }),
          timeout: 5000,
        });

        wrapper.methods
          .sync()
          .then((gameState: any) => {
            store.dispatch(setGameState(gameState));
          })
          .catch(() => {});

        return () => wrapper.close();
      }

      if (
        action.type.startsWith("game/") ||
        action.type === sendChatMessage.type
      ) {
        wrapper.notify.dispatch(action);
        return;
      }

      return next(action);
    };
  };

  return middleware;
}

export function createGameMiddleware({
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
  const middleware = isHost
    ? createServerMiddleware({ ctx, playerID, connections })
    : createClientMiddleware({
        ctx,
        playerID,
        connection: Object.values(connections)[0],
      });

  return middleware;
}
