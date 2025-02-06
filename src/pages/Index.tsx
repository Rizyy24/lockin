import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Search, UserPlus, MessageSquare } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [username, setUsername] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
      }
    };
    
    checkAuth();
  }, [navigate]);

  const handleAddFriend = async () => {
    if (!username.trim()) {
      toast({
        title: "Error",
        description: "Please enter a username",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("username", username)
        .single();

      if (profileError || !profiles) {
        throw new Error("User not found");
      }

      const { error: friendshipError } = await supabase
        .from("friendships")
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          friend_id: profiles.id,
        });

      if (friendshipError) {
        if (friendshipError.code === '23505') {
          throw new Error("Friend request already sent");
        }
        throw friendshipError;
      }

      toast({
        title: "Success",
        description: "Friend request sent!",
      });
      setUsername("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto p-4">
        <header className="app-header">
          <h1 className="text-2xl font-bold">LockIn</h1>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/chat')}
          >
            <MessageSquare className="w-6 h-6" />
          </Button>
        </header>

        <main className="space-y-6">
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold mb-4">Welcome to LockIn</h2>
            <p className="text-gray-300">
              Your personal space for focused study and productivity.
            </p>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-3">Add Friends</h3>
            <div className="flex gap-2 mb-4">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="flex-1"
              />
              <Button onClick={handleAddFriend}>
                <UserPlus className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-3">Recent Posts</h3>
            <div className="space-y-4">
              <div className="glass-card p-4">
                <p className="text-gray-400">No posts yet</p>
              </div>
            </div>
          </div>
        </main>
      </div>
      <Navigation />
    </div>
  );
};

export default Index;