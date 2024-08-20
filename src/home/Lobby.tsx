import {
  Avatar,
  Badge,
  Box,
  Button,
  Container,
  Dialog,
  DialogContent,
  Grid,
  IconButton,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import React, { useEffect } from "react";

import { chooseGame, getReady, startGame } from "../app/lobby";
import { useAppDispatch, useAppSelector } from "../app/store";
import {
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  ContentCopy as ContentCopyIcon,
  Menu as MenuIcon,
  NavigateBefore as NavigateBeforeIcon,
} from "@mui/icons-material";

function QRCode({ value }: { value: string }) {
  return (
    <img
      src={`https://api.qrserver.com/v1/create-qr-code/?size=192x192&data=${encodeURIComponent(
        value
      )}`}
      alt=""
      width="192"
      height="192"
    />
  );
}

function Lobby() {
  const [showInvite, setShowInvite] = React.useState(false);
  const lobby = useAppSelector((state) => state.lobby.state);
  const playerID = useAppSelector((state) => state.lobby.playerID);
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(chooseGame("block-blast"));
  }, [dispatch]);

  const inviteSearchParam = new URLSearchParams({ p: lobby.roomID });
  const inviteUrl = `${window.location.href}?${inviteSearchParam}`;

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
            <IconButton aria-label="Back" size="large">
              <NavigateBeforeIcon />
            </IconButton>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Typography
            variant="h6"
            sx={{
              textWrap: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {lobby.roomID}
          </Typography>
          <IconButton
            aria-label="Copy"
            onClick={() => navigator.clipboard.writeText(lobby.roomID)}
          >
            <ContentCopyIcon />
          </IconButton>
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
            <IconButton aria-label="Menu" size="large">
              <MenuIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </Container>
      <Container maxWidth="md" sx={{ height: "100%", padding: 2 }}>
        <Stack spacing={2} sx={{ width: "100%", height: "100%" }}>
          <Box sx={{ flexGrow: 1 }}>
            <Grid container>
              {Object.entries(lobby.players).map(([id, player]) => (
                <Grid item key={id} xs={4} md={2} sx={{ padding: 2 }}>
                  <Stack spacing={1} sx={{ alignItems: "center" }}>
                    <Badge
                      badgeContent={
                        player.ready && <CheckCircleIcon color="success" />
                      }
                    >
                      <Avatar />
                    </Badge>
                    <Typography variant="body1">{player.playerName}</Typography>
                  </Stack>
                </Grid>
              ))}
              {Array.from({
                length: 6 - Object.keys(lobby.players).length,
              }).map((_, i) => (
                <Grid item key={i} xs={4} md={2} sx={{ padding: 2 }}>
                  <Stack spacing={1} sx={{ alignItems: "center" }}>
                    <Avatar>
                      <AddIcon />
                    </Avatar>
                    <Typography variant="body1">&nbsp;</Typography>
                  </Stack>
                </Grid>
              ))}
            </Grid>
          </Box>
          <Stack direction="row" spacing={2} sx={{ justifyContent: "center" }}>
            <Button
              variant="outlined"
              size="large"
              onClick={() => setShowInvite(true)}
            >
              Invite
            </Button>
            {lobby.host === playerID ? (
              <Button
                variant="contained"
                size="large"
                onClick={() => dispatch(startGame())}
              >
                Start
              </Button>
            ) : (
              <Button
                variant="contained"
                size="large"
                onClick={() => dispatch(getReady())}
              >
                Ready
              </Button>
            )}
          </Stack>
        </Stack>
        <Dialog open={showInvite} onClose={() => setShowInvite(false)}>
          <DialogContent>
            <QRCode value={inviteUrl} />
          </DialogContent>
        </Dialog>
      </Container>
    </Stack>
  );
}

export default Lobby;
