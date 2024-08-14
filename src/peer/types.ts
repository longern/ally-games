export interface Peer {
  open: (options: {
    onConnection: (connection: Connection) => void;
  }) => Promise<string>;
  connect: (roomID: string) => Promise<Connection>;
}

interface ConnectionEventMap {
  message: MessageEvent<string>;
  error: ErrorEvent;
  close: CloseEvent;
}

export interface Connection {
  addEventListener: <K extends keyof ConnectionEventMap>(
    type: K,
    callback: (event: ConnectionEventMap[K]) => void
  ) => void;
  removeEventListener: <K extends keyof ConnectionEventMap>(
    type: K,
    callback: (event: ConnectionEventMap[K]) => void
  ) => void;
  send: (data: string) => void;
  close: () => void;
}
