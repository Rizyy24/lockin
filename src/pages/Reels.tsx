import { Navigation } from "@/components/Navigation";
import { ChevronUp, ChevronDown, Bookmark, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const Reels = () => {
  const { toast } = useToast();
  const [currentReelIndex, setCurrentReelIndex] = useState(0);

  const { data: reels, isLoading } = useQuery({
    queryKey: ['study-reels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('study_reels')
        .select(`
          *,
          questions (
            id,
            question,
            options,
            type
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: "Error loading reels",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }

      return data;
    },
  });

  const handlePreviousReel = () => {
    if (currentReelIndex > 0) {
      setCurrentReelIndex(prev => prev - 1);
    }
  };

  const handleNextReel = () => {
    if (reels && currentReelIndex < reels.length - 1) {
      setCurrentReelIndex(prev => prev + 1);
    }
  };

  const handleSaveQuestion = async (questionId: string) => {
    // TODO: Implement save functionality
    toast({
      title: "Coming soon",
      description: "This feature will be available soon!",
    });
  };

  const handleSubmitAnswer = async (questionId: string, answer: string) => {
    try {
      const { data: question } = await supabase
        .from('questions')
        .select('correct_answer')
        .eq('id', questionId)
        .single();

      const isCorrect = question?.correct_answer === answer;

      const { error } = await supabase
        .from('user_answers')
        .insert({
          question_id: questionId,
          answer,
          is_correct: isCorrect,
        });

      if (error) throw error;

      toast({
        title: isCorrect ? "Correct!" : "Incorrect",
        description: isCorrect ? "Great job!" : `The correct answer was: ${question?.correct_answer}`,
        variant: isCorrect ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Error submitting answer",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-foreground flex items-center justify-center">
        <div className="glass-card p-8">
          Loading study reels...
        </div>
      </div>
    );
  }

  const currentReel = reels?.[currentReelIndex];
  const currentQuestion = currentReel?.questions?.[0];

  return (
    <div className="min-h-screen bg-black text-foreground page-transition">
      <div className="fixed top-0 left-0 right-0 p-4">
        <Link to="/" className="text-white/80 hover:text-white">
          <ArrowLeft className="w-6 h-6" />
        </Link>
      </div>
      
      <div className="h-screen flex flex-col items-center justify-center p-6">
        {currentReel && currentQuestion ? (
          <div className="glass-card p-8 w-full max-w-lg animate-fade-in">
            <p className="text-sm text-white/60 mb-4">
              Question {currentReelIndex + 1} of {reels?.length}
            </p>
            <h2 className="text-xl font-medium text-white mb-6">
              {currentQuestion.question}
            </h2>
            
            <div className="space-y-4">
              {currentQuestion.options && JSON.parse(currentQuestion.options as string).map((option: string, index: number) => (
                <button
                  key={index}
                  onClick={() => handleSubmitAnswer(currentQuestion.id, option)}
                  className="w-full p-4 glass-card hover:bg-white/5 transition-colors text-left text-white"
                >
                  {String.fromCharCode(65 + index)}) {option}
                </button>
              ))}
            </div>
            
            <div className="flex justify-between mt-8">
              <button 
                className="p-2 glass-card hover:bg-white/5 transition-colors text-white disabled:opacity-50"
                onClick={handlePreviousReel}
                disabled={currentReelIndex === 0}
              >
                <ChevronUp className="w-6 h-6" />
              </button>
              <button 
                className="p-2 glass-card hover:bg-white/5 transition-colors text-white"
                onClick={() => handleSaveQuestion(currentQuestion.id)}
              >
                <Bookmark className="w-6 h-6" />
              </button>
              <button 
                className="p-2 glass-card hover:bg-white/5 transition-colors text-white disabled:opacity-50"
                onClick={handleNextReel}
                disabled={!reels || currentReelIndex === reels.length - 1}
              >
                <ChevronDown className="w-6 h-6" />
              </button>
            </div>
          </div>
        ) : (
          <div className="glass-card p-8 text-center">
            <p className="text-white/60">No study reels available yet.</p>
            <Link 
              to="/upload" 
              className="mt-4 inline-block text-primary hover:text-primary/80 transition-colors"
            >
              Upload study material to create reels
            </Link>
          </div>
        )}
      </div>
      <Navigation />
    </div>
  );
};

export default Reels;