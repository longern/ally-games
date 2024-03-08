import React, { useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardMedia,
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

function GameCard({
  card,
  selected,
  onClick,
}: {
  card: number;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <Card
      variant="outlined"
      sx={{ transform: selected ? "translateY(-20%)" : undefined }}
    >
      <CardActionArea onClick={onClick}>
        <PersonIcon
          sx={{
            fontSize: 73,
            margin: "24px 12px",
            ...(card === -2
              ? { color: "black" }
              : card === -1
              ? { visibility: "hidden" }
              : { color: COLORS[card] }),
          }}
        />
      </CardActionArea>
    </Card>
  );
}

export const GameBoard: GameBoardComponent<typeof game> = ({
  G,
  ctx,
  moves,
  playerID,
}) => {
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [showScores, setShowScores] = useState(false);

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
        if (
          Object.entries(G.players).every(
            ([id, player]) =>
              (id === playerID && player.action === "vote") ||
              player.action !== "vote"
          )
        )
          moves.forcedTradePickPlayer(id);
        break;
      case "monitor":
        moves.monitor(id);
        break;
      case "trade":
        moves.tradePickPlayer(id);
        break;
    }
  };

  const handleClickCard = (index: number) => {
    if (G.stage !== "action") return;
    const card = me.hand[index];
    switch (G.actionStage) {
      case "vote":
        if (
          Object.entries(G.players).every(
            ([id, player]) =>
              (id === playerID && player.action === "vote") ||
              player.action !== "vote"
          )
        )
          moves.forcedTradePickCard(card);
        else moves.vote(card);
        break;
      case "trade":
        moves.tradePickCard(card);
        break;
      case "trade-response":
        const tradePlayers = ctx.playOrder.filter(
          (id) => G.pub[id].action === "trade"
        );
        const responsesRequired = tradePlayers.filter(
          (id) => G.targets[id] === playerID
        ).length;
        if (responsesRequired === 0) return;
        const nextSelectedCards = selectedCards.includes(index)
          ? selectedCards.filter((i) => i !== index)
          : [...selectedCards, index];
        setSelectedCards(nextSelectedCards);
        if (nextSelectedCards.length === responsesRequired) {
          moves.tradePickResponse(nextSelectedCards.map((i) => me.hand[i]));
          setSelectedCards([]);
        }
        break;
      case "vault":
        moves.vault(card);
        break;
    }
  };

  const handleClickOthersCard = (index: number) => {
    if (G.actionStage !== "vote") return;
    const card = me.handInSight![index];
    moves.forcedTradePickOtherCard(card);
  };

  useEffect(() => {
    if (G.stage !== "conclude") return;
    setTimeout(() => {
      setShowScores(true);
    }, 1000);
    return () => {
      setShowScores(false);
    };
  }, [G.stage]);

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
              <Card
                elevation={0}
                sx={{ background: "none", position: "relative" }}
              >
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
                      {": "}
                      {G.pub[id].score}
                      {showScores && (
                        <>
                          {G.pub[id].roundScore >= 0 ? "+" : ""}
                          {G.pub[id].roundScore}
                        </>
                      )}
                    </Box>
                  </Stack>
                </CardActionArea>
                {G.pub[id].vote !== undefined && (
                  <Box
                    sx={{
                      position: "absolute",
                      left: 10,
                      bottom: -10,
                      transform: "scale(0.35)",
                    }}
                  >
                    <GameCard card={G.pub[id].vote} />
                  </Box>
                )}
              </Card>
            </Grid>
          ))}
        </Grid>
        <Stack
          spacing={2}
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
                {icon}
                <Stack
                  sx={{
                    flexGrow: 1,
                    minWidth: 0,
                    flexDirection: "row",
                    justifyContent: "space-evenly",
                    alignItems: "center",
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
                            ":first-of-type": { flexShrink: 0 },
                          }}
                        />
                      )
                  )}
                </Stack>
              </Stack>
            )
          )}
        </Stack>
        {G.actionStage === "vote" &&
          me.action === "vote" &&
          Object.values(G.pub).every((p) => p.vote !== undefined) && (
            <Stack sx={{ marginY: 1, alignItems: "center" }}>
              <Button variant="contained" onClick={() => moves.voteConclude()}>
                Next step
              </Button>
            </Stack>
          )}
        {G.stage === "conclude" &&
          showScores &&
          playerID === me.outlierInSight && (
            <Stack sx={{ marginY: 1, alignItems: "center" }}>
              <Button variant="contained" onClick={() => moves.nextRound()}>
                Next step
              </Button>
            </Stack>
          )}
        <Stack
          direction="row"
          sx={{ justifyContent: "center", "&>*:last-child": { flexShrink: 0 } }}
        >
          {me.hand.map((card, i) => (
            <GameCard
              key={i}
              card={card}
              selected={selectedCards.includes(i)}
              onClick={() => handleClickCard(i)}
            />
          ))}
        </Stack>
      </Stack>

      <Dialog open={G.stage === "decide"}>
        <DialogTitle>Determine the action</DialogTitle>
        <Grid container spacing={2} sx={{ padding: 2 }}>
          {Object.entries(actionIcons).map(
            ([action, icon]: [GameAction, React.ReactNode]) => (
              <Grid item key={action} xs={4}>
                <Card elevation={me.action === action ? 8 : 0}>
                  <CardActionArea
                    disabled={me.action !== undefined}
                    onClick={() => moves.decideAction(action)}
                    sx={{ textAlign: "center", paddingY: 2 }}
                  >
                    <CardMedia>{icon}</CardMedia>
                    {action[0].toUpperCase() + action.slice(1)}
                  </CardActionArea>
                </Card>
              </Grid>
            )
          )}
        </Grid>
      </Dialog>

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
          {(me.handInSight ?? []).map((card, i) => (
            <GameCard
              key={i}
              card={card}
              onClick={() => handleClickOthersCard(i)}
            />
          ))}
        </Stack>
        {G.actionStage === "monitor" && (
          <DialogActions>
            <Button onClick={() => moves.monitorConclude()}>Next step</Button>
          </DialogActions>
        )}
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
