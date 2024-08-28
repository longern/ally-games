import {
  applyMiddleware,
  createAsyncThunk,
  createListenerMiddleware,
} from "@reduxjs/toolkit";

import broadcastChannelPeer from "../../peer/broadcastChannel";
import { jsonRpcWrapper } from "../../peer/jsonrpc";
import { Connection, Peer } from "../../peer/types";
import { Game } from "../game";
import { setLobbyState, setPing, setPlayerID } from "../lobby";
import { AppDispatch, AppState } from "../store";
import { createGameMiddleware } from "./client";

const createLobbyAsyncThunk = createAsyncThunk.withTypes<{
  dispatch: AppDispatch;
  state: AppState;
}>();

let lobbyServer = null as {
  peer: ReturnType<Peer["listen"]>;
  rpcs: Record<
    string,
    ReturnType<typeof jsonRpcWrapper<ReturnType<typeof clientFunctions>>>
  >;
  close: () => void;
} | null;

let lobbyClient = null as {
  rpc: ReturnType<typeof jsonRpcWrapper<ReturnType<typeof serverFunctions>>>;
} | null;

export function createEnhancerFromLobby(
  lobbyState: AppState["lobby"],
  game: Game
) {
  const { state: lobby, playerID } = lobbyState;
  if (lobby.playOrder.length < 2) return undefined;
  const isHost = playerID === lobby.host;
  const enhancer = applyMiddleware(
    createGameMiddleware({
      game,
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
      isHost,
      connections: isHost
        ? Object.fromEntries(
            Object.entries(lobbyServer.rpcs).map(([playerID, rpc]) => [
              playerID,
              rpc.connection,
            ])
          )
        : { [lobby.host]: lobbyClient.rpc.connection },
    })
  );
  return enhancer;
}

function serverFunctions(
  { playerID }: { playerID: string },
  thunkAPI: { dispatch: AppDispatch; getState: () => AppState }
) {
  return {
    async join({ playerName }: { playerName: string }) {
      thunkAPI.dispatch(
        setLobbyState({
          state: {
            players: {
              ...thunkAPI.getState().lobby.state.players,
              [playerID]: {
                playerID,
                playerName: playerName ?? playerID,
                ready: false,
              },
            },
            playOrder: [...thunkAPI.getState().lobby.state.playOrder, playerID],
          },
        })
      );
      return playerID;
    },

    async sync() {
      return thunkAPI.getState().lobby.state;
    },

    async setReady(ready: boolean) {
      const state = thunkAPI.getState().lobby.state;
      const player = state.players[playerID];
      if (!player) return;
      thunkAPI.dispatch(
        setLobbyState({
          state: {
            players: {
              ...state.players,
              [playerID]: { ...player, ready },
            },
          },
        })
      );
    },
  };
}

function clientFunctions(thunkAPI: { dispatch: AppDispatch }) {
  return {
    async ping({ timestamp }: { timestamp: number }) {
      return { timestamp };
    },
    async setLobbyState({ state }: { state: AppState["lobby"]["state"] }) {
      thunkAPI.dispatch(setLobbyState({ state }));
    },
    async close() {
      thunkAPI.dispatch(setLobbyState({ state: null }));
    },
  };
}

async function serverConnectionsLoop(
  connections: AsyncIterable<Connection>,
  thunkAPI: { dispatch: AppDispatch; getState: () => AppState }
) {
  const handleConnection = (connection: Connection) => {
    const clientID = Math.random().toString(36).substring(7);
    lobbyServer.rpcs[clientID] = jsonRpcWrapper(connection, {
      remotePrefix: "lobby.client.",
      localPrefix: "lobby.server.",
      localFunctions: serverFunctions({ playerID: clientID }, thunkAPI),
    });
    connection.addEventListener("close", () => {
      delete lobbyClient.rpc[clientID];
    });
  };

  for await (const connection of connections) handleConnection(connection);
}

export const createLobby = createLobbyAsyncThunk(
  "lobby/create",
  async ({ hostName, Peer }: { hostName: string; Peer?: Peer }, thunkAPI) => {
    Peer = Peer || broadcastChannelPeer;
    const peer = Peer.listen();
    const roomID = await peer.id;

    lobbyServer = {
      peer,
      rpcs: {},
      close: () => {
        peer.close();
        Object.values(lobbyServer.rpcs).forEach((rpc) => rpc.close());
        clearInterval(interval);
      },
    };

    serverConnectionsLoop(peer.connections, thunkAPI);

    const interval = setInterval(() => {
      for (const [playerID, rpc] of Object.entries(lobbyServer.rpcs)) {
        rpc.methods
          .ping({ timestamp: performance.now() })
          .then(({ timestamp }) => {
            const ping = Math.round((performance.now() - timestamp) / 2);
            thunkAPI.dispatch(setPing({ playerID, ping }));
          });
      }
      thunkAPI.dispatch(setLobbyState({ state: {} }));
    }, 3000);

    const host = Math.random().toString(36).substring(7);
    thunkAPI.dispatch(
      setLobbyState({
        state: {
          roomID,
          host,
          players: {
            [host]: {
              playerID: host,
              playerName: hostName ?? host,
              ready: true,
            },
          },
          playOrder: [host],
        },
      })
    );
    thunkAPI.dispatch(setPlayerID(host));
  }
);

export const joinLobby = createLobbyAsyncThunk(
  "lobby/joinLobby",
  async ({ roomID, Peer }: { roomID: string; Peer?: Peer }, thunkAPI) => {
    Peer = Peer || broadcastChannelPeer;
    const connection = await Peer.connect(roomID);
    lobbyClient = {
      rpc: jsonRpcWrapper(connection, {
        remotePrefix: "lobby.server.",
        localPrefix: "lobby.client.",
        localFunctions: clientFunctions(thunkAPI),
      }),
    };
    connection.addEventListener("close", () => {
      lobbyClient = null;
      thunkAPI.dispatch(setLobbyState({ state: null }));
    });
    const playerID = await lobbyClient.rpc.methods.join({
      playerName: thunkAPI.getState().settings.nickname,
    });
    thunkAPI.dispatch(setPlayerID(playerID));
    const lobbyState = await lobbyClient.rpc.methods.sync();
    thunkAPI.dispatch(setLobbyState({ state: lobbyState }));
  }
);

export const setReady = createLobbyAsyncThunk(
  "lobby/ready",
  async (ready: boolean) => {
    return lobbyClient.rpc.methods.setReady(ready);
  }
);

export const leaveLobby = createLobbyAsyncThunk(
  "lobby/leave",
  async (_, thunkAPI) => {
    if (lobbyServer) {
      Object.values(lobbyServer.rpcs).forEach((rpc) => rpc.methods.close());
      lobbyServer.close();
      lobbyServer = null;
    }
    if (lobbyClient) {
      lobbyClient.rpc.close();
      lobbyClient = null;
    }
    thunkAPI.dispatch(setLobbyState({ state: null }));
  }
);

const listenerMiddleware = createListenerMiddleware();

const startLobbyListening =
  listenerMiddleware.startListening.withTypes<AppState>();

startLobbyListening({
  actionCreator: setLobbyState,
  effect(_, listenerApi) {
    if (!lobbyServer) return;
    for (const rpc of Object.values(lobbyServer.rpcs)) {
      const state = listenerApi.getState().lobby.state;
      rpc.methods.setLobbyState({ state });
    }
  },
});

const lobbyMiddleware = listenerMiddleware.middleware;

export default lobbyMiddleware;
