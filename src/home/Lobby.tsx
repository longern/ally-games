import {
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  ContentCopy as ContentCopyIcon,
  Menu as MenuIcon,
  NavigateBefore as NavigateBeforeIcon,
  Share as ShareIcon,
} from "@mui/icons-material";
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
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import React, { useEffect, useMemo } from "react";

import { Game } from "../app/game";
import { setLobbyState } from "../app/lobby";
import { leaveLobby, setReady } from "../app/middlewares/lobby";
import { useAppDispatch, useAppSelector } from "../app/store";
import DialogToolbar from "./DialogToolbar";
import { lazyGameComponents } from "./router";
import { GameGrid, useGameList } from "./useGameList";

function QRCode({ value }: { value: string }) {
  return (
    <img
      src={`https://api.qrserver.com/v1/create-qr-code/?size=192x192&data=${encodeURIComponent(
        value
      )}`}
      alt={value}
      width="192"
      height="192"
    />
  );
}

function ChooseGameDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const games = useGameList();
  const game = useAppSelector((state) => state.lobby.state.game);

  const dispatch = useAppDispatch();

  return (
    <Dialog open={open} fullScreen>
      <DialogToolbar onClose={onClose} title="Choose Game" />
      <DialogContent>
        <GameGrid
          games={games}
          selected={game}
          onClick={(game) => {
            dispatch(setLobbyState({ state: { game } }));
            onClose();
          }}
        ></GameGrid>
      </DialogContent>
    </Dialog>
  );
}

function Lobby() {
  const [showInvite, setShowInvite] = React.useState(false);
  const [showChooseGame, setShowChooseGame] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [readyCooldown, setReadyCooldown] = React.useState(false);
  const [gameDefinition, setGameDefinition] = React.useState<Game>();
  const lobby = useAppSelector((state) => state.lobby.state);
  const playerID = useAppSelector((state) => state.lobby.playerID);
  const dispatch = useAppDispatch();

  const inviteUrl = useMemo(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("p", lobby.roomID);
    return url.toString();
  }, [lobby.roomID]);

  useEffect(() => {
    if (!lobby.game) return;
    lazyGameComponents[`/${lobby.game}`]().then(({ game }) =>
      setGameDefinition(game)
    );
  }, [lobby.game]);

  const maxPlayers = gameDefinition?.maxPlayers;

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
            <IconButton
              aria-label="Back"
              size="large"
              onClick={() => dispatch(leaveLobby())}
            >
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
            <IconButton
              aria-label="Menu"
              size="large"
              onClick={(e) => setAnchorEl(e.currentTarget)}
            >
              <MenuIcon />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
            >
              <MenuItem
                onClick={() => {
                  setShowChooseGame(true);
                  setAnchorEl(null);
                }}
              >
                Choose Game
              </MenuItem>
              <MenuItem>Rule</MenuItem>
            </Menu>
          </Box>
        </Toolbar>
        <ChooseGameDialog
          open={showChooseGame}
          onClose={() => setShowChooseGame(false)}
        />
      </Container>
      <Container maxWidth="md" sx={{ height: "100%", padding: 2 }}>
        <Stack sx={{ width: "100%", height: "100%" }}>
          <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center" }}>
            <Grid container>
              {Object.entries(lobby.players).map(([id, player]) => (
                <Grid item key={id} xs={4} md={3} sx={{ paddingY: 4 }}>
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
                length: (maxPlayers ?? 6) - Object.keys(lobby.players).length,
              }).map((_, i) => (
                <Grid item key={i} xs={4} md={3} sx={{ paddingY: 4 }}>
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
          <Stack
            direction="row"
            spacing={2}
            sx={{
              width: "100%",
              maxWidth: (theme) => theme.breakpoints.values.sm,
              alignSelf: "center",
              "& > *": { flexBasis: "50%" },
            }}
          >
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
                disabled={lobby.playOrder.some(
                  (playerID) => !lobby.players[playerID].ready
                )}
                onClick={() =>
                  dispatch(setLobbyState({ state: { matchRunning: true } }))
                }
              >
                Start
              </Button>
            ) : (
              <Button
                variant="contained"
                size="large"
                disabled={readyCooldown}
                onClick={() => {
                  dispatch(setReady(!lobby.players[playerID].ready));
                  setReadyCooldown(true);
                  setTimeout(() => setReadyCooldown(false), 1000);
                }}
              >
                {lobby.players[playerID]?.ready ? "Unready" : "Ready"}
              </Button>
            )}
          </Stack>
        </Stack>
        <Dialog open={showInvite} onClose={() => setShowInvite(false)}>
          <DialogContent>
            <Stack spacing={2}>
              <QRCode value={inviteUrl} />
              <Stack direction="row" sx={{ justifyContent: "space-evenly" }}>
                <IconButton
                  aria-label="Share"
                  onClick={() => navigator.share({ url: inviteUrl })}
                >
                  <ShareIcon />
                </IconButton>
              </Stack>
            </Stack>
          </DialogContent>
        </Dialog>
      </Container>
    </Stack>
  );
}

export default Lobby;
