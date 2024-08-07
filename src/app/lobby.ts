import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { createPeer as defaultCreatePeer } from "../peer/broadcastChannel";
import { Peer } from "../peer/types";
import { AppDispatch, AppState } from "./store";
import { connections, createEnhancerFromState } from "./lobbyMiddleware";

type LobbyThunk<ThunkArg = unknown> = (
  arg: ThunkArg,
  thunkAPI: { dispatch: AppDispatch; getState: () => AppState }
) => any;

export const lobbyThunks: Record<string, LobbyThunk> = {};

const createLobbyThunk = function <ThunkArg>(
  type: string,
  thunk: LobbyThunk<any>
) {
  lobbyThunks[type] = thunk;
  return (arg?: ThunkArg) =>
    Object.assign(
      (dispatch: AppDispatch, getState: () => AppState) =>
        thunk(arg, { dispatch, getState }),
      { type, payload: arg }
    );
};

export const createLobby = createLobbyThunk(
  "lobby/create",
  async ({ createPeer }: { createPeer?: () => Peer }, thunkAPI) => {
    createPeer = createPeer || defaultCreatePeer;
    const peer = createPeer();
    const roomID = peer.open({
      onConnection: (connection) => {
        const clientID = Math.random().toString(36).substring(7);
        connections[clientID] = connection;
        connection.addEventListener("message", (event) => {
          const message = JSON.parse(event.data);
          const type = message.type;
          if (type === "lobby/joinMatch") {
            thunkAPI.dispatch(
              setLobbyState({
                state: {
                  players: {
                    ...thunkAPI.getState().lobby.state.players,
                    [clientID]: {
                      playerID: clientID,
                      playerName: message.playerName ?? clientID,
                      ready: false,
                    },
                  },
                  playOrder: [
                    ...thunkAPI.getState().lobby.state.playOrder,
                    clientID,
                  ],
                },
              })
            );
            connection.send(
              JSON.stringify({ type: "lobby/setPlayerID", payload: clientID })
            );
          }
          if (typeof type !== "string" || !(type in lobbyThunks)) return;
          thunkAPI.dispatch(lobbyThunks[type](message.payload, thunkAPI));
        });
        connection.addEventListener("close", () => {
          delete connections[clientID];
        });
      },
    });
    const host = Math.random().toString(36).substring(7);
    thunkAPI.dispatch(
      setLobbyState({
        state: {
          roomID,
          host,
          players: {
            [host]: { playerID: host, playerName: host, ready: false },
          },
          playOrder: [host],
        },
      })
    );
    thunkAPI.dispatch(setPlayerID(host));
  }
);

export const joinLobby = createLobbyThunk(
  "lobby/joinLobby",
  async (
    { roomID, createPeer }: { roomID: string; createPeer?: () => Peer },
    thunkAPI
  ) => {
    createPeer = createPeer || defaultCreatePeer;
    const peer = createPeer();
    const connection = await peer.connect(roomID);
    connection.addEventListener("close", () => {
      delete connections[roomID];
      thunkAPI.dispatch(lobbySlice.actions.setLobbyState({ state: null }));
    });
    connection.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "lobby/setPlayerID") {
        thunkAPI.dispatch(setPlayerID(message.payload));
      } else if (message.type === "lobby/setLobbyState") {
        thunkAPI.dispatch(setLobbyState(message.payload));
      } else if (message.method === "lobby/startGame") {
        thunkAPI.dispatch(startGame(undefined));
      }
    });
    connection.send(JSON.stringify({ type: "lobby/joinMatch" }));
    connections[roomID] = connection;
  }
);

export const chooseGame = createLobbyThunk(
  "lobby/chooseGame",
  async (game: string, thunkAPI) => {
    thunkAPI.dispatch(lobbySlice.actions.setLobbyState({ state: { game } }));
  }
);

export const getReady = createLobbyThunk("lobby/ready", async (_, thunkAPI) => {
  const state = thunkAPI.getState();
  const playerID = state.lobby.playerID;
  thunkAPI.dispatch(
    lobbySlice.actions.setLobbyState({
      state: {
        players: Object.fromEntries(
          Object.entries(state.lobby.state.players).map(([id, player]) => [
            id,
            {
              ...player,
              ready: playerID === id ? !player.ready : player.ready,
            },
          ])
        ),
      },
    })
  );
});

export const startGame = createLobbyThunk(
  "lobby/start",
  async (_, thunkAPI) => {
    createEnhancerFromState(thunkAPI.getState());
    thunkAPI.dispatch(
      lobbySlice.actions.setLobbyState({ state: { matchRunning: true } })
    );
  }
);

const initialState = {
  state: {
    roomID: "",
    game: "",
    players: {} as Record<
      string,
      { playerID: string; playerName: string; ready: boolean }
    >,
    playOrder: [] as string[],
    matchRunning: false,
    host: "",
  },
  playerID: null as string | null,
};

const lobbySlice = createSlice({
  name: "lobby",
  initialState,
  reducers: {
    setLobbyState(
      state,
      action: PayloadAction<{
        state: Partial<(typeof initialState)["state"]>;
      }>
    ) {
      Object.assign(state.state, action.payload.state);
    },
    setPlayerID(state, action: PayloadAction<string>) {
      state.playerID = action.payload;
    },
  },
});

const { setLobbyState, setPlayerID } = lobbySlice.actions;

export type LobbyAction = typeof lobbySlice.actions;

export default lobbySlice;
