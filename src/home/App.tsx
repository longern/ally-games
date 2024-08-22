import { Close as CloseIcon } from "@mui/icons-material";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
} from "@mui/material";
import { StoreEnhancer } from "@reduxjs/toolkit";
import React, { useEffect } from "react";

import { Client, GameBoardComponent } from "../Client";
import { Game } from "../app/game";
import { setLobbyState } from "../app/lobby";
import { createEnhancerFromLobby } from "../app/middlewares/lobby";
import { useAppDispatch, useAppSelector } from "../app/store";
import Home from "./Home";
import Lobby from "./Lobby";
import NicknamePage from "./NicknamePage";
import { lazyGameComponents } from "./router";

function ClientFloatingActions({ onLeave }: { onLeave: () => void }) {
  const [showLeaveDialog, setShowLeaveDialog] = React.useState(false);

  return (
    <React.Fragment>
      <IconButton
        aria-label="Leave game"
        size="small"
        onClick={() => setShowLeaveDialog(true)}
        sx={{
          position: "fixed",
          top: "8px",
          left: "8px",
          zIndex: 1000,
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
    setEnhancer(() => createEnhancerFromLobby(lobbyStateRef.current));
  }, []);

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
