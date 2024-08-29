import { Connection, Peer } from "./types";

function adaptor(broadcastChannel: BroadcastChannel): Connection {
  return {
    addEventListener: (type: string, callback) => {
      broadcastChannel.addEventListener(type, callback);
    },
    removeEventListener: (type: string, callback) => {
      broadcastChannel.removeEventListener(type, callback);
    },
    send: (data) => {
      broadcastChannel.postMessage(data);
    },
    close: () => {
      broadcastChannel.close();
    },
  };
}

const broadcastChannelPeer: Peer = {
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

    const methods = {
      connect() {
        const randomChannel = crypto
          .getRandomValues(new Uint32Array(1))[0]
          .toString(36);

        const connection = new BroadcastChannel(randomChannel);
        connectionResolver(adaptor(connection));

        return randomChannel;
      },
    };

    const channelName = Math.random().toString(36).substring(7);
    const peer = new BroadcastChannel(channelName);

    peer.addEventListener("message", async (event) => {
      const data = JSON.parse(event.data);
      if (data.jsonrpc !== "2.0") return;
      if (!(data.method in methods)) return;
      const result = await methods[data.method](data.params);
      peer.postMessage(JSON.stringify({ jsonrpc: "2.0", result, id: data.id }));
    });

    abortController.signal.onabort = () => peer.close();

    idPromiseResolver(channelName);

    return {
      id: idPromise,
      connections: getConnections(),
      close: () => abortController.abort(),
    };
  },

  connect: (channelName) => {
    return new Promise((resolve, reject) => {
      const channel = new BroadcastChannel(channelName);
      channel.addEventListener("message", (event) => {
        const data = JSON.parse(event.data);
        if (data.jsonrpc !== "2.0") return;
        const connectionID: string = data.result;
        channel.close();
        const connection = new BroadcastChannel(connectionID);
        resolve(adaptor(connection));
      });
      channel.postMessage(
        JSON.stringify({ jsonrpc: "2.0", method: "connect" })
      );
      setTimeout(() => reject(new Error("Timeout")), 5000);
    });
  },
};

export default broadcastChannelPeer;
