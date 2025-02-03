import { useState } from "react";
import { useUser } from "@supabase/auth-helpers-react";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput } from "@/components/chat/ChatInput";
import { useChat } from "@/hooks/use-chat";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Pencil, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Friend {
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

const ChatLanding = ({ onStartChat }: { onStartChat: () => void }) => {
  const user = useUser();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: friends = [] } = useQuery({
    queryKey: ["friends"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("friendships")
        .select(`
          profiles:profiles!friendships_friend_id_fkey(
            username,
            avatar_url
          )
        `)
        .eq("user_id", user?.id)
        .eq("status", "accepted");

      if (error) throw error;
      return data as Friend[];
    },
    enabled: !!user,
  });

  const filteredFriends = friends.filter(friend => 
    friend.profiles.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center justify-between p-4 border-b border-white/10 bg-black">
        <div className="flex items-center gap-2">
          <Link to="/">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-semibold">Study Buddy</h1>
        </div>
        <Button variant="ghost" size="icon">
          <Pencil className="w-5 h-5" />
        </Button>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations"
            className="pl-10 bg-zinc-900 border-none"
          />
        </div>
      </div>

      {/* Study Buddy Card */}
      <div className="mx-4 p-6 rounded-lg bg-zinc-900/50 border border-white/10">
        <h2 className="text-lg font-medium mb-2">Chatbot</h2>
        <button 
          onClick={onStartChat}
          className="flex items-center gap-4 w-full hover:bg-zinc-800/50 p-4 rounded-lg transition-colors"
        >
          <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold">
            SB
          </div>
          <div className="text-left">
            <h3 className="font-medium">Study Buddy</h3>
            <p className="text-sm text-gray-400">Ready to help you learn!</p>
          </div>
        </button>
      </div>

      {/* Friends Section */}
      <div className="flex-1 mt-6">
        <div className="flex justify-between px-4 mb-4">
          <h2 className="text-lg font-medium">Friends</h2>
        </div>

        <div className="space-y-2">
          {filteredFriends.map((friend, index) => (
            <button 
              key={index}
              className="flex items-center gap-4 w-full p-4 hover:bg-zinc-900/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold">
                {friend.profiles.username[0]?.toUpperCase()}
              </div>
              <div className="text-left">
                <h3 className="font-medium">{friend.profiles.username}</h3>
                <p className="text-sm text-gray-400">Online</p>
              </div>
            </button>
          ))}
          {filteredFriends.length === 0 && (
            <div className="text-center text-gray-500 py-4">
              {searchQuery ? "No friends found" : "No friends yet"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ChatInterface = ({ onBack }: { onBack: () => void }) => {
  const user = useUser();
  const { messages, input, setInput, handleSubmit, isLoading } = useChat(
    user?.id || ""
  );

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-white/60">Please sign in to use the chat.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-50 flex items-center justify-between p-4 border-b border-white/10 bg-black">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold">
              SB
            </div>
            <h1 className="text-xl font-semibold">Study Buddy</h1>
          </div>
        </div>
      </div>
      <ChatMessages messages={messages} isLoading={isLoading} />
      <ChatInput
        input={input}
        setInput={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
};

const Chat = () => {
  const [isChattingStarted, setIsChattingStarted] = useState(false);

  if (isChattingStarted) {
    return <ChatInterface onBack={() => setIsChattingStarted(false)} />;
  }

  return <ChatLanding onStartChat={() => setIsChattingStarted(true)} />;
};

export default Chat;