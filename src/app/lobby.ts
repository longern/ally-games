import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState = {
  state: {
    roomID: "",
    host: "",
    game: "",
    players: {} as Record<
      string,
      { playerID: string; playerName: string; ping?: number; ready: boolean }
    >,
    playOrder: [] as string[],
    matchRunning: false,
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
        state: Partial<(typeof initialState)["state"]> | null;
      }>
    ) {
      if (action.payload.state === null) {
        state.state = initialState.state;
        state.playerID = null;
        return;
      }
      Object.assign(state.state, action.payload.state);
    },
    setPing(state, action: PayloadAction<{ playerID: string; ping: number }>) {
      state.state.players[action.payload.playerID].ping = action.payload.ping;
    },
    setPlayerID(state, action: PayloadAction<string>) {
      state.playerID = action.payload;
    },
  },
});

export const { setLobbyState, setPing, setPlayerID } = lobbySlice.actions;

export default lobbySlice;
