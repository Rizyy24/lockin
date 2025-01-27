import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReelScrollControlsProps {
  onScroll: (direction: 'up' | 'down') => void;
  isAtStart: boolean;
  isAtEnd: boolean;
}

export const ReelScrollControls = ({
  onScroll,
  isAtStart,
  isAtEnd,
}: ReelScrollControlsProps) => {
  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onScroll('up')}
        disabled={isAtStart}
        className="text-white/60 hover:text-white disabled:opacity-30"
      >
        <ArrowLeft className="w-6 h-6 rotate-90" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onScroll('down')}
        disabled={isAtEnd}
        className="text-white/60 hover:text-white disabled:opacity-30"
      >
        <ArrowLeft className="w-6 h-6 -rotate-90" />
      </Button>
    </div>
  );
};