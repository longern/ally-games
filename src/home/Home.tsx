import {
  Clear as ClearIcon,
  ContentPaste as ContentPasteIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import React, { useCallback, useEffect } from "react";

import { createLobby, joinLobby } from "../app/middlewares/lobby";
import { useAppDispatch, useAppSelector } from "../app/store";
import SettingsDialog from "./SettingsDialog";
import { GameGrid, useGameList } from "./useGameList";
import { setLobbyState } from "../app/lobby";
import { usePeerInterface } from "./usePeerInterface";

function JoinRoomDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [roomID, setRoomID] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const loadedRef = React.useRef(false);
  const peerInterface = usePeerInterface();

  const dispatch = useAppDispatch();

  const handleJoin = useCallback(
    async (roomID: string) => {
      if (!roomID) return;
      setLoading(true);
      dispatch(joinLobby({ roomID, Peer: peerInterface }))
        .unwrap()
        .catch((err) => setMessage(err.message || "Could not join room."))
        .finally(() => setLoading(false));
    },
    [dispatch, peerInterface]
  );

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    const searchParams = new URLSearchParams(window.location.search);
    const roomID = searchParams.get("p");
    if (roomID) {
      setRoomID(roomID);
      handleJoin(roomID);
    }
  }, [handleJoin]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle variant="h5">Join Room</DialogTitle>
      <DialogContent>
        <Stack spacing={1} sx={{ paddingTop: 2 }}>
          <TextField
            label="Room ID"
            fullWidth
            value={roomID}
            onChange={(e) => setRoomID(e.target.value)}
            InputProps={{
              endAdornment: roomID ? (
                <IconButton
                  aria-label="Clear"
                  onClick={async () => setRoomID("")}
                >
                  <ClearIcon />
                </IconButton>
              ) : navigator.clipboard ? (
                <IconButton
                  onClick={async () =>
                    setRoomID(await navigator.clipboard.readText())
                  }
                >
                  <ContentPasteIcon />
                </IconButton>
              ) : null,
            }}
          />
          {message && (
            <Typography variant="body2" color="error">
              {message}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => handleJoin(roomID)}>
          {loading ? <CircularProgress size={24} color="inherit" /> : "Join"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function Home() {
  const [showSettings, setShowSettings] = React.useState(false);
  const [showJoinRoom, setShowJoinRoom] = React.useState(false);
  const nickname = useAppSelector((state) => state.settings.nickname);
  const peerInterface = usePeerInterface();
  const dispatch = useAppDispatch();

  const games = useGameList();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const roomID = searchParams.get("p");
    if (roomID) setShowJoinRoom(true);
  }, []);

  return (
    <Stack sx={{ height: "100%" }}>
      <Container maxWidth="md" disableGutters>
        <Toolbar disableGutters sx={{ height: "60px" }}>
          <Box
            sx={{
              height: "100%",
              aspectRatio: "1 / 1",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Avatar />
          </Box>
          <Typography
            variant="body1"
            sx={{
              marginLeft: 1,
              textWrap: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {nickname}
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Box
            sx={{
              height: "100%",
              aspectRatio: "1 / 1",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <IconButton
              aria-label="Settings"
              size="large"
              onClick={() => setShowSettings(true)}
            >
              <SettingsIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </Container>
      <Container
        maxWidth="md"
        sx={{
          flexGrow: 1,
          padding: 2,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <GameGrid
          games={games}
          onClick={(game) => {
            dispatch(setLobbyState({ state: { game, matchRunning: true } }));
          }}
        />
        <Stack
          direction="row"
          spacing={3}
          sx={{ "&>.MuiButton-root": { width: "200px" } }}
        >
          <Button
            variant="contained"
            size="large"
            onClick={() =>
              dispatch(createLobby({ hostName: nickname, Peer: peerInterface }))
            }
          >
            Create Room
          </Button>
          <Button
            variant="contained"
            size="large"
            onClick={() => setShowJoinRoom(true)}
          >
            Join Room
          </Button>
        </Stack>
        <SettingsDialog
          open={showSettings}
          onClose={() => setShowSettings(false)}
        />
        <JoinRoomDialog
          open={showJoinRoom}
          onClose={() => setShowJoinRoom(false)}
        />
      </Container>
    </Stack>
  );
}

export default Home;
