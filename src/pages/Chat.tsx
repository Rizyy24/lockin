import { useUser } from "@supabase/auth-helpers-react";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput } from "@/components/chat/ChatInput";
import { useChat } from "@/hooks/use-chat";

export const Chat = () => {
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