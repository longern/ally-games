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
import { useNavigate } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "../app/store";
import {
  chooseGame,
  createLobby,
  getReady,
  joinLobby,
  startGame,
} from "../app/lobby";
import { getEnhancer } from "../app/lobbyMiddleware";
import { useSetEnhancer } from "../enhancer";
import {
  Close as CloseIcon,
  NavigateNext as NavigateNextIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";

function Lobby() {
  const lobby = useAppSelector((state) => state.lobby.state);
  const playerID = useAppSelector((state) => state.lobby.playerID);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const setEnhancer = useSetEnhancer();

  useEffect(() => {
    dispatch(chooseGame("block-blast"));
  }, [dispatch]);

  useEffect(() => {
    if (!lobby.matchRunning) return;
    setEnhancer({ current: getEnhancer() });
    navigate(`/${lobby.game}`);
  }, [lobby.game, lobby.matchRunning, navigate, setEnhancer]);

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

function Home() {
  const [joiningRoom, setJoiningRoom] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const roomID = useAppSelector((state) => state.lobby.state.roomID);
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
              onClick={() => dispatch(createLobby({}))}
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
