import { useState } from "react";
import { useUser } from "@supabase/auth-helpers-react";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput } from "@/components/chat/ChatInput";
import { useChat } from "@/hooks/use-chat";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Pencil, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const ChatLanding = ({ onStartChat }: { onStartChat: () => void }) => {
  return (
    <div className="flex flex-col h-full bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Link to="/">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-semibold">Username</h1>
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
            placeholder="Search"
            className="pl-10 bg-zinc-900 border-none"
          />
        </div>
      </div>

      {/* AI Quote */}
      <div className="mx-4 p-6 rounded-lg bg-zinc-900/50 border border-white/10">
        <h2 className="text-lg font-medium mb-2">AI generated quote</h2>
        <p className="text-gray-400 italic">
          "Success is not final, failure is not fatal: it is the courage to
          continue that counts."
        </p>
      </div>

      {/* Messages Section */}
      <div className="flex-1 mt-6">
        <div className="flex justify-between px-4 mb-4">
          <h2 className="text-lg font-medium">Messages</h2>
          <Link to="/requests" className="text-blue-500">
            Requests
          </Link>
        </div>

        {/* StudyBot Button */}
        <button 
          onClick={onStartChat}
          className="flex items-center gap-4 w-full p-4 hover:bg-zinc-900/50 transition-colors"
        >
          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
            SB
          </div>
          <div className="text-left">
            <h3 className="font-medium">StudyBot</h3>
            <p className="text-sm text-gray-400">Click to start chatting...</p>
          </div>
        </button>
      </div>
    </div>
  );
};

const ChatInterface = () => {
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
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Link to="/chat">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
              SB
            </div>
            <h1 className="text-xl font-semibold">StudyBot</h1>
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
    return <ChatInterface />;
  }

  return <ChatLanding onStartChat={() => setIsChattingStarted(true)} />;
};

export default Chat;