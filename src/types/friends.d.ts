export interface FriendRequest {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  profile: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}