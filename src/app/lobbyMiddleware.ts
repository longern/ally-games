import { applyMiddleware, Middleware } from "@reduxjs/toolkit";

import { createClientMiddleware } from "../middlewares/socketMiddleware";
import { Connection } from "../peer/types";
import { AppState } from "./store";

export const connections: Record<string, Connection> = {};

export function createEnhancerFromLobby(lobbyState: AppState["lobby"]) {
  const { state: lobby, playerID } = lobbyState;
  const enhancer = applyMiddleware(
    createClientMiddleware({
      ctx: {
        numPlayers: lobby.playOrder.length,
        playOrder: lobby.playOrder,
        playerNames: Object.fromEntries(
          lobby.playOrder.map((playerID) => [
            playerID,
            lobby.players[playerID].playerName,
          ])
        ),
      },
      playerID,
      isHost: playerID === lobby.host,
      connections: connections,
    })
  );
  return enhancer;
}

const lobbyMiddleware: Middleware<{}, AppState> = (store) => {
  return (next) => (action) => {
    if (typeof action !== "object") return next(action);
    const actionType = action["type"];
    if (typeof actionType !== "string" || !actionType.startsWith("lobby/"))
      return next(action);

    const { state: lobby, playerID } = store.getState().lobby;

    if (playerID !== null && playerID !== lobby.host) {
      if (["lobby/setLobbyState", "lobby/setPlayerID"].includes(actionType)) {
        return next(action);
      }
      connections[lobby.host].send(JSON.stringify(action));
      return;
    }

    switch (actionType) {
      case "lobby/setLobbyState":
      case "lobby/startGame": {
        const result = next(action);
        Object.values(connections).forEach((connection) => {
          connection.send(
            JSON.stringify({
              type: actionType,
              payload: { state: store.getState().lobby.state },
            })
          );
        });
        return result;
      }
    }

    const result = next(action);
    return result;
  };
};

export default lobbyMiddleware;
