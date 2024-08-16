import { Box, Button, Stack, TextField } from "@mui/material";
import { StoreEnhancer } from "@reduxjs/toolkit";
import React, { useEffect } from "react";

import { Client, GameBoardComponent } from "../Client";
import { Game } from "../app/game";
import { createEnhancerFromLobby } from "../app/lobbyMiddleware";
import { useAppDispatch, useAppSelector } from "../app/store";
import { lazyGameComponents } from "./router";
import Lobby from "./Lobby";
import { setSettings } from "../app/settings";
import Home from "./Home";

function LazyClient({
  gameComponent,
}: {
  gameComponent: () => Promise<{ game: Game; Board: GameBoardComponent }>;
}) {
  const [component, setComponent] = React.useState<{
    game: Game;
    Board: GameBoardComponent;
  } | null>(null);
  const [enhancer, setEnhancer] = React.useState<StoreEnhancer | null>(null);
  const lobbyState = useAppSelector((state) => state.lobby);
  const lobbyStateRef = React.useRef(lobbyState);

  useEffect(() => {
    lobbyStateRef.current = lobbyState;
  }, [lobbyState]);

  useEffect(() => {
    setEnhancer(() => createEnhancerFromLobby(lobbyStateRef.current));
  }, []);

  useEffect(() => {
    gameComponent().then(setComponent);
  }, [gameComponent]);

  return enhancer && component ? (
    <Client game={component.game} board={component.Board} enhancer={enhancer} />
  ) : null;
}

function NicknamePage() {
  const [nickname, setNickname] = React.useState("");
  const dispatch = useAppDispatch();

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Stack spacing={4}>
        <TextField
          label="Nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          fullWidth
        />
        <Button
          size="large"
          variant="contained"
          onClick={() => {
            dispatch(setSettings({ value: { nickname } }));
          }}
        >
          Continue
        </Button>
      </Stack>
    </Box>
  );
}

function App() {
  const roomID = useAppSelector((state) => state.lobby.state.roomID);
  const matchRunning = useAppSelector(
    (state) => state.lobby.state.matchRunning
  );
  const nickname = useAppSelector((state) => state.settings.nickname);
  const gameName = useAppSelector((state) => state.lobby.state.game);

  return !nickname ? (
    <NicknamePage />
  ) : matchRunning ? (
    <LazyClient gameComponent={lazyGameComponents[`/${gameName}`]} />
  ) : roomID ? (
    <Lobby />
  ) : (
    <Home />
  );
}

export default App;
