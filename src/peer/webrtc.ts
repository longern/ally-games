import { Connection, Peer } from "./types";

interface FlarePeerClient {
  open(params?: { key?: string }): Promise<{ id: string; token: string }>;

  reconnect(params: { id: string; token: string }): Promise<void>;

  destroy(): Promise<void>;

  send(params: {
    type: "offer" | "answer" | "ice-candidate";
    id: string;
    content: string;
  }): Promise<void>;

  poll(): Promise<
    Array<{
      type: "offer" | "answer" | "ice-candidate";
      source: string;
      content: string;
    }>
  >;
}

type AsyncReturnType<T extends (...args: any) => Promise<any>> = T extends (
  ...args: any
) => Promise<infer R>
  ? R
  : any;

function waitICEGathering(peerConnection: RTCPeerConnection) {
  return new Promise<RTCSessionDescription>((resolve) => {
    setTimeout(function () {
      resolve(peerConnection.localDescription);
    }, 1000);
    peerConnection.onicegatheringstatechange = (_ev) =>
      peerConnection.iceGatheringState === "complete" &&
      resolve(peerConnection.localDescription);
  });
}

function getRemoteCaller<M extends object>(ws: WebSocket) {
  const promises: Record<
    string,
    { resolve: (value: any) => void; reject: (reason: any) => void }
  > = {};
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.jsonrpc !== "2.0" || !message.id) return;
    if (message.error) {
      promises[message.id].reject(message.error);
    } else {
      promises[message.id].resolve(message.result);
    }
  });
  return new Proxy({} as M, {
    get(_, method: string) {
      return (...args: any[]) => {
        if (args.length === 1 && typeof args[0] === "object") args = args[0];
        const id = crypto.getRandomValues(new Uint32Array(1))[0].toString();
        ws.send(JSON.stringify({ jsonrpc: "2.0", method, params: args, id }));
        return new Promise((resolve, reject) => {
          promises[id] = { resolve, reject };
        });
      };
    },
  });
}

function signalMessageHandler(
  remoteCaller: FlarePeerClient,
  onConnection: (connection: Connection) => void
) {
  return async (message: AsyncReturnType<FlarePeerClient["poll"]>[number]) => {
    const { type, source, content } = message;
    switch (type) {
      case "offer": {
        const connection = new RTCPeerConnection();
        await connection.setRemoteDescription({ type: "offer", sdp: content });
        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);
        const { sdp } = await waitICEGathering(connection);
        remoteCaller.send({ type: "answer", id: source, content: sdp });
        connection.addEventListener("datachannel", (event) => {
          onConnection({
            send: (data: string) => event.channel.send(data),
            addEventListener: event.channel.addEventListener.bind(
              event.channel
            ),
            removeEventListener: event.channel.removeEventListener.bind(
              event.channel
            ),
            close: () => connection.close(),
          });
        });
        break;
      }
    }
  };
}

const DEFAULT_SIGNAL_SERVER_URL = "wss://peer.longern.com";

export const createPeerFactory: (options?: {
  signalServerURL?: string;
  rtcConfiguration?: RTCConfiguration;
}) => Peer = (options) => {
  options = options || {};
  const signalServerURL = options.signalServerURL || DEFAULT_SIGNAL_SERVER_URL;

  return {
    listen() {
      const abortController = new AbortController();

      let idPromiseResolver: (value: string | PromiseLike<string>) => void;
      const idPromise = new Promise<string>((resolve) => {
        idPromiseResolver = resolve;
      });

      let connectionResolver: (
        value: Connection | PromiseLike<Connection>
      ) => void;
      const createConnectionResolver = () =>
        new Promise<Connection>((resolve) => {
          connectionResolver = resolve;
        });
      async function* getConnections() {
        while (abortController.signal.aborted === false)
          yield await createConnectionResolver();
      }

      const ws = new WebSocket(signalServerURL);
      const remoteCaller = getRemoteCaller<FlarePeerClient>(ws);
      let interval: ReturnType<typeof setInterval>;

      async function pollMessages() {
        const messages = await remoteCaller.poll().catch(() => []);
        messages.forEach(
          signalMessageHandler(remoteCaller, connectionResolver)
        );
      }

      ws.addEventListener("open", async () => {
        const { id } = await remoteCaller.open(undefined);
        idPromiseResolver(id);

        interval = setInterval(pollMessages, 5000);

        ws.addEventListener("close", () => clearInterval(interval));
      });

      abortController.signal.onabort = () => ws.close();

      return {
        id: idPromise,
        connections: getConnections(),
        abort: () => abortController.abort(),
      };
    },

    async connect(channelName) {
      const ws = new WebSocket(signalServerURL);
      const remoteCaller = getRemoteCaller<FlarePeerClient>(ws);

      await new Promise((resolve) => ws.addEventListener("open", resolve));
      await remoteCaller.open();
      const peerConnection = new RTCPeerConnection(options.rtcConfiguration);
      const dataChannel = peerConnection.createDataChannel("data");
      await peerConnection.setLocalDescription(
        await peerConnection.createOffer()
      );
      const { sdp } = await waitICEGathering(peerConnection);
      remoteCaller.send({ type: "offer", id: channelName, content: sdp });

      const interval = setInterval(async () => {
        const messages = await remoteCaller.poll().catch(() => []);
        for (const message of messages) {
          const { type, source, content } = message;
          if (source !== channelName) continue;
          switch (type) {
            case "answer": {
              await peerConnection.setRemoteDescription({
                type: "answer",
                sdp: content,
              });
              break;
            }
          }
        }
      }, 5000);

      return new Promise((resolve) => {
        dataChannel.addEventListener("open", () => {
          clearInterval(interval);
          resolve({
            send: (data) => dataChannel.send(data),
            addEventListener: dataChannel.addEventListener.bind(dataChannel),
            removeEventListener:
              dataChannel.removeEventListener.bind(dataChannel),
            close: () => {
              dataChannel.close();
              peerConnection.close();
            },
          });
        });
      });
    },
  };
};
