import {
  Box,
  Button,
  Dialog,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import React, { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "../app/store";
import {
  chooseGame,
  createLobby,
  getReady,
  joinLobby,
  startGame,
} from "../app/lobby";
import { createEnhancerFromLobby } from "../app/lobbyMiddleware";
import {
  Close as CloseIcon,
  NavigateNext as NavigateNextIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { lazyGameComponents } from "./router";
import { Client, GameBoardComponent } from "../Client";
import { Game } from "../app/game";
import { StoreEnhancer } from "@reduxjs/toolkit";
import { Peer } from "../peer/types";
import { createPeer as createPeerBroadcastChannel } from "../peer/broadcastChannel";

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

  const dispatch = useAppDispatch();

  const handleJoin = async () => {
    if (!roomID) return;
    dispatch(joinLobby({ roomID }));
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

function SettingsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const protocol = useAppSelector((state) => state.settings.protocol);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <Toolbar>
        <Typography variant="h6">Settings</Typography>
        <Box sx={{ flexGrow: 1 }} />
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Toolbar>
      <List
        disablePadding
        sx={{ "& .MuiListItemButton-root": { minHeight: "60px" } }}
      >
        <ListItem disablePadding>
          <ListItemButton>
            <ListItemText
              primary="Protocol"
              secondary={protocol}
            ></ListItemText>
            <NavigateNextIcon />
          </ListItemButton>
        </ListItem>
      </List>
    </Dialog>
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
        createPeerRef.current = () => {
          throw new Error("Not implemented");
        };
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
