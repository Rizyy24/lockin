
import { useSession } from "@supabase/auth-helpers-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";

interface FriendRequest {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  sender: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}

export default function Requests() {
  const session = useSession();
  const { toast } = useToast();

  const { data: requests, refetch } = useQuery({
    queryKey: ["friend-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("friendships")
        .select(`
          *,
          sender:profiles!friendships_user_id_fkey(username, avatar_url)
        `)
        .eq("friend_id", session?.user?.id)
        .eq("status", "pending");

      if (error) throw error;
      return data as FriendRequest[];
    },
    enabled: !!session?.user?.id,
  });

  const handleRequest = async (requestId: string, status: "accepted" | "rejected") => {
    const { error } = await supabase
      .from("friendships")
      .update({ status })
      .eq("id", requestId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not update friend request",
      });
      return;
    }

    toast({
      title: "Success",
      description: `Friend request ${status}`,
    });
    refetch();
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Friend Requests</h1>
        <div className="space-y-4">
          {requests?.length === 0 && (
            <p className="text-center text-muted-foreground">No pending friend requests</p>
          )}
          {requests?.map((request) => (
            <div
              key={request.id}
              className="flex items-center justify-between p-4 bg-card rounded-lg shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  {request.sender?.avatar_url ? (
                    <img
                      src={request.sender.avatar_url}
                      alt={request.sender.username || ""}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-xl">{request.sender?.username?.[0]?.toUpperCase()}</span>
                  )}
                </div>
                <span className="font-medium">{request.sender?.username}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  onClick={() => handleRequest(request.id, "accepted")}
                >
                  Accept
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleRequest(request.id, "rejected")}
                >
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Navigation />
    </div>
  );
}
