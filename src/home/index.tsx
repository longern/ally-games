import { Box, Button, Stack, TextField, Typography } from "@mui/material";
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

function Home() {
  const [joiningRoom, setJoiningRoom] = React.useState(false);
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
      )}
    </Box>
  );
}

export default Home;
