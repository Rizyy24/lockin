
import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flip } from "lucide-react";

interface FlashcardContent {
  term: string;
  definition: string;
  type: 'flashcard';
}

interface ReelFlashcardProps {
  content: FlashcardContent;
}

export const ReelFlashcard = ({ content }: ReelFlashcardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="h-screen w-full flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 bg-black/50 backdrop-blur border-white/10">
        <div className="relative min-h-[300px]">
          <div className={`transition-all duration-500 ${isFlipped ? 'opacity-0' : 'opacity-100'}`}>
            <h2 className="text-2xl font-bold text-white mb-4">Term</h2>
            <p className="text-xl text-white/90">{content.term}</p>
          </div>
          
          <div className={`absolute top-0 left-0 w-full transition-all duration-500 ${isFlipped ? 'opacity-100' : 'opacity-0'}`}>
            <h2 className="text-2xl font-bold text-white mb-4">Definition</h2>
            <p className="text-xl text-white/90">{content.definition}</p>
          </div>
        </div>

        <Button 
          className="w-full mt-4 gap-2"
          variant="outline"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <Flip className="w-4 h-4" />
          Flip Card
        </Button>
      </Card>
    </div>
  );
};
