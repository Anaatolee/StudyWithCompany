// Server-side helper for LiveKit token generation.
// Doc: https://docs.livekit.io/home/server/generating-tokens/

import { AccessToken } from "livekit-server-sdk";

function credentials() {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret)
    throw new Error("LIVEKIT_API_KEY or LIVEKIT_API_SECRET is not set");
  return { apiKey, apiSecret };
}

type TokenOptions = {
  roomName: string;
  participantName: string;
  participantIdentity: string;
  // canPublish controls ALL track publishing (video + audio).
  // Audio is locked client-side via audio={false} on LiveKitRoom.
  canPublish?: boolean;
  ttlSeconds?: number;
};

export async function createLiveKitToken(opts: TokenOptions): Promise<string> {
  const {
    roomName,
    participantName,
    participantIdentity,
    canPublish = true,
    ttlSeconds = 60 * 60 * 4,
  } = opts;

  const { apiKey, apiSecret } = credentials();

  const token = new AccessToken(apiKey, apiSecret, {
    identity: participantIdentity,
    name: participantName,
    ttl: ttlSeconds,
  });

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish,
    canSubscribe: true,
  });

  return token.toJwt();
}

export function livekitRoomName(roomId: string): string {
  return `study-${roomId}`;
}

export function livekitPrivateRoomName(callId: string): string {
  return `call-${callId}`;
}
