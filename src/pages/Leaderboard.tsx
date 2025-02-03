import { useState } from "react";
import { useUser } from "@supabase/auth-helpers-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

interface LeaderboardEntry {
  user_id: string;
  aura_points: number;
  profiles: {
    username: string | null;
    avatar_url: string | null;
  };
}

const Leaderboard = () => {
  const user = useUser();
  const [activeTab, setActiveTab] = useState<"global" | "friends">("global");

  const { data: leaderboardData, isLoading } = useQuery({
    queryKey: ["leaderboard", activeTab],
    queryFn: async () => {
      if (activeTab === "global") {
        const { data, error } = await supabase
          .from("user_aura")
          .select(`
            user_id,
            aura_points,
            profiles (
              username,
              avatar_url
            )
          `)
          .order("aura_points", { ascending: false })
          .limit(100);

        if (error) throw error;
        return data as LeaderboardEntry[];
      } else {
        const { data: friendships, error: friendshipsError } = await supabase
          .from("friendships")
          .select("friend_id")
          .eq("user_id", user?.id)
          .eq("status", "accepted");

        if (friendshipsError) throw friendshipsError;

        const friendIds = friendships.map((f) => f.friend_id);
        friendIds.push(user?.id!);

        const { data, error } = await supabase
          .from("user_aura")
          .select(`
            user_id,
            aura_points,
            profiles (
              username,
              avatar_url
            )
          `)
          .in("user_id", friendIds)
          .order("aura_points", { ascending: false });

        if (error) throw error;
        return data as LeaderboardEntry[];
      }
    },
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Leaderboard</h1>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "global" | "friends")}>
          <TabsList className="w-full">
            <TabsTrigger value="global" className="flex-1">Global</TabsTrigger>
            <TabsTrigger value="friends" className="flex-1">Friends</TabsTrigger>
          </TabsList>

          <TabsContent value="global" className="mt-4">
            {isLoading ? (
              <LeaderboardSkeleton />
            ) : (
              <LeaderboardList entries={leaderboardData || []} />
            )}
          </TabsContent>

          <TabsContent value="friends" className="mt-4">
            {isLoading ? (
              <LeaderboardSkeleton />
            ) : (
              <LeaderboardList entries={leaderboardData || []} />
            )}
          </TabsContent>
        </Tabs>
      </div>
      <Navigation />
    </div>
  );
};

const LeaderboardList = ({ entries }: { entries: LeaderboardEntry[] }) => {
  return (
    <div className="space-y-4">
      {entries.map((entry, index) => (
        <div
          key={entry.user_id}
          className="flex items-center gap-4 p-4 rounded-lg bg-zinc-900/50"
        >
          <div className="text-xl font-bold text-purple-500 w-8">{index + 1}</div>
          <Avatar className="w-10 h-10">
            <div className="w-full h-full bg-purple-600 flex items-center justify-center text-white">
              {entry.profiles?.username?.[0]?.toUpperCase() || "?"}
            </div>
          </Avatar>
          <div className="flex-1">
            <div className="font-medium">{entry.profiles?.username || "Anonymous"}</div>
          </div>
          <div className="text-purple-500 font-bold">{entry.aura_points} AP</div>
        </div>
      ))}
      {entries.length === 0 && (
        <div className="text-center text-gray-500 py-8">No entries found</div>
      )}
    </div>
  );
};

const LeaderboardSkeleton = () => (
  <div className="space-y-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-zinc-900/50">
        <Skeleton className="w-8 h-8 rounded-full" />
        <Skeleton className="w-10 h-10 rounded-full" />
        <Skeleton className="flex-1 h-6" />
        <Skeleton className="w-16 h-6" />
      </div>
    ))}
  </div>
);

export default Leaderboard;