import { cn } from "@/lib/utils";

interface ChatMessageProps {
  content: string;
  isBot: boolean;
}

export const ChatMessage = ({ content, isBot }: ChatMessageProps) => {
  return (
    <div
      className={cn(
        "flex w-full",
        isBot ? "justify-start" : "justify-end"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
          isBot 
            ? "bg-zinc-800 text-white ml-2" 
            : "bg-purple-600 text-white mr-2"
        )}
        style={{
          wordWrap: "break-word",
          overflowWrap: "break-word",
          maxWidth: isBot ? "280px" : "80%", // Approximately 15 words width for bot messages
          whiteSpace: "pre-wrap",
        }}
      >
        <p>{content}</p>
      </div>
    </div>
  );
};