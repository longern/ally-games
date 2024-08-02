import { Socket } from "./types";

export function movesWrapper({
  isHost,
  socket,
}: {
  isHost: boolean;
  socket?: Socket;
}) {
  if (isHost) {
    return function <T extends object>(moves: T) {
      socket.addEventListener("message", async (event) => {
        const data = JSON.parse(event.data);
        if (data.jsonrpc !== "2.0") return;
        if (!(data.method in moves)) return;
        await moves[data.method](data.params);
      });

      return moves;
    };
  }

  return function <T extends object>(moves: T) {
    return new Proxy({} as T, {
      get(_, prop) {
        return function (...args: any[]) {
          socket.send(
            JSON.stringify({ jsonrpc: "2.0", method: prop, params: args })
          );
        };
      },
    });
  };
}
