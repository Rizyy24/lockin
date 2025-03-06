
import { Eye, EyeOff, Heart, Save, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@supabase/auth-helpers-react";

interface ReelQuestionProps {
  question: string;
  options: string[];
  selectedAnswer: string | null;
  correctAnswer: string | null;
  onAnswerSelected: (answer: string) => void;
  isAnswered: boolean;
}

export const ReelQuestion = ({ 
  question, 
  options, 
  selectedAnswer, 
  correctAnswer, 
  onAnswerSelected, 
  isAnswered 
}: ReelQuestionProps) => {
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  const session = useSession();

  const handleShare = async () => {
    try {
      await navigator.share({
        title: "Check out this flashcard!",
        text: question,
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
      title: "Flashcard saved",
      description: "The flashcard has been saved to your library",
    });
  };

  const handleLike = async () => {
    if (!session?.user?.id) {
      toast({
        title: "Authentication required",
        description: "Please sign in to like flashcards",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('likes')
        .upsert({
          user_id: session.user.id,
          question_id: "placeholder", // This would need to be updated with actual question ID
        });

      if (error) throw error;

      setIsLiked(!isLiked);
      toast({
        title: isLiked ? "Like removed" : "Flashcard liked",
        description: isLiked ? "You've removed your like" : "You've liked this flashcard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update like status",
        variant: "destructive",
      });
    }
  };

  // Format question text to handle potential markdown or formatting
  const formattedQuestion = question.replace(/\n/g, '<br>');

  // Extract letter prefixes from options (A, B, C, D) if present
  const getOptionLetter = (option: string): string => {
    const match = option.match(/^([A-D])[).]\s*/);
    return match ? match[1] : '';
  };

  const getOptionText = (option: string): string => {
    return option.replace(/^[A-D][).]?\s*/, '');
  };

  return (
    <div className="space-y-6">
      {/* Question */}
      <div className="bg-[#1A1F2C] p-5 rounded-lg">
        <p 
          className="text-white text-lg" 
          dangerouslySetInnerHTML={{ __html: formattedQuestion }}
        />
      </div>
      
      {/* Options */}
      <div className="space-y-3">
        {options.map((option, index) => {
          const optionLetter = getOptionLetter(option) || String.fromCharCode(65 + index); // A, B, C, D if not present
          const optionText = getOptionText(option);
          
          return (
            <button
              key={index}
              className={`w-full text-left p-4 rounded-lg transition ${
                selectedAnswer === option
                  ? selectedAnswer === correctAnswer
                    ? "bg-green-600/20 border border-green-500"
                    : "bg-red-600/20 border border-red-500"
                  : correctAnswer === option && isAnswered
                    ? "bg-green-600/20 border border-green-500"
                    : "bg-white/5 hover:bg-white/10 border border-white/10"
              }`}
              onClick={() => !isAnswered && onAnswerSelected(option)}
              disabled={isAnswered}
            >
              <div className="flex">
                <span className="inline-block w-6 flex-shrink-0 font-bold">{optionLetter}.</span>
                <span className="text-white">{optionText}</span>
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Action Buttons */}
      <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/10">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLike}
          className={`text-white/60 hover:text-white ${isLiked ? 'text-red-500 hover:text-red-600' : ''}`}
        >
          <Heart className="w-5 h-5" fill={isLiked ? "currentColor" : "none"} />
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
  );
};
