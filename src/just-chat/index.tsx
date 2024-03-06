import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Card,
  Container,
  CssBaseline,
  IconButton,
  Stack,
  TextField,
  ThemeProvider,
  Typography,
  createTheme,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";

import { ParentSocket } from "../ParentSocket";
import { Client, GameBoardComponent, makeGame } from "../Client";

const game = makeGame({ setup: () => ({}), moves: {} });

const GameBoard: GameBoardComponent<typeof game> = ({
  ctx,
  playerID,
  chatMessages,
  sendChatMessage,
}) => {
  const [userInput, setUserInput] = useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!userInput) return;
      sendChatMessage(userInput);
      setUserInput("");
    },
    [sendChatMessage, userInput]
  );

  return (
    <Stack sx={{ height: "100vh" }}>
      <Box sx={{ flexGrow: 1, overflowY: "auto" }}>
        <Container maxWidth="md" sx={{ paddingY: 1 }}>
          <Stack spacing={2}>
            {chatMessages.map((message) => (
              <Stack
                key={message.id}
                gap={1}
                sx={{
                  flexDirection:
                    message.sender !== playerID ? "row" : "row-reverse",
                  "&>*": { flexShrink: 0 },
                }}
              >
                <Avatar />
                <Stack
                  spacing="2px"
                  sx={{
                    flex: "1 1",
                    minWidth: 0,
                    alignItems: message.sender !== playerID ? "start" : "end",
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    sx={{
                      paddingX: "0.5em",
                      maxWidth: "100%",
                      overflow: "hidden",
                      textWrap: "nowrap",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {ctx.playerNames[message.sender] ?? message.sender}
                  </Typography>
                  <Card
                    sx={{
                      borderRadius: "4px",
                      padding: "0.5em 0.8em",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {message.payload}
                  </Card>
                </Stack>
                <Box sx={{ width: "56px" }} />
              </Stack>
            ))}
          </Stack>
        </Container>
      </Box>
      <Box sx={{ backgroundColor: (theme) => theme.palette.background.paper }}>
        <Container maxWidth="md">
          <form onSubmit={handleSubmit} autoComplete="off">
            <Stack direction="row" sx={{ paddingY: 1 }}>
              <TextField
                fullWidth
                size="small"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                InputProps={{
                  sx: { borderRadius: "20px" },
                  "aria-label": "Chat input",
                }}
              />
              <IconButton
                aria-label="Send"
                type="submit"
                sx={{ flexShrink: 0 }}
              >
                <SendIcon />
              </IconButton>
            </Stack>
          </form>
        </Container>
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

export function Component() {
  const socket = useSocket();

  const theme = useMemo(() => {
    return createTheme({
      palette: {
        background: {
          default: "#fafafa",
        },
      },
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
      {socket && <Client game={game} board={GameBoard} socket={socket} />}
    </ThemeProvider>
  );
}
