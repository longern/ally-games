import { useAppSelector } from "../app/store";
import broadcastChannelPeer from "../peer/broadcastChannel";
import { Peer as PeerInterface } from "../peer/types";
import { createPeerFactory as createPeerWebRTCFactory } from "../peer/webrtc";
import { TurnServer } from "../app/settings";
import { useEffect, useState } from "react";

const cloudflareTurnTokenCache: Record<
  string,
  {
    ttl: number;
    iceServers: RTCIceServer;
    timestamp: number;
  }
> = {};

async function fetchCloudflareTurn(
  turnServer: Extract<TurnServer, { type: "cloudflare" }>
): Promise<RTCIceServer> {
  const cached =
    cloudflareTurnTokenCache[turnServer.keyId + turnServer.keyToken];
  if (cached) {
    if (Date.now() - cached.timestamp < cached.ttl * 1000) {
      return cached.iceServers;
    }
  }

  const timestamp = Date.now();
  const response = await fetch(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${turnServer.keyId}/credentials/generate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${turnServer.keyToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ttl: 86400 }),
    }
  );
  let text = await response.text();
  if (turnServer.customDomain)
    text = text.replaceAll("turn.cloudflare.com", turnServer.customDomain);
  const { iceServers } = JSON.parse(text) as { iceServers: RTCIceServer };
  cloudflareTurnTokenCache[turnServer.keyId + turnServer.keyToken] = {
    ttl: 86400,
    iceServers,
    timestamp,
  };
  return iceServers;
}

export function usePeerInterface() {
  const [peerInterface, setPeerInterface] = useState<PeerInterface | undefined>(
    undefined
  );
  const protocol = useAppSelector((state) => state.settings.protocol);
  const turnServers = useAppSelector((state) => state.settings.turnServers);

  useEffect(() => {
    switch (protocol) {
      case "broadcast-channel":
        setPeerInterface(broadcastChannelPeer);
        break;
      case "webrtc":
        {
          async function getRtcConfiguration() {
            const iceTurnServersSettled = await Promise.allSettled([
              ...(turnServers || [])
                .filter((turnServer) => !turnServer.disabled)
                .map((turnServer) =>
                  turnServer.type === "custom"
                    ? Promise.resolve({
                        urls: turnServer.urls,
                        username: turnServer.username,
                        credential: turnServer.credential,
                      })
                    : fetchCloudflareTurn(turnServer)
                ),
            ]);

            const iceTurnServers = iceTurnServersSettled
              .filter(
                (result): result is PromiseFulfilledResult<RTCIceServer> =>
                  result.status === "fulfilled"
              )
              .map((result) => result.value);

            return {
              iceServers: [
                { urls: ["stun:stun.cloudflare.com:3478"] },
                ...iceTurnServers,
              ],
            };
          }

          setPeerInterface(
            createPeerWebRTCFactory({
              rtcConfiguration: getRtcConfiguration,
            })
          );
        }
        break;
    }
  }, [protocol, turnServers]);

  return peerInterface;
}
