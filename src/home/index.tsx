import { Settings as SettingsIcon } from "@mui/icons-material";
import {
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { StoreEnhancer } from "@reduxjs/toolkit";
import React, { useEffect } from "react";

import { Client, GameBoardComponent } from "../Client";
import { Game } from "../app/game";
import {
  chooseGame,
  createLobby,
  getReady,
  joinLobby,
  startGame,
} from "../app/lobby";
import { createEnhancerFromLobby } from "../app/lobbyMiddleware";
import { useAppDispatch, useAppSelector } from "../app/store";
import { createPeer as createPeerBroadcastChannel } from "../peer/broadcastChannel";
import { Peer } from "../peer/types";
import { createPeerFactory as createPeerWebRTCFactory } from "../peer/webrtc";
import SettingsDialog from "./SettingsDialog";
import { lazyGameComponents } from "./router";

function Lobby() {
  const lobby = useAppSelector((state) => state.lobby.state);
  const playerID = useAppSelector((state) => state.lobby.playerID);
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(chooseGame("block-blast"));
  }, [dispatch]);

  return (
    <Stack spacing={2}>
      <Stack direction="row">
        <TextField value={lobby.roomID} fullWidth />
        <Button onClick={() => navigator.clipboard.writeText(lobby.roomID)}>
          Copy
        </Button>
      </Stack>
      <Typography variant="body1">{lobby.playOrder.length} players</Typography>
      {lobby.host === playerID ? (
        <Button onClick={() => dispatch(startGame())}>Start</Button>
      ) : (
        <Button onClick={() => dispatch(getReady())}>Ready</Button>
      )}
    </Stack>
  );
}

function JoinRoom() {
  const [roomID, setRoomID] = React.useState("");
  const createPeerRef = useCreatePeerRef();

  const dispatch = useAppDispatch();

  const handleJoin = async () => {
    if (!roomID) return;
    dispatch(joinLobby({ roomID, createPeer: createPeerRef.current }));
  };

  return (
    <Stack direction="row">
      <TextField
        label="Room ID"
        fullWidth
        value={roomID}
        onChange={(e) => setRoomID(e.target.value)}
      />
      <Button onClick={handleJoin}>Join</Button>
    </Stack>
  );
}

function LazyClient({
  gameComponents,
}: {
  gameComponents: () => Promise<{ game: Game; Board: GameBoardComponent }>;
}) {
  const [component, setComponent] = React.useState<{
    game: Game;
    Board: GameBoardComponent;
  } | null>(null);
  const [enhancer, setEnhancer] = React.useState<StoreEnhancer | null>(null);
  const lobbyState = useAppSelector((state) => state.lobby);

  useEffect(() => {
    setEnhancer(() => createEnhancerFromLobby(lobbyState));
  }, [lobbyState]);

  useEffect(() => {
    gameComponents().then(setComponent);
  }, [gameComponents]);

  return enhancer && component ? (
    <Client game={component.game} board={component.Board} enhancer={enhancer} />
  ) : null;
}

function useCreatePeerRef() {
  const createPeerRef = React.useRef<(() => Peer) | undefined>(undefined);
  const protocol = useAppSelector((state) => state.settings.protocol);

  useEffect(() => {
    switch (protocol) {
      case "broadcast-channel":
        createPeerRef.current = createPeerBroadcastChannel;
        break;
      case "webrtc":
        createPeerRef.current = createPeerWebRTCFactory();
        break;
    }
  }, [protocol]);
  return createPeerRef;
}

function Home() {
  const [joiningRoom, setJoiningRoom] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const roomID = useAppSelector((state) => state.lobby.state.roomID);
  const matchRunning = useAppSelector(
    (state) => state.lobby.state.matchRunning
  );
  const gameName = useAppSelector((state) => state.lobby.state.game);
  const createPeerRef = useCreatePeerRef();
  const dispatch = useAppDispatch();

  return matchRunning ? (
    <LazyClient gameComponents={lazyGameComponents[`/${gameName}`]} />
  ) : (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {roomID ? (
        <Lobby />
      ) : joiningRoom ? (
        <JoinRoom />
      ) : (
        <React.Fragment>
          <Stack spacing={3} sx={{ "&>.MuiButton-root": { width: "200px" } }}>
            <Typography variant="h4" textAlign="center">
              Ally Games
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() =>
                dispatch(createLobby({ createPeer: createPeerRef.current }))
              }
            >
              Create Room
            </Button>
            <Button
              variant="contained"
              size="large"
              onClick={() => setJoiningRoom(true)}
            >
              Join Room
            </Button>
          </Stack>
          <IconButton
            aria-label="Settings"
            size="large"
            sx={{ position: "absolute", top: 8, right: 8 }}
            onClick={() => setShowSettings(true)}
          >
            <SettingsIcon />
          </IconButton>
        </React.Fragment>
      )}
      <SettingsDialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </Box>
  );
}

export default Home;
