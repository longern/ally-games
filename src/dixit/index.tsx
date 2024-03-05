import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardMedia,
  CircularProgress,
  Container,
  CssBaseline,
  GlobalStyles,
  Grid,
  Stack,
  TextField,
  ThemeProvider,
  createTheme,
} from "@mui/material";

import { GuessPicture } from "./game";
import { ParentSocket } from "../ParentSocket";
import { Client, GameBoardComponent } from "../Client";

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

function ImageGrid({
  pictures,
  selected,
  onSelectedChange,
}: {
  pictures: string[];
  selected?: number;
  onSelectedChange?: (i: number) => void;
}) {
  return (
    <div>
      <Grid container spacing={2}>
        {pictures.map((picture, i) => (
          <Grid item key={i} xs={6} md={4}>
            <Card
              variant="outlined"
              sx={{
                opacity: selected === undefined ? 1 : selected === i ? 1 : 0.3,
                transform:
                  selected !== undefined && selected !== i
                    ? "scale(0.9)"
                    : "none",
                transition: "opacity 0.2s, transform 0.2s",
              }}
            >
              <CardMedia sx={{ display: "flex", aspectRatio: 1 }}>
                <img
                  src={picture}
                  alt=""
                  width="512"
                  height="512"
                  onClick={() =>
                    onSelectedChange?.(selected !== i ? i : undefined)
                  }
                />
              </CardMedia>
            </Card>
          </Grid>
        ))}
      </Grid>
    </div>
  );
}

type GuessPictureBoardProps = Partial<
  Parameters<GameBoardComponent<typeof GuessPicture>>[0]
>;

function Upload({ G, moves, playerID }: GuessPictureBoardProps) {
  useEffect(() => {
    if (!G.players[playerID] || G.players[playerID].hand.length >= 6) return;
    Promise.all(
      Array.from({ length: 6 - G.players[playerID].hand.length }).map(() =>
        fetch(`https://picsum.photos/512/512`).then((res) => res.url)
      )
    ).then((pictures) => {
      moves.uploadPictures(pictures);
    });
  }, [G, playerID, moves]);

  return (
    <Stack
      sx={{
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <CircularProgress />
      <Stack alignItems="center" sx={{ padding: 2 }}>
        Drawing pictures...
      </Stack>
    </Stack>
  );
}

function Pick({ G, moves, playerID }: GuessPictureBoardProps) {
  const [selected, setSelected] = useState<number | undefined>(undefined);
  const [description, setDescription] = useState("");

  return (
    <Container maxWidth="md" sx={{ paddingY: 2 }}>
      {playerID === G.currentPlayer ? (
        <Stack spacing={2}>
          <ImageGrid
            pictures={G.players[playerID].hand}
            selected={selected}
            onSelectedChange={setSelected}
          />
          <TextField
            variant="standard"
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            inputProps={{ maxLength: 100 }}
          />
          <Stack alignItems="center">
            <Button
              variant="outlined"
              disabled={selected === undefined}
              onClick={() =>
                moves.pickPicture(
                  G.players[playerID].hand[selected],
                  description
                )
              }
            >
              OK
            </Button>
          </Stack>
        </Stack>
      ) : (
        <Stack spacing={2}>
          <ImageGrid pictures={G.players[playerID].hand} />
          <Stack alignItems="center" sx={{ padding: 2 }}>
            Waiting
          </Stack>
        </Stack>
      )}
    </Container>
  );
}

function Confuse({ G, moves, playerID }: GuessPictureBoardProps) {
  const [selected, setSelected] = useState<number | undefined>(undefined);

  return G.players[playerID].submission !== undefined ? (
    <Container maxWidth="md" sx={{ paddingY: 2 }}>
      <Stack alignItems="center">
        <img src={G.players[playerID].submission} alt="" />
        <Stack alignItems="center" sx={{ padding: 2 }}>
          {G.description}
        </Stack>
      </Stack>
    </Container>
  ) : (
    <Container maxWidth="md" sx={{ paddingY: 2 }}>
      <ImageGrid
        pictures={G.players[playerID].hand}
        selected={selected}
        onSelectedChange={setSelected}
      />
      <Stack alignItems="center" sx={{ padding: 2 }}>
        {G.description}
      </Stack>
      <Stack alignItems="center">
        <Button
          variant="outlined"
          disabled={selected === undefined}
          onClick={() =>
            moves.pickConfusingPicture(G.players[playerID].hand[selected])
          }
        >
          OK
        </Button>
      </Stack>
    </Container>
  );
}

function Guess({ G, moves, playerID }: GuessPictureBoardProps) {
  const [selected, setSelected] = useState<number | undefined>(undefined);

  return playerID === G.currentPlayer ? (
    <Container maxWidth="md" sx={{ paddingY: 2 }}>
      <ImageGrid pictures={G.board} />
      <Stack alignItems="center" sx={{ padding: 2 }}>
        Waiting
      </Stack>
    </Container>
  ) : (
    <Container maxWidth="md" sx={{ paddingY: 2 }}>
      <ImageGrid
        pictures={G.board}
        selected={selected}
        onSelectedChange={setSelected}
      />
      <Stack alignItems="center" sx={{ padding: 2 }}>
        {G.description}
      </Stack>
      <Stack alignItems="center">
        <Button
          variant="outlined"
          disabled={
            selected === undefined ||
            G.currentPlayer === playerID ||
            selected === G.players[playerID].boardIndex ||
            G.players[playerID].guess !== undefined
          }
          onClick={() => moves.guess(selected)}
        >
          OK
        </Button>
      </Stack>
    </Container>
  );
}

function Reveal({ G, moves, playerID }: GuessPictureBoardProps) {
  return (
    <Container maxWidth="md" sx={{ paddingY: 2 }}>
      <ImageGrid pictures={G.board} selected={G.mapping[G.currentPlayer]} />
      <Stack alignItems="center" sx={{ padding: 2 }}>
        {G.description}
      </Stack>
      {playerID === G.currentPlayer && (
        <Stack alignItems="center">
          <Button
            variant="outlined"
            onClick={() => {
              moves.nextRound();
            }}
          >
            OK
          </Button>
        </Stack>
      )}
    </Container>
  );
}

const GameBoard: GameBoardComponent<typeof GuessPicture> = function ({
  G,
  ctx,
  moves,
  playerID,
}) {
  return (
    <Stack direction="row" height="100%">
      <Box sx={{ width: 40, flexShrink: 0 }}>
        {ctx.playOrder.map((id, index) => (
          <Box
            key={id}
            sx={{
              padding: 1,
              width: id === G.currentPlayer ? "125%" : "100%",
              fontWeight: id === playerID ? "bold" : "normal",
              backgroundColor: COLORS[index],
              transition: "width 0.2s",
            }}
          >
            {G.scores[id]}
          </Box>
        ))}
      </Box>
      <Box sx={{ flexGrow: 1 }}>
        {G.stage === "upload" ? (
          <Upload G={G} moves={moves} playerID={playerID} />
        ) : G.stage === "pick" ? (
          <Pick G={G} moves={moves} playerID={playerID} />
        ) : G.stage === "confuse" ? (
          <Confuse G={G} moves={moves} playerID={playerID} />
        ) : G.stage === "guess" ? (
          <Guess G={G} moves={moves} playerID={playerID} />
        ) : G.stage === "reveal" ? (
          <Reveal G={G} moves={moves} playerID={playerID} />
        ) : (
          G.stage
        )}
      </Box>
    </Stack>
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
    styles={{
      "html, body, #root": {
        height: "100%",
      },

      img: {
        maxWidth: "100%",
        maxHeight: "100%",
      },
    }}
  />
);

function GameApp() {
  const socket = useSocket();

  const theme = useMemo(() => {
    return createTheme({
      typography: {
        button: {
          textTransform: "none",
        },
      },
    });
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {globalStyles}
      {socket && (
        <Client game={GuessPicture} board={GameBoard} socket={socket} />
      )}
    </ThemeProvider>
  );
}

export { GameApp as Component };
