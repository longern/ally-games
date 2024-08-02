export interface Socket {
  addEventListener: (
    type: "message",
    callback: (event: MessageEvent<string>) => any
  ) => void;
  removeEventListener: (
    type: "message",
    callback: (event: MessageEvent<string>) => void
  ) => void;
  send: (data: string) => void;
  close: () => void;
}
