import {
  Box,
  Button,
  Dialog,
  DialogContent,
  Stack,
  Typography,
} from "@mui/material";
import React, { useEffect } from "react";

import { chooseGame, getReady, startGame } from "../app/lobby";
import { useAppDispatch, useAppSelector } from "../app/store";

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
  const inviteUrl = `${window.location.origin}/p=?${inviteSearchParam}`;

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 2,
      }}
    >
      <Stack spacing={2} sx={{ maxWidth: "100%" }}>
        <Stack direction="row">
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
          <Button onClick={() => navigator.clipboard.writeText(lobby.roomID)}>
            Copy
          </Button>
        </Stack>
        <Typography variant="body1">
          {lobby.playOrder.length} players
        </Typography>
        <Stack direction="row" spacing={2}>
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
    </Box>
  );
}

export default Lobby;
