import {
  Clear as ClearIcon,
  ContentPaste as ContentPasteIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import {
  Avatar,
  Box,
  Button,
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
import React, { useEffect } from "react";

import { chooseGame, createLobby, joinLobby, startGame } from "../app/lobby";
import { useAppDispatch, useAppSelector } from "../app/store";
import broadcastChannelPeer from "../peer/broadcastChannel";
import { Peer } from "../peer/types";
import { createPeerFactory as createPeerWebRTCFactory } from "../peer/webrtc";
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
            iceServers: [{ urls: ["stun:stun.cloudflare.com:3478"] }],
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
  const createPeerRef = useCreatePeerRef();

  const dispatch = useAppDispatch();

  const handleJoin = async () => {
    if (!roomID) return;
    dispatch(joinLobby({ roomID, Peer: createPeerRef.current }));
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const roomID = searchParams.get("p");
    if (roomID) {
      dispatch(joinLobby({ roomID, Peer: createPeerRef.current }));
    }
  }, [dispatch, createPeerRef]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle variant="h5">Join Room</DialogTitle>
      <DialogContent>
        <Stack direction="row" sx={{ paddingTop: 2 }}>
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
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleJoin}>
          Join
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
      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Stack spacing={3} sx={{ "&>.MuiButton-root": { width: "200px" } }}>
          <Typography variant="h4" textAlign="center">
            Ally Games
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => {
              dispatch(chooseGame("block-blast"));
              dispatch(startGame());
            }}
          >
            Single Player
          </Button>
          <Button
            variant="contained"
            size="large"
            onClick={() =>
              dispatch(
                createLobby({ hostName: nickname, Peer: createPeerRef.current })
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
      </Box>
    </Stack>
  );
}

export default Home;
