import { applyMiddleware, Middleware, StoreEnhancer } from "@reduxjs/toolkit";

import { AppState } from "./store";
import { Connection } from "../peer/types";
import { createClientMiddleware } from "../middlewares/socketEnhancer";

export const connections: Record<string, Connection> = {};

let _enhancer: StoreEnhancer = null;

export const getEnhancer = () => _enhancer;

export function createEnhancerFromState(state: AppState) {
  const { state: lobby, playerID } = state.lobby;
  _enhancer = applyMiddleware(
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
        const result = next(action);
        const state = store.getState();
        if (state.lobby.state.matchRunning && !lobby.matchRunning) {
          createEnhancerFromState(state);
        }
        return result;
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
