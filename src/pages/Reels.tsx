
import { useState, useEffect, useRef } from "react";
import { Navigation } from "@/components/Navigation";
import { ReelNavigation } from "@/components/reels/ReelNavigation";
import { ReelQuestion } from "@/components/reels/ReelQuestion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Brain } from "lucide-react";
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
  const [isScrolling, setIsScrolling] = useState(false);
  const reelContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Get user's reels
  const { data: reels = [], isLoading: isLoadingReels } = useQuery({
    queryKey: ["study-reels"],
    queryFn: async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return [];
      }
      
      const { data, error } = await supabase
        .from("study_reels")
        .select("*")
        .eq("user_id", user.id)
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
      
      // Automatically go to next question after a short delay
      setTimeout(() => {
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
          setSelectedAnswer(null);
          setIsCorrect(null);
        } else if (currentReelIndex < reels.length - 1) {
          // Move to next reel if we're at the last question
          handleScrollToNextReel();
        } else {
          toast({
            title: "All Complete!",
            description: "You've completed all available questions.",
          });
        }
      }, 1500);
    }
  };

  const handleScrollToNextReel = () => {
    if (currentReelIndex < reels.length - 1) {
      setIsScrolling(true);
      setCurrentReelIndex(currentReelIndex + 1);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setIsCorrect(null);
      
      setTimeout(() => setIsScrolling(false), 500);
    }
  };

  const handleScrollToPrevReel = () => {
    if (currentReelIndex > 0) {
      setIsScrolling(true);
      setCurrentReelIndex(currentReelIndex - 1);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setIsCorrect(null);
      
      setTimeout(() => setIsScrolling(false), 500);
    }
  };

  // Add wheel event handler for vertical scrolling
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (isScrolling || selectedAnswer) return;
      
      if (e.deltaY > 0) {
        // Scrolling down - move to next question or reel
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
          handleScrollToNextReel();
        }
      } else if (e.deltaY < 0) {
        // Scrolling up - move to previous question or reel
        if (currentQuestionIndex > 0) {
          setCurrentQuestionIndex(currentQuestionIndex - 1);
        } else {
          handleScrollToPrevReel();
        }
      }
    };
    
    // Add debounce to prevent too many scroll events
    let timeout: ReturnType<typeof setTimeout>;
    const debouncedHandleWheel = (e: WheelEvent) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => handleWheel(e), 200);
    };
    
    const container = reelContainerRef.current;
    if (container) {
      container.addEventListener('wheel', debouncedHandleWheel);
    }
    
    return () => {
      if (container) {
        container.removeEventListener('wheel', debouncedHandleWheel);
      }
      clearTimeout(timeout);
    };
  }, [currentReelIndex, currentQuestionIndex, isScrolling, questions.length, selectedAnswer]);

  // Add swipe gesture support for mobile
  useEffect(() => {
    const container = reelContainerRef.current;
    if (!container) return;
    
    let touchStartY = 0;
    
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      if (isScrolling || selectedAnswer) return;
      
      const touchEndY = e.changedTouches[0].clientY;
      const deltaY = touchEndY - touchStartY;
      
      // If the swipe distance is significant
      if (Math.abs(deltaY) > 50) {
        if (deltaY < 0) {
          // Swipe up - move to next question or reel
          if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
          } else {
            handleScrollToNextReel();
          }
        } else {
          // Swipe down - move to previous question or reel
          if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
          } else {
            handleScrollToPrevReel();
          }
        }
      }
    };
    
    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [currentReelIndex, currentQuestionIndex, isScrolling, questions.length, selectedAnswer]);

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

  return (
    <div 
      ref={reelContainerRef}
      className="min-h-screen bg-black text-foreground overflow-hidden">
      <ReelNavigation />
      
      <div className="h-screen flex items-center justify-center p-4">
        <div className="glass-card p-6 md:p-8 w-full max-w-md">
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-1">{reels[currentReelIndex]?.title}</h2>
            <div className="flex justify-between items-center text-xs text-white/60">
              <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
              <span>Reel {currentReelIndex + 1} of {reels.length}</span>
            </div>
          </div>
          
          {questions.length > 0 ? (
            <ReelQuestion 
              question={questions[currentQuestionIndex].question}
              options={questions[currentQuestionIndex].options}
              selectedAnswer={selectedAnswer}
              correctAnswer={isCorrect !== null ? questions[currentQuestionIndex].correct_answer : null}
              onAnswerSelected={handleAnswerSelected}
              isAnswered={selectedAnswer !== null}
            />
          ) : (
            <div className="py-8 text-center">
              <p className="text-white/60">No questions available for this reel.</p>
            </div>
          )}
          
          <div className="text-center mt-6 text-white/60 text-sm">
            <p>Scroll to navigate between questions</p>
          </div>
        </div>
      </div>
      
      <Navigation />
    </div>
  );
};

export default Reels;
