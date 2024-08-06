import {
  createAsyncThunk,
  createSlice,
  PayloadAction,
  StoreEnhancer,
} from "@reduxjs/toolkit";

import { createPeer as defaultCreatePeer } from "../peer/broadcastChannel";
import { Connection, Peer } from "../peer/types";
import { AppDispatch, AppState } from "./store";
import { createEnhancer } from "../middlewares/broadcastChannel";

const connections: Record<string, Connection> = {};
let _enhancer: StoreEnhancer = null;

const createLobbyThunk = createAsyncThunk.withTypes<{
  state: AppState;
  dispatch: AppDispatch;
}>();

function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  return keys.reduce((acc, key) => {
    acc[key] = obj[key];
    return acc;
  }, {} as Pick<T, K>);
}

function serverApi({
  state,
  dispatch,
  playerID,
}: {
  state: AppState;
  dispatch: AppDispatch;
  playerID: string;
}) {
  return {
    join() {
      return {
        ...pick(state.lobby, ["roomID", "game", "players", "host"]),
        playerID: playerID,
      };
    },
    ready(value: boolean) {
      dispatch(lobbySlice.actions.setReady({ playerID, ready: value }));
    },
  };
}

export const createLobby = createLobbyThunk(
  "lobby/create",
  async ({ createPeer }: { createPeer?: () => Peer }, thunkAPI) => {
    createPeer = createPeer || defaultCreatePeer;
    const peer = createPeer();
    const roomID = peer.open({
      onConnection: (connection) => {
        const clientID = Math.random().toString(36).substring(7);
        connections[clientID] = connection;
        const api = serverApi({
          state: thunkAPI.getState(),
          dispatch: thunkAPI.dispatch,
          playerID: clientID,
        });
        connection.addEventListener("message", (event) => {
          const message = JSON.parse(event.data);
          connection.send(
            JSON.stringify({
              result: api[message.method](...message.params),
              id: message.id,
            })
          );
        });
        connection.addEventListener("close", () => {
          delete connections[clientID];
        });
      },
    });
    thunkAPI.dispatch(lobbySlice.actions.setRoomID(roomID));
    const host = Math.random().toString(36).substring(7);
    thunkAPI.dispatch(lobbySlice.actions.setHost(host));
    thunkAPI.dispatch(lobbySlice.actions.setPlayerID(host));
  }
);

export const joinLobby = createLobbyThunk(
  "lobby/join",
  async (
    { roomID, createPeer }: { roomID: string; createPeer?: () => Peer },
    thunkAPI
  ) => {
    createPeer = createPeer || defaultCreatePeer;
    const peer = createPeer();
    const connection = await peer.connect(roomID);
    connection.addEventListener("close", () => {
      delete connections[roomID];
      thunkAPI.dispatch(lobbySlice.actions.setRoomID(""));
    });
    connection.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.method === "setPlayerID") {
        thunkAPI.dispatch(lobbySlice.actions.setPlayerID(message.params));
      } else if (message.method === "startGame") {
        thunkAPI.dispatch(startGame());
      }
    });
    connection.send(JSON.stringify({ method: "join" }));
    connections[roomID] = connection;
    thunkAPI.dispatch(lobbySlice.actions.setRoomID(roomID));
  }
);

export const chooseGame = createLobbyThunk(
  "lobby/chooseGame",
  async (game: string, thunkAPI) => {
    thunkAPI.dispatch(lobbySlice.actions.setGame(game));
  }
);

export const getReady = createLobbyThunk("lobby/ready", async (_, thunkAPI) => {
  const state = thunkAPI.getState();
});

export const startGame = createLobbyThunk(
  "lobby/start",
  async (_, thunkAPI) => {
    const state = thunkAPI.getState();
    if (state.lobby.playerID === state.lobby.host) {
      Object.values(connections).forEach((connection) => {
        connection.send(
          JSON.stringify({ method: "startGame", params: state.lobby.game })
        );
      });
    }
    _enhancer = createEnhancer({
      isHost: state.lobby.playerID === state.lobby.host,
      connections: Object.values(connections),
    });
  }
);

export const getEnhancer = () => _enhancer;

const lobbySlice = createSlice({
  name: "lobby",
  initialState: {
    roomID: "",
    game: "",
    players: [] as {
      playerID: string;
      playerName: string;
      ready: boolean;
    }[],
    matchRunning: false,
    host: "",
    playerID: "",
  },
  reducers: {
    setGame(state, action: PayloadAction<string>) {
      state.game = action.payload;
    },
    setRoomID(state, action: PayloadAction<string>) {
      state.roomID = action.payload;
    },
    setHost(state, action: PayloadAction<string>) {
      state.host = action.payload;
    },
    setPlayerID(state, action: PayloadAction<string>) {
      state.playerID = action.payload;
    },
    setReady(
      state,
      action: PayloadAction<{ playerID: string; ready: boolean }>
    ) {
      const player = state.players.find(
        (player) => player.playerID === action.payload.playerID
      );
      if (player) player.ready = action.payload.ready;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(startGame.fulfilled, (state) => {
      state.matchRunning = true;
    });
  },
});

export default lobbySlice;
