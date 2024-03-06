import React, { useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  Container,
  Dialog,
  DialogActions,
  DialogTitle,
  GlobalStyles,
  Grid,
  Stack,
} from "@mui/material";
import CrisisAlertIcon from "@mui/icons-material/CrisisAlert";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import PersonIcon from "@mui/icons-material/Person";
import StorageIcon from "@mui/icons-material/Storage";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import VideocamIcon from "@mui/icons-material/Videocam";

import { Client, GameBoardComponent } from "../Client";
import game, { GameAction } from "./game";
import { ParentSocket } from "../ParentSocket";

const COLORS = [
  "#f44336",
  "#8bc34a",
  "#03a9f4",
  "#ffeb3b",
  "#ff9800",
  "#be44d3",
  "#f39fae",
  "#966959",
  "#50c8d7",
  "#9b9a9a",
];

export const GameBoard: GameBoardComponent<typeof game> = ({
  G,
  ctx,
  moves,
  playerID,
}) => {
  const me = G.players[playerID];

  const actionIcons = {
    emergency: <CrisisAlertIcon fontSize="large" />,
    vote: <HowToVoteIcon fontSize="large" />,
    monitor: <VideocamIcon fontSize="large" />,
    trade: <SwapHorizIcon fontSize="large" />,
    vault: <StorageIcon fontSize="large" />,
  } as Record<GameAction, React.ReactNode>;

  const handleClickAvatar = (id: string) => {
    if (G.stage !== "action") return;
    switch (G.actionStage) {
      case "vote":
        moves.vote(id);
        break;
      case "monitor":
        moves.monitor(id);
        break;
      case "trade":
        moves.tradePickPlayer(id);
        break;
    }
  };

  console.log(G);

  return (
    <Container maxWidth="md" sx={{ height: "100%" }}>
      <Stack sx={{ height: "100%" }}>
        <Grid container sx={{ paddingY: 2 }}>
          {ctx.playOrder.map((id, index) => (
            <Grid
              item
              key={id}
              xs={4}
              md={3}
              sx={{
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Card elevation={0} sx={{ background: "none" }}>
                <CardActionArea onClick={() => handleClickAvatar(id)}>
                  <Stack
                    spacing={1}
                    sx={{
                      margin: 2,
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <Avatar sx={{ bgcolor: COLORS[index] }}>
                      <PersonIcon />
                    </Avatar>
                    <Box
                      sx={{
                        color: me.outlierInSight === id ? "red" : undefined,
                      }}
                    >
                      {ctx.playerNames[id] ?? id}
                    </Box>
                  </Stack>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
        <Stack
          sx={{
            flexGrow: 1,
            alignSelf: "center",
            justifyContent: "center",
            width: 256,
          }}
        >
          {Object.entries(actionIcons).map(
            ([action, icon]: [GameAction, React.ReactNode]) => (
              <Stack key={action} direction="row">
                <Button
                  sx={{
                    color: me.action === action ? "primary.main" : "inherit",
                  }}
                  onClick={() => moves.decideAction(action)}
                >
                  {icon}
                </Button>
                <Stack
                  sx={{
                    flexGrow: 1,
                    minWidth: 0,
                    flexDirection: "row",
                    justifyContent: "space-evenly",
                    alignItems: "center",
                    "&>*:first-child": { flexShrink: 0 },
                  }}
                >
                  {ctx.playOrder.map(
                    (id, index) =>
                      G.pub[id].action === action && (
                        <Box
                          key={id}
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            backgroundColor: COLORS[index],
                          }}
                        />
                      )
                  )}
                </Stack>
              </Stack>
            )
          )}
        </Stack>
        <Stack
          direction="row"
          sx={{ justifyContent: "center", "&>*:last-child": { flexShrink: 0 } }}
        >
          {me.hand.map((card, i) => (
            <Card key={i} variant="outlined">
              <CardActionArea>
                <PersonIcon
                  sx={{
                    color: COLORS[card],
                    fontSize: 72,
                    margin: "24px 12px",
                  }}
                />
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      </Stack>
      <Dialog open={me.handInSight !== undefined}>
        <DialogTitle>
          Hand of {ctx.playerNames[G.targets[playerID]] ?? G.targets[playerID]}
        </DialogTitle>
        <Stack
          direction="row"
          sx={{
            margin: 2,
            justifyContent: "center",
            "&>*:last-child": { flexShrink: 0 },
          }}
        >
          {me.hand.map((card, i) => (
            <Card key={i} variant="outlined">
              <CardActionArea>
                <PersonIcon
                  sx={{
                    color: COLORS[card],
                    fontSize: 72,
                    margin: "24px 12px",
                  }}
                />
              </CardActionArea>
            </Card>
          ))}
        </Stack>
        <DialogActions>
          <Button onClick={() => moves.monitorConclude()}>Next step</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

function useSocket() {
  const [socket, setSocket] = useState<ParentSocket | null>(null);

  useEffect(() => {
    const socket = new ParentSocket();
    setSocket(socket);
    return () => {
      socket.close();
    };
  }, []);

  return socket;
}

const globalStyles = (
  <GlobalStyles
    styles={{ "html, body, #root": { height: "100%" }, body: { margin: 0 } }}
  />
);

export function Component() {
  const socket = useSocket();

  return (
    <>
      {globalStyles}
      {socket && <Client game={game} board={GameBoard} socket={socket} />}
    </>
  );
}
