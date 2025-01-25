import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  content: string;
  isBot: boolean;
}

export const ChatMessage = ({ content, isBot }: ChatMessageProps) => {
  return (
    <div
      className={cn(
        "flex gap-3 p-4",
        isBot ? "bg-white/5" : "bg-transparent"
      )}
    >
      <Avatar className="h-8 w-8">
        <div className={cn(
          "h-full w-full rounded-full",
          isBot ? "bg-primary" : "bg-secondary"
        )} />
      </Avatar>
      <div className="flex-1">
        <p className="text-sm text-white leading-relaxed">{content}</p>
      </div>
    </div>
  );
};