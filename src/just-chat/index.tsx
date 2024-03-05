import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  CssBaseline,
  Stack,
  ThemeProvider,
  createTheme,
} from "@mui/material";

import { ParentSocket } from "../ParentSocket";
import { Client, GameBoardComponent, makeGame } from "../Client";

const game = makeGame({ setup: () => ({}), moves: {} });

const GameBoard: GameBoardComponent<typeof game> = ({
  playerID,
  chatMessages,
  sendChatMessage,
}) => {
  return (
    <Stack>
      <Stack sx={{ flexGrow: 1, overflowY: "auto" }}>
        {chatMessages.map((message) => (
          <div key={message.id}>
            {message.sender}: {message.payload}
          </div>
        ))}
      </Stack>
      <Button sx={{ flexShrink: 0 }} onClick={() => sendChatMessage("test")}>
        Send
      </Button>
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
