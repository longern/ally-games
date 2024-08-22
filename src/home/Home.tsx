import {
  Clear as ClearIcon,
  ContentPaste as ContentPasteIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import React, { useCallback, useEffect } from "react";

import { setLobbyState } from "../app/lobby";
import { createLobby, joinLobby } from "../app/middlewares/lobby";
import { useAppDispatch, useAppSelector } from "../app/store";
import broadcastChannelPeer from "../peer/broadcastChannel";
import { Peer } from "../peer/types";
import { createPeerFactory as createPeerWebRTCFactory } from "../peer/webrtc";
import { lazyGameComponents } from "./router";
import SettingsDialog from "./SettingsDialog";

function useCreatePeerRef() {
  const createPeerRef = React.useRef<Peer | undefined>(undefined);
  const protocol = useAppSelector((state) => state.settings.protocol);

  useEffect(() => {
    switch (protocol) {
      case "broadcast-channel":
        createPeerRef.current = broadcastChannelPeer;
        break;
      case "webrtc":
        createPeerRef.current = createPeerWebRTCFactory({
          rtcConfiguration: {
            iceServers: [
              { urls: ["stun:stun.cloudflare.com:3478"] },
              {
                urls: "turn:freeturn.net:3479",
                username: "free",
                credential: "free",
              },
            ],
          },
        });
        break;
    }
  }, [protocol]);

  return createPeerRef;
}

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
  const createPeerRef = useCreatePeerRef();

  const dispatch = useAppDispatch();

  const handleJoin = useCallback(
    async (roomID: string) => {
      if (!roomID) return;
      setLoading(true);
      dispatch(joinLobby({ roomID, Peer: createPeerRef.current }))
        .unwrap()
        .catch((err) => setMessage(err.message || "Could not join room."))
        .finally(() => setLoading(false));
    },
    [dispatch, createPeerRef]
  );

  useEffect(() => {
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

const gameListCache = {
  current: null as null | { name: string; pathname: string }[],
};

function useGameList() {
  const [games, setGames] = React.useState<
    { name: string; pathname: string }[]
  >([]);

  useEffect(() => {
    if (gameListCache.current) {
      setGames(gameListCache.current);
      return;
    }

    Promise.allSettled(
      Object.keys(lazyGameComponents).map((gamePath) =>
        fetch(`${gamePath}/manifest.json`).then(
          async (res) => [gamePath, await res.json()] as const
        )
      )
    ).then((responses) => {
      const games = responses.flatMap((response) => {
        if (response.status === "rejected") return [];
        const [gamePath, manifest] = response.value;
        return { ...manifest, pathname: gamePath.replace(/^\//, "") };
      });
      gameListCache.current = games;
      setGames(games);
    });
  }, []);

  return games;
}

function Home() {
  const [showSettings, setShowSettings] = React.useState(false);
  const [showJoinRoom, setShowJoinRoom] = React.useState(false);
  const nickname = useAppSelector((state) => state.settings.nickname);
  const createPeerRef = useCreatePeerRef();
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
        <Grid container spacing={3}>
          {games.map((game) => (
            <Grid item key={game.name} xs={6} md={4}>
              <Card>
                <CardActionArea
                  onClick={() => {
                    dispatch(
                      setLobbyState({
                        state: { game: game.pathname, matchRunning: true },
                      })
                    );
                  }}
                >
                  <CardContent>{game.name}</CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
        <Stack
          direction="row"
          spacing={3}
          sx={{ "&>.MuiButton-root": { width: "200px" } }}
        >
          <Button
            variant="contained"
            size="large"
            onClick={() =>
              dispatch(
                createLobby({
                  hostName: nickname,
                  Peer: createPeerRef.current,
                })
              )
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
