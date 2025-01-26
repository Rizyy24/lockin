import { Navigation } from "@/components/Navigation";
import { Bookmark, ArrowLeft, FileText, Share2, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const Reels = () => {
  const { toast } = useToast();
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});

  const { data: reels, isLoading } = useQuery({
    queryKey: ['study-reels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('study_reels')
        .select(`
          *,
          uploads (
            file_name,
            file_path
          ),
          questions (
            id,
            question,
            options,
            type,
            correct_answer
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

  const handleSaveQuestion = async (questionId: string) => {
    toast({
      title: "Coming soon",
      description: "This feature will be available soon!",
    });
  };

  const handleShare = async (reelId: string) => {
    try {
      await navigator.share({
        title: "Check out this study reel!",
        url: `${window.location.origin}/reels/${reelId}`,
      });
    } catch (error) {
      toast({
        title: "Sharing not supported",
        description: "Your browser doesn't support sharing.",
        variant: "destructive",
      });
    }
  };

  const toggleAnswer = (questionId: string) => {
    setRevealedAnswers(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const handleSubmitAnswer = async (questionId: string, answer: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to submit answers",
          variant: "destructive",
        });
        return;
      }

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
          user_id: user.id,
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

  return (
    <div className="min-h-screen bg-black text-foreground page-transition">
      <div className="fixed top-0 left-0 right-0 p-4 z-50 bg-black/80 backdrop-blur-sm">
        <Link to="/" className="text-white/80 hover:text-white">
          <ArrowLeft className="w-6 h-6" />
        </Link>
      </div>
      
      <div className="container mx-auto max-w-4xl px-4 py-20">
        <ScrollArea className="h-[calc(100vh-160px)]">
          <div className="space-y-8">
            {reels?.map((reel) => (
              <div key={reel.id} className="glass-card p-8 animate-fade-in">
                <h2 className="text-xl font-medium text-white mb-6">
                  {reel.title}
                </h2>

                <div className="bg-white/5 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 text-white/80 mb-4">
                    <FileText className="w-5 h-5" />
                    <span>Study Material</span>
                  </div>
                  <p className="text-white/80 line-clamp-3">{reel.content}</p>
                </div>

                {reel.questions && reel.questions.length > 0 && (
                  <div className="space-y-6">
                    {reel.questions.map((question) => (
                      <div key={question.id} className="bg-white/5 rounded-lg p-6">
                        <div className="flex justify-between items-start mb-4">
                          <p className="text-white text-lg flex-1">{question.question}</p>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleAnswer(question.id)}
                              className="text-white/60 hover:text-white"
                            >
                              {revealedAnswers[question.id] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleShare(reel.id)}
                              className="text-white/60 hover:text-white"
                            >
                              <Share2 className="w-5 h-5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleSaveQuestion(question.id)}
                              className="text-white/60 hover:text-white"
                            >
                              <Bookmark className="w-5 h-5" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid gap-3">
                          {question.options && Array.isArray(question.options) && question.options.map((option: string, optionIndex: number) => (
                            <button
                              key={optionIndex}
                              onClick={() => handleSubmitAnswer(question.id, option)}
                              className={`w-full p-4 glass-card hover:bg-white/5 transition-colors text-left text-white ${
                                revealedAnswers[question.id] && option === question.correct_answer
                                  ? "border-2 border-green-500"
                                  : ""
                              }`}
                            >
                              {String.fromCharCode(65 + optionIndex)}) {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
      <Navigation />
    </div>
  );
};

export default Reels;