// Server-side helpers for the Daily.co REST API.
// Doc: https://docs.daily.co/reference/rest-api

const API_BASE = "https://api.daily.co/v1";

function apiKey() {
  const key = process.env.DAILY_API_KEY;
  if (!key) throw new Error("DAILY_API_KEY is not set");
  return key;
}

type DailyRoom = {
  id: string;
  name: string;
  url: string;
  created_at: string;
  privacy: "public" | "private";
};

type CreateRoomOptions = {
  name?: string;
  privacy?: "public" | "private";
  expiresInSeconds?: number;
};

export async function createDailyRoom(
  options: CreateRoomOptions = {}
): Promise<DailyRoom> {
  const {
    name,
    privacy = "private",
    expiresInSeconds,
  } = options;

  const exp = expiresInSeconds
    ? Math.floor(Date.now() / 1000) + expiresInSeconds
    : undefined;

  const res = await fetch(`${API_BASE}/rooms`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      privacy,
      properties: {
        enable_chat: false,
        enable_screenshare: true,
        start_video_off: false,
        start_audio_off: true,
        enable_prejoin_ui: false,
        ...(exp ? { exp } : {}),
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Daily createRoom failed: ${res.status} ${text}`);
  }

  return res.json();
}

async function getDailyRoom(name: string): Promise<DailyRoom | null> {
  const res = await fetch(`${API_BASE}/rooms/${name}`, {
    headers: { Authorization: `Bearer ${apiKey()}` },
  });
  if (res.ok) return res.json();
  if (res.status === 404) return null;
  const text = await res.text();
  throw new Error(`Daily getRoom failed: ${res.status} ${text}`);
}

export async function getOrCreateDailyRoom(
  name: string,
  options: CreateRoomOptions = {}
): Promise<DailyRoom> {
  const existing = await getDailyRoom(name);
  if (existing) return existing;

  // Room doesn't exist — create it. If a concurrent request beat us to it,
  // Daily returns 400 "already exists"; we fetch it and return it instead.
  const res = await fetch(`${API_BASE}/rooms`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      privacy: options.privacy ?? "private",
      properties: {
        enable_chat: false,
        enable_screenshare: true,
        start_video_off: false,
        start_audio_off: true,
        enable_prejoin_ui: false,
      },
    }),
  });

  if (res.ok) return res.json();

  const text = await res.text();
  if (res.status === 400 && text.includes("already exists")) {
    // Race condition: room was created between our GET and POST. Fetch it.
    const room = await getDailyRoom(name);
    if (room) return room;
  }

  throw new Error(`Daily createRoom failed: ${res.status} ${text}`);
}

type CreateTokenOptions = {
  roomName: string;
  userId: string;
  userName: string;
  isOwner?: boolean;
  startAudioOff?: boolean;
  expiresInSeconds?: number;
};

export async function createDailyMeetingToken(
  options: CreateTokenOptions
): Promise<string> {
  const {
    roomName,
    userId,
    userName,
    isOwner = false,
    startAudioOff = true,
    expiresInSeconds = 60 * 60 * 4,
  } = options;

  const res = await fetch(`${API_BASE}/meeting-tokens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_id: userId,
        user_name: userName,
        is_owner: isOwner,
        exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
        start_audio_off: startAudioOff,
        start_video_off: false,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Daily createToken failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as { token: string };
  return json.token;
}

export function dailyRoomUrl(roomName: string): string {
  const domain = process.env.NEXT_PUBLIC_DAILY_DOMAIN;
  if (!domain) throw new Error("NEXT_PUBLIC_DAILY_DOMAIN is not set");
  return `https://${domain}/${roomName}`;
}
