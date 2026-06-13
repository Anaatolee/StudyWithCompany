export type Subject = {
  id: string;
  slug: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
};

export type Room = {
  id: string;
  subject_id: string;
  name: string;
  description: string | null;
  daily_room_name: string | null;
  daily_room_url: string | null;
  max_participants: number;
  created_by: string | null;
  created_at: string;
};

export type RoomWithSubject = Room & { subject: Subject };

export type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
  username: string;
  avatar_url: string | null;
};

export type PrivateCallInvite = {
  callId: string;
  roomUrl: string;
  fromUserId: string;
  fromUsername: string;
  toUserId: string;
};
