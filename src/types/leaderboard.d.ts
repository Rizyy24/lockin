export interface LeaderboardEntry {
  user_id: string;
  aura_points: number;
  profile: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}