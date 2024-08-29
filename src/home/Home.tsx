import {
  People as PeopleIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import {
  Avatar,
  Backdrop,
  Box,
  CircularProgress,
  Container,
  Dialog,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import React, { useCallback } from "react";

import { createLobby } from "../app/middlewares/lobby";
import { useAppDispatch, useAppSelector } from "../app/store";
import SettingsDialog from "./SettingsDialog";
import { GameGrid, useGameList } from "./useGameList";
import { setLobbyState } from "../app/lobby";
import { usePeerInterface } from "./usePeerInterface";
import { lazyGameComponents } from "./router";

function ModeSelectDialog({
  open,
  onClose,
  onModeSelect,
}: {
  open: boolean;
  onClose: () => void;
  onModeSelect: (mode: string) => void;
}) {
  return (
    <Dialog open={open} onClose={onClose}>
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={() => onModeSelect("single")}>
            <ListItemIcon>
              <PersonIcon />
            </ListItemIcon>
            <ListItemText primary="Single Player" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={() => onModeSelect("multi")}>
            <ListItemIcon>
              <PeopleIcon />
            </ListItemIcon>
            <ListItemText primary="Multiplayer" />
          </ListItemButton>
        </ListItem>
      </List>
    </Dialog>
  );
}

function Home() {
  const [loading, setLoading] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [showModeSelect, setShowModeSelect] = React.useState(false);
  const [gameName, setGameName] = React.useState("");

  const nickname = useAppSelector((state) => state.settings.nickname);
  const peerInterface = usePeerInterface();
  const dispatch = useAppDispatch();

  const games = useGameList();

  const handleGameClick = useCallback(
    async (gameName: string) => {
      setLoading(true);
      try {
        const { game } = await lazyGameComponents[`/${gameName}`]();
        if (game.maxPlayers < 2) {
          dispatch(
            setLobbyState({ state: { game: gameName, matchRunning: true } })
          );
        } else if (game.minPlayers > 1) {
          await dispatch(
            createLobby({ hostName: nickname, Peer: peerInterface })
          ).unwrap();
          dispatch(setLobbyState({ state: { game: gameName } }));
        } else {
          setGameName(gameName);
          setShowModeSelect(true);
        }
      } catch (err) {
      } finally {
        setLoading(false);
      }
    },
    [dispatch, nickname, peerInterface]
  );

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
        <GameGrid games={games} onClick={handleGameClick} />
        <SettingsDialog
          open={showSettings}
          onClose={() => setShowSettings(false)}
        />
        <ModeSelectDialog
          open={showModeSelect}
          onClose={() => setShowModeSelect(false)}
          onModeSelect={(mode) => {
            setShowModeSelect(false);
            if (mode === "single") {
              dispatch(
                setLobbyState({
                  state: { game: gameName, matchRunning: true },
                })
              );
            } else {
              dispatch(
                createLobby({ hostName: nickname, Peer: peerInterface })
              );
              dispatch(setLobbyState({ state: { game: gameName } }));
            }
          }}
        />
        <Backdrop open={loading}>
          <CircularProgress />
        </Backdrop>
      </Container>
    </Stack>
  );
}

export default Home;
