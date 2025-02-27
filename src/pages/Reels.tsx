import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { ReelNavigation } from "@/components/reels/ReelNavigation";
import { ReelQuestion } from "@/components/reels/ReelQuestion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ArrowRight, Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Question {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  reel_id: string;
}

interface Reel {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

const Reels = () => {
  const [currentReelIndex, setCurrentReelIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const { toast } = useToast();

  const { data: reels = [], isLoading: isLoadingReels } = useQuery({
    queryKey: ["study-reels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_reels")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Reel[];
    },
  });

  const { data: questions = [], isLoading: isLoadingQuestions } = useQuery({
    queryKey: ["reel-questions", reels[currentReelIndex]?.id],
    queryFn: async () => {
      if (!reels.length || !reels[currentReelIndex]?.id) return [];

      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("reel_id", reels[currentReelIndex].id);

      if (error) throw error;
      return data as Question[];
    },
    enabled: reels.length > 0 && !!reels[currentReelIndex]?.id,
  });

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setIsCorrect(null);
    } else {
      toast({
        title: "Reel Complete!",
        description: "You've answered all questions in this study reel.",
      });
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setSelectedAnswer(null);
      setIsCorrect(null);
    }
  };

  const handleAnswerSelected = async (answer: string) => {
    setSelectedAnswer(answer);
    
    if (questions[currentQuestionIndex]) {
      const correct = answer === questions[currentQuestionIndex].correct_answer;
      setIsCorrect(correct);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { error } = await supabase.from("user_answers").insert({
          question_id: questions[currentQuestionIndex].id,
          answer: answer,
          is_correct: correct,
          user_id: user.id
        });
        
        if (error) {
          console.error("Failed to save answer:", error);
          toast({
            title: "Error",
            description: "Failed to save your answer",
            variant: "destructive"
          });
        }
      }
      
      toast({
        title: correct ? "Correct!" : "Incorrect",
        description: correct 
          ? "Great job! You got the right answer." 
          : `The correct answer was: ${questions[currentQuestionIndex].correct_answer}`,
        variant: correct ? "default" : "destructive",
      });
    }
  };

  const handleNextReel = () => {
    if (currentReelIndex < reels.length - 1) {
      setCurrentReelIndex(currentReelIndex + 1);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setIsCorrect(null);
    }
  };

  const handlePrevReel = () => {
    if (currentReelIndex > 0) {
      setCurrentReelIndex(currentReelIndex - 1);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setIsCorrect(null);
    }
  };

  useEffect(() => {
    setSelectedAnswer(null);
    setIsCorrect(null);
  }, [currentQuestionIndex, currentReelIndex]);

  if (isLoadingReels || (reels.length > 0 && isLoadingQuestions)) {
    return (
      <div className="min-h-screen bg-black text-foreground overflow-hidden">
        <ReelNavigation />
        <div className="h-screen flex items-center justify-center">
          <div className="animate-pulse text-white">Loading study reels...</div>
        </div>
        <Navigation />
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="min-h-screen bg-black text-foreground overflow-hidden">
        <ReelNavigation />
        <div className="h-screen flex items-center justify-center">
          <div className="glass-card p-8 text-center max-w-md">
            <Brain className="w-16 h-16 mx-auto mb-4 text-primary/60" />
            <h1 className="text-2xl font-bold mb-4">No Study Reels Yet</h1>
            <p className="text-white/60 mb-4">Upload documents on the Upload page to generate study questions.</p>
          </div>
        </div>
        <Navigation />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-black text-foreground overflow-hidden">
        <ReelNavigation />
        <div className="h-screen flex items-center justify-center">
          <div className="glass-card p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">No Questions Available</h1>
            <p className="text-white/60">This study reel doesn't have any questions yet.</p>
            
            <div className="flex justify-center mt-6 gap-4">
              <button 
                onClick={handlePrevReel} 
                disabled={currentReelIndex === 0}
                className="p-2 rounded-full bg-white/10 disabled:opacity-30"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={handleNextReel} 
                disabled={currentReelIndex === reels.length - 1}
                className="p-2 rounded-full bg-white/10 disabled:opacity-30"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        <Navigation />
      </div>
    );
  }

  const currentReel = reels[currentReelIndex];
  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-black text-foreground overflow-hidden">
      <ReelNavigation />
      
      <div className="h-screen flex items-center justify-center p-4">
        <div className="glass-card p-6 md:p-8 w-full max-w-md">
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-1">{currentReel.title}</h2>
            <div className="flex justify-between items-center text-xs text-white/60">
              <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
              <span>Reel {currentReelIndex + 1} of {reels.length}</span>
            </div>
          </div>
          
          <ReelQuestion 
            question={currentQuestion.question}
            options={currentQuestion.options}
            selectedAnswer={selectedAnswer}
            correctAnswer={isCorrect !== null ? currentQuestion.correct_answer : null}
            onAnswerSelected={handleAnswerSelected}
            isAnswered={selectedAnswer !== null}
          />
          
          <div className="flex justify-between mt-8">
            <div>
              <button 
                onClick={handlePrevQuestion} 
                disabled={currentQuestionIndex === 0 || !selectedAnswer}
                className="p-2 rounded-full bg-white/10 disabled:opacity-30 mr-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={handleNextQuestion} 
                disabled={currentQuestionIndex === questions.length - 1 || !selectedAnswer}
                className="p-2 rounded-full bg-white/10 disabled:opacity-30"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
            
            <div>
              <button 
                onClick={handlePrevReel} 
                disabled={currentReelIndex === 0}
                className="p-2 rounded-full bg-white/10 disabled:opacity-30 mr-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={handleNextReel} 
                disabled={currentReelIndex === reels.length - 1}
                className="p-2 rounded-full bg-white/10 disabled:opacity-30"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <Navigation />
    </div>
  );
};

export default Reels;
