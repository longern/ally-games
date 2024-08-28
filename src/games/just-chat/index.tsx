import SendIcon from "@mui/icons-material/Send";
import {
  Avatar,
  Box,
  Card,
  Container,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import React, { useCallback, useState } from "react";

import { GameBoardComponent } from "../../Client";
import { createGame } from "../../app/game";

export const game = createGame({ setup: () => ({}), moves: {}, minPlayers: 2 });

interface Message {
  text: string;
  createdAt: string; // ISO 8601 string
  metadata?: Record<string, unknown>;
}

function MessageCard({
  message,
}: {
  message: { id: string; payload: Message };
}) {
  return (
    <Card
      sx={{
        borderRadius: "4px",
        padding: "0.5em 0.8em",
        overflowWrap: "anywhere",
      }}
    >
      {message.payload.text}
    </Card>
  );
}

export const Board: GameBoardComponent<typeof game> = ({
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
      const message: Message = {
        text: userInput,
        createdAt: new Date().toISOString(),
      };
      sendChatMessage(message);
      setUserInput("");
    },
    [sendChatMessage, userInput]
  );

  return (
    <Stack sx={{ height: "100%" }}>
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
                  <MessageCard message={message} />
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
