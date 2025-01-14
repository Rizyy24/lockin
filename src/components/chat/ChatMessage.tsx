import { cn } from "@/lib/utils";

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

export const ChatMessage = ({ role, content }: ChatMessageProps) => {
  return (
    <div className={cn("mb-4", role === 'user' ? 'text-right' : 'text-left')}>
      <div
        className={cn(
          "inline-block p-4 rounded-lg",
          role === 'user'
            ? 'bg-primary text-primary-foreground ml-12'
            : 'bg-muted text-foreground mr-12'
        )}
      >
        {content}
      </div>
    </div>
  );
};