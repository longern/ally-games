import React, { useEffect, useState } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardActionArea,
  CardMedia,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  GlobalStyles,
  Grid,
  Stack,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CrisisAlertIcon from "@mui/icons-material/CrisisAlert";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import PersonIcon from "@mui/icons-material/Person";
import StorageIcon from "@mui/icons-material/Storage";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import VideocamIcon from "@mui/icons-material/Videocam";

import { Client, GameBoardComponent } from "../Client";
import game, { BLANK_CARD, GameAction, WILD_CARD } from "./game";
import { ParentSocket } from "../ParentSocket";
import i18n from "./i18n";
import ScoreTable from "./ScoreTable";
import { COLORS } from "./utils";

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
      sx={{
        transform: selected ? "translateY(-20%)" : undefined,
        transition: "transform 0.2s",
      }}
    >
      <CardActionArea onClick={onClick}>
        <Box
          sx={{
            width: 72,
            height: 72,
            margin: "24px 12px",
            maskImage: "url(/outliar/logo192.png)",
            maskSize: "contain",
            background:
              card === WILD_CARD
                ? "linear-gradient(45deg, #f44336, #ffeb3b, #03a9f4, #8bc34a, #ff9800, #f44336)"
                : card === BLANK_CARD
                ? "transparent"
                : COLORS[card],
          }}
        />
      </CardActionArea>
    </Card>
  );
}

type OutliarBoardProps = Partial<
  Parameters<GameBoardComponent<typeof game>>[0]
>;

function GameHint({ G, moves, playerID }: OutliarBoardProps) {
  const { t } = useTranslation();

  const me = G.players[playerID];
  const waitingText = t("Waiting for other players...");
  return G.phase === "vote" ? (
    Object.values(G.pub).some((p) => p.vote === undefined) ? (
      me.vote === undefined ? (
        t("Choose a card")
      ) : (
        waitingText
      )
    ) : (
      <Button variant="contained" onClick={() => moves.voteConclude()}>
        {t("Next step")}
      </Button>
    )
  ) : G.phase === "forced-trade" ? (
    me.action === "vote" ? (
      G.players[playerID].target === undefined ? (
        t("Choose a player")
      ) : (
        t("Choose a card")
      )
    ) : (
      waitingText
    )
  ) : G.phase === "videocam" ? (
    me.action === "videocam" && G.players[playerID].target === undefined ? (
      t("Choose a player")
    ) : (
      me.handInSight === undefined && waitingText
    )
  ) : G.phase === "trade" ? (
    me.action === "trade" ? (
      G.players[playerID].target === undefined ? (
        t("Choose a player")
      ) : me.faceDown.length === 0 ? (
        t("Choose a card")
      ) : (
        waitingText
      )
    ) : (
      waitingText
    )
  ) : G.phase === "trade-response" ? (
    me.target !== undefined ? (
      t("Choose a card")
    ) : (
      waitingText
    )
  ) : G.phase === "vault" ? (
    me.action === "vault" && !G.pub[playerID].done ? (
      t("Choose a card")
    ) : (
      waitingText
    )
  ) : G.phase === "conclude" ? null : null;
}

function PlayerGrid({ G, ctx, moves, playerID }: OutliarBoardProps) {
  const me = G.players[playerID];

  const handleClickAvatar = (id: string) => {
    switch (G.phase) {
      case "forced-trade":
        moves.pickPlayer(id);
        break;
      case "videocam":
        moves.pickPlayer(id);
        break;
      case "trade":
        moves.pickPlayer(id);
        break;
    }
  };

  return (
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
            elevation={G.players[playerID].target === id ? 8 : 0}
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
                <Badge
                  invisible={G.pub[id].done === undefined}
                  badgeContent={
                    G.pub[id].done === undefined ? null : G.pub[id].done ? (
                      <CheckIcon color="inherit" />
                    ) : (
                      <MoreHorizIcon />
                    )
                  }
                  sx={{
                    ".MuiBadge-badge": {
                      backgroundColor:
                        G.pub[id].target !== undefined
                          ? COLORS[ctx.playOrder.indexOf(G.pub[id].target)]
                          : "black",
                      color: "white",
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      padding: 0,
                    },
                  }}
                >
                  <Avatar sx={{ bgcolor: COLORS[index] }}>
                    <PersonIcon />
                  </Avatar>
                </Badge>
                <Box
                  sx={
                    me.outliarInSight === id
                      ? { color: "red", fontWeight: "bold" }
                      : undefined
                  }
                >
                  {ctx.playerNames[id] ?? id}
                </Box>
              </Stack>
            </CardActionArea>
            {(G.pub[id].vote !== undefined ||
              (id === playerID && G.players[id].vote !== undefined)) && (
              <Box
                sx={{
                  position: "absolute",
                  left: 10,
                  bottom: -10,
                  transform: "scale(0.35)",
                }}
              >
                <GameCard
                  card={
                    G.pub[id].vote ?? (id === playerID && G.players[id].vote)
                  }
                />
              </Box>
            )}
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

const GameBoard: GameBoardComponent<typeof game> = ({
  G,
  ctx,
  moves,
  playerID,
}) => {
  const [showScores, setShowScores] = useState(false);

  const { t } = useTranslation();

  const me = G.players[playerID];

  const actionIcons = {
    emergency: <CrisisAlertIcon fontSize="large" />,
    vote: <HowToVoteIcon fontSize="large" />,
    videocam: <VideocamIcon fontSize="large" />,
    trade: <SwapHorizIcon fontSize="large" />,
    vault: <StorageIcon fontSize="large" />,
  } as Record<GameAction, React.ReactNode>;

  const handleClickCard = (index: number) => {
    const card = me.hand[index];
    switch (G.phase) {
      case "vote":
        moves.vote(index);
        break;
      case "forced-trade":
        moves.pickCard(card);
        break;
      case "trade":
        moves.pickCard(card);
        break;
      case "trade-response":
        moves.pickCard(card);
        break;
      case "vault":
        moves.vault(card);
        break;
    }
  };

  const handleClickOthersCard = (index: number) => {
    if (G.phase !== "forced-trade") return;
    moves.pickOtherCard(me.handInSight![index]);
  };

  useEffect(() => {
    if (G.phase !== "conclude") {
      setShowScores(false);
      return;
    }
    setTimeout(() => {
      setShowScores(true);
    }, 2000);
    return () => {
      setShowScores(false);
    };
  }, [G.phase]);

  if (process.env.NODE_ENV === "development") console.log(G);

  const currentActionIndex = [
    ["emergency"],
    ["vote", "forced-trade"],
    ["videocam"],
    ["trade", "trade-response"],
    ["vault"],
  ].findIndex((value) => value.includes(G.phase));
  const ActionIndicator =
    currentActionIndex === -1 ? null : (
      <Box
        sx={{
          position: "absolute",
          height: "100%",
          transform: `translate(-100%, ${currentActionIndex * 100}%)`,
          transition: "transform 0.2s",
        }}
      >
        <NavigateNextIcon fontSize="large" />
      </Box>
    );

  return (
    <Container maxWidth="md" sx={{ height: "100%", padding: 1 }}>
      <Stack sx={{ height: "100%" }}>
        <PlayerGrid G={G} ctx={ctx} moves={moves} playerID={playerID} />
        <Stack
          sx={{
            flexGrow: 1,
            alignSelf: "center",
            justifyContent: "center",
            width: 256,
          }}
        >
          {Object.entries(actionIcons).map(
            ([action, icon]: [GameAction, React.ReactNode], actionIndex) => (
              <Stack
                key={action}
                direction="row"
                sx={{ padding: 1, position: "relative" }}
              >
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
                {actionIndex === 0 && ActionIndicator}
              </Stack>
            )
          )}
        </Stack>
        <Stack
          sx={{
            height: "48px",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <GameHint G={G} moves={moves} playerID={playerID} />
        </Stack>
        <Stack
          direction="row"
          sx={{
            justifyContent: "center",
            minHeight: 120,
            "&>*:last-child": { flexShrink: 0 },
          }}
        >
          {me.hand.map((card, i) => (
            <GameCard key={i} card={card} onClick={() => handleClickCard(i)} />
          ))}
        </Stack>
      </Stack>

      <Dialog open={G.phase === "decide"}>
        <DialogTitle>{t("Choose an action")}</DialogTitle>
        <Grid container spacing={1} sx={{ paddingX: 2, paddingBottom: 2 }}>
          {Object.entries(actionIcons).map(
            ([action, icon]: [GameAction, React.ReactNode]) => (
              <Grid item key={action} xs={4}>
                <Card elevation={me.action === action ? 4 : 0}>
                  <CardActionArea
                    disabled={me.action !== undefined}
                    onClick={() => moves.decideAction(action)}
                    sx={{ textAlign: "center", paddingY: 1 }}
                  >
                    <CardMedia>{icon}</CardMedia>
                    {t(action[0].toUpperCase() + action.slice(1))}
                  </CardActionArea>
                </Card>
              </Grid>
            )
          )}
        </Grid>
      </Dialog>

      <Dialog open={me.handInSight !== undefined}>
        <DialogTitle>
          {t("hand-of", {
            player:
              ctx.playerNames[G.players[playerID].target] ??
              G.players[playerID].target,
          })}
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
        {G.phase === "videocam" && (
          <DialogActions>
            <Button onClick={() => moves.videocamConclude()}>OK</Button>
          </DialogActions>
        )}
      </Dialog>

      <Dialog open={showScores}>
        <DialogContent>
          <ScoreTable G={G} ctx={ctx} />
        </DialogContent>
        <DialogActions>
          {playerID === me.outliarInSight ? (
            <Button variant="contained" onClick={() => moves.nextRound()}>
              {t("Next round")}
            </Button>
          ) : (
            t("Waiting for next round...")
          )}
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
    <I18nextProvider i18n={i18n}>
      {globalStyles}
      {socket && <Client game={game} board={GameBoard} socket={socket} />}
    </I18nextProvider>
  );
}
