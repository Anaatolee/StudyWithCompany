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
  is_public: boolean;
  color: string;
  invite_token: string | null;
  max_participants: number;
  created_by: string | null;
  created_at: string;
  empty_since: string | null;
  study_goal: string | null;
  pomodoro_enabled: boolean;
  pomodoro_mode: string;
  pomodoro_phase: string;
  pomodoro_running: boolean;
  pomodoro_started_at: string | null;
  pomodoro_phase_duration: number | null;
  pomodoro_pending_mode: string | null;
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

export type DirectMessage = {
  id: string;
  room_id: string;
  from_id: string;
  to_id: string;
  content: string;
  created_at: string;
};

export type StudySession = {
  id: string;
  user_id: string;
  room_id: string | null;
  subject_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
};

export type PrivateCallInvite = {
  callId: string;
  roomUrl: string;
  fromUserId: string;
  fromUsername: string;
  toUserId: string;
};
