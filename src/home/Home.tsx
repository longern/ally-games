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
import broadcastChannelPeer from "../peer/broadcastChannel";
import { Peer } from "../peer/types";
import { createPeerFactory as createPeerWebRTCFactory } from "../peer/webrtc";
import SettingsDialog from "./SettingsDialog";
import { TurnServer } from "../app/settings";
import { GameGrid, useGameList } from "./useGameList";
import { setLobbyState } from "../app/lobby";

const cloudflareTurnTokenCache: Record<
  string,
  {
    ttl: number;
    iceServers: RTCIceServer;
    timestamp: number;
  }
> = {};

async function fetchCloudflareTurn(
  turnServer: Extract<TurnServer, { type: "cloudflare" }>
): Promise<RTCIceServer> {
  const cached =
    cloudflareTurnTokenCache[turnServer.keyId + turnServer.keyToken];
  if (cached) {
    if (Date.now() - cached.timestamp < cached.ttl * 1000) {
      return cached.iceServers;
    }
  }

  const timestamp = Date.now();
  const response = await fetch(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${turnServer.keyId}/credentials/generate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${turnServer.keyToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ttl: 86400 }),
    }
  );
  let text = await response.text();
  if (turnServer.customDomain)
    text = text.replaceAll("turn.cloudflare.com", turnServer.customDomain);
  const { iceServers } = JSON.parse(text) as { iceServers: RTCIceServer };
  cloudflareTurnTokenCache[turnServer.keyId + turnServer.keyToken] = {
    ttl: 86400,
    iceServers,
    timestamp,
  };
  return iceServers;
}

function useCreatePeerRef() {
  const createPeerRef = React.useRef<Peer | undefined>(undefined);
  const protocol = useAppSelector((state) => state.settings.protocol);
  const turnServers = useAppSelector((state) => state.settings.turnServers);

  useEffect(() => {
    switch (protocol) {
      case "broadcast-channel":
        createPeerRef.current = broadcastChannelPeer;
        break;
      case "webrtc":
        {
          async function getRtcConfiguration() {
            const iceTurnServersSettled = await Promise.allSettled([
              ...(turnServers || [])
                .filter((turnServer) => !turnServer.disabled)
                .map((turnServer) =>
                  turnServer.type === "custom"
                    ? Promise.resolve({
                        urls: turnServer.urls,
                        username: turnServer.username,
                        credential: turnServer.credential,
                      })
                    : fetchCloudflareTurn(turnServer)
                ),
            ]);

            const iceTurnServers = iceTurnServersSettled
              .filter(
                (result): result is PromiseFulfilledResult<RTCIceServer> =>
                  result.status === "fulfilled"
              )
              .map((result) => result.value);

            return {
              iceServers: [
                { urls: ["stun:stun.cloudflare.com:3478"] },
                ...iceTurnServers,
              ],
            };
          }

          createPeerRef.current = createPeerWebRTCFactory({
            rtcConfiguration: getRtcConfiguration,
          });
        }
        break;
    }
  }, [protocol, turnServers]);

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
