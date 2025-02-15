
import { Eye, EyeOff, Heart, Save, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@supabase/auth-helpers-react";

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
  const [isLiked, setIsLiked] = useState(false);
  const session = useSession();

  const handleShare = async () => {
    try {
      await navigator.share({
        title: "Check out this flashcard!",
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
          question_id: question.id,
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

  return (
    <div className="min-h-[100svh] w-full flex items-center justify-center px-4 py-16 snap-start">
      <div className="glass-card p-6 w-full max-w-md mx-auto animate-fade-in">
        {/* Flashcard Question */}
        <div className="bg-[#1A1F2C] p-6 rounded-xl mb-6">
          <p className="text-white text-xl">{question.question}</p>
        </div>
        
        {/* Answer Section */}
        <div className="space-y-4">
          <Button
            variant="outline"
            className="w-full text-white"
            onClick={() => setIsAnswerRevealed(!isAnswerRevealed)}
          >
            {isAnswerRevealed ? (
              <>
                <EyeOff className="mr-2 h-4 w-4" />
                Hide Answer
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Reveal Answer
              </>
            )}
          </Button>

          {isAnswerRevealed && (
            <div className="bg-[#1A1F2C]/80 p-4 rounded-lg animate-fade-in">
              <p className="text-white">{question.correct_answer}</p>
            </div>
          )}
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
    </div>
  );
};
