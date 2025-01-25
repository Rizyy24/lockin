import { useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  content: string;
  is_bot: boolean;
}

interface ChatMessagesProps {
  messages: Message[];
  isLoading?: boolean;
}

export const ChatMessages = ({ messages, isLoading }: ChatMessagesProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            content={message.content}
            isBot={message.is_bot}
          />
        ))}
        {isLoading && (
          <ChatMessage
            content="Thinking..."
            isBot={true}
          />
        )}
        <div ref={scrollRef} />
      </div>
    </ScrollArea>
  );
};