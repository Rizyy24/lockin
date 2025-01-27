import { Eye, EyeOff, Save, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface ReelQuestionProps {
  question: {
    id: string;
    question: string;
    options: string[];
    correct_answer: string;
  };
}

export const ReelQuestion = ({ question }: ReelQuestionProps) => {
  const { toast } = useToast();
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);

  const handleShare = async () => {
    try {
      await navigator.share({
        title: "Check out this study reel!",
        text: question.question,
        url: window.location.href,
      });
    } catch (error) {
      toast({
        title: "Sharing not supported",
        description: "Your browser doesn't support sharing.",
        variant: "destructive",
      });
    }
  };

  const handleSave = () => {
    toast({
      title: "Reel saved",
      description: "The reel has been saved to your library",
    });
  };

  const handleOptionClick = (option: string) => {
    if (option === question.correct_answer) {
      toast({
        title: "Correct!",
        description: "Great job!",
      });
    } else {
      toast({
        title: "Incorrect",
        description: `The correct answer was: ${question.correct_answer}`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-[100svh] w-full flex items-center justify-center px-4 py-16 snap-start">
      <div className="glass-card p-6 w-full max-w-md mx-auto animate-fade-in">
        <p className="text-white text-xl mb-8">{question.question}</p>
        
        {!isAnswerRevealed && question.options && (
          <div className="space-y-3">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleOptionClick(option)}
                className="w-full p-4 text-left text-white bg-[#1A1F2C]/80 rounded-lg hover:bg-[#1A1F2C] transition-colors"
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {isAnswerRevealed && (
          <div className="text-white bg-[#1A1F2C]/80 p-4 rounded-lg">
            <p className="text-lg font-medium mb-2">Answer:</p>
            <p>{question.correct_answer}</p>
          </div>
        )}

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsAnswerRevealed(!isAnswerRevealed)}
            className="text-white/60 hover:text-white"
          >
            {isAnswerRevealed ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </Button>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSave}
              className="text-white/60 hover:text-white"
            >
              <Save className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="text-white/60 hover:text-white"
            >
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};