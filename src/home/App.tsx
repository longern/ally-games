import { Close as CloseIcon } from "@mui/icons-material";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { StoreEnhancer } from "@reduxjs/toolkit";
import React, { useEffect } from "react";

import { Client, GameBoardComponent } from "../Client";
import { Game } from "../app/game";
import { setLobbyState } from "../app/lobby";
import { createEnhancerFromLobby, joinLobby } from "../app/middlewares/lobby";
import { useAppDispatch, useAppSelector } from "../app/store";
import Home from "./Home";
import Lobby from "./Lobby";
import { lazyGameComponents } from "./router";
import { setSettings } from "../app/settings";
import { usePeerInterface } from "./usePeerInterface";

function ClientFloatingActions({ onLeave }: { onLeave: () => void }) {
  const [showLeaveDialog, setShowLeaveDialog] = React.useState(false);

  return (
    <React.Fragment>
      <IconButton
        aria-label="Leave game"
        size="small"
        onClick={() => setShowLeaveDialog(true)}
        sx={{
          backgroundColor: "rgba(255, 255, 255, 0.3)",
          position: "fixed",
          top: "8px",
          left: "8px",
          zIndex: 1600,
          transition: "background-color 0.2s",
          "&:hover": {
            backgroundColor: "rgba(255, 255, 255, 0.35)",
          },
        }}
      >
        <CloseIcon />
      </IconButton>
      <Dialog open={showLeaveDialog} onClose={() => setShowLeaveDialog(false)}>
        <DialogContent>
          <p>Are you sure you want to leave the game?</p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowLeaveDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={onLeave}>
            Leave
          </Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}

function LazyClient({
  gameComponent,
  fallback,
}: {
  gameComponent: () => Promise<{ game: Game; Board: GameBoardComponent }>;
  fallback?: React.ReactNode;
}) {
  const [component, setComponent] = React.useState<{
    game: Game;
    Board: GameBoardComponent;
  } | null>(null);
  const [enhancer, setEnhancer] = React.useState<StoreEnhancer | undefined>(
    undefined
  );
  const lobbyState = useAppSelector((state) => state.lobby);
  const lobbyStateRef = React.useRef(lobbyState);
  const dispatch = useAppDispatch();

  useEffect(() => {
    lobbyStateRef.current = lobbyState;
  }, [lobbyState]);

  useEffect(() => {
    if (!component) return;
    setEnhancer(() =>
      createEnhancerFromLobby(lobbyStateRef.current, component.game)
    );
  }, [component]);

  useEffect(() => {
    gameComponent().then(setComponent);
  }, [gameComponent]);

  return component ? (
    <React.Fragment>
      <Client
        game={component.game}
        board={component.Board}
        enhancer={enhancer}
      />
      <ClientFloatingActions
        onLeave={() =>
          dispatch(setLobbyState({ state: { matchRunning: false } }))
        }
      />
    </React.Fragment>
  ) : (
    fallback
  );
}

function Joining() {
  return (
    <Stack
      spacing={2}
      sx={{
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <CircularProgress />
      <Typography variant="body2">Joining room...</Typography>
    </Stack>
  );
}

function App() {
  const [loading, setLoading] = React.useState(false);
  const loadedRef = React.useRef(false);

  const roomID = useAppSelector((state) => state.lobby.state.roomID);
  const matchRunning = useAppSelector(
    (state) => state.lobby.state.matchRunning
  );
  const nickname = useAppSelector((state) => state.settings.nickname);
  const gameName = useAppSelector((state) => state.lobby.state.game);

  const dispatch = useAppDispatch();
  const peerInterface = usePeerInterface();

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    const searchParams = new URLSearchParams(window.location.search);
    const roomID = searchParams.get("p");
    if (roomID) {
      setLoading(true);
      dispatch(joinLobby({ roomID, Peer: peerInterface }))
        .unwrap()
        .catch((err) => window.alert(err.message))
        .finally(() => setLoading(false));
    }
  }, [dispatch, peerInterface]);

  useEffect(() => {
    if (nickname) return;
    const randomString = crypto.getRandomValues(new Uint32Array(1))[0];
    const randomName = `ap_${randomString.toString(36)}`;
    dispatch(setSettings({ value: { nickname: randomName } }));
  }, [nickname, dispatch]);

  return loading ? (
    <Joining />
  ) : matchRunning ? (
    <LazyClient gameComponent={lazyGameComponents[`/${gameName}`]} />
  ) : roomID ? (
    <Lobby />
  ) : (
    <Home />
  );
}

export default App;
