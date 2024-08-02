import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import React, { useEffect } from "react";

import { createPeer } from "../peer/broadcastChannel";

function CreateRoom({ onClose }: { onClose: () => void }) {
  const [roomID, setRoomID] = React.useState("");

  useEffect(() => {
    const roomID = crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
    setRoomID(roomID);
  }, []);

  return (
    <Stack direction="row">
      <TextField value={roomID} fullWidth />
      <Button>Copy</Button>
    </Stack>
  );
}

function JoinRoom() {
  const [roomID, setRoomID] = React.useState("");

  const handleJoin = async () => {
    const peer = createPeer();
    const connection = await peer.connect(roomID);
    return connection;
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
  const [creatingRoom, setCreatingRoom] = React.useState(false);
  const [joiningRoom, setJoiningRoom] = React.useState(false);

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {creatingRoom ? (
        <CreateRoom onClose={() => setCreatingRoom(false)} />
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
            onClick={() => setCreatingRoom(true)}
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
