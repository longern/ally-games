import { Socket } from "./types";

function adaptor(broadcastChannel: BroadcastChannel): Socket {
  return {
    addEventListener: (type: "message", callback) => {
      broadcastChannel.addEventListener(type, callback);
    },
    removeEventListener: (type: "message", callback) => {
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

export function createPeer() {
  return {
    open({ onSocketOpen }: { onSocketOpen: (socket: Socket) => any }) {
      const methods = {
        open: (_: any) => {
          const randomChannel = Math.random().toString(36).substring(7);

          const connection = new BroadcastChannel(randomChannel);
          onSocketOpen(adaptor(connection));

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
        peer.postMessage(
          JSON.stringify({ jsonrpc: "2.0", result, id: data.id })
        );
      });
    },

    connect(channelName: string) {
      return new Promise<Socket>((resolve, reject) => {
        const channel = new BroadcastChannel(channelName);
        channel.addEventListener("message", (event) => {
          const data = JSON.parse(event.data);
          if (data.jsonrpc !== "2.0") return;
          const connectionID: string = data.result;
          channel.close();
          const connection = new BroadcastChannel(connectionID);
          resolve(adaptor(connection));
        });
        channel.postMessage(JSON.stringify({ jsonrpc: "2.0", method: "open" }));
        setTimeout(() => reject(new Error("timeout")), 5000);
      });
    },
  };
}
