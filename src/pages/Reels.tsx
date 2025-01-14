import { Navigation } from "@/components/Navigation";
import { Bookmark, ArrowLeft, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

const Reels = () => {
  const { toast } = useToast();

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

  const handleSaveQuestion = async (questionId: string) => {
    toast({
      title: "Coming soon",
      description: "This feature will be available soon!",
    });
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
      <div className="fixed top-0 left-0 right-0 p-4">
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
                    <span>Uploaded Document</span>
                  </div>
                  {reel.content}
                </div>

                {reel.questions && reel.questions.length > 0 && (
                  <div className="space-y-4">
                    {reel.questions.map((question) => (
                      <div key={question.id} className="bg-white/5 rounded-lg p-4">
                        <p className="text-white mb-4">{question.question}</p>
                        {question.options && JSON.parse(question.options as string).map((option: string, optionIndex: number) => (
                          <button
                            key={optionIndex}
                            onClick={() => handleSubmitAnswer(question.id, option)}
                            className="w-full p-4 glass-card hover:bg-white/5 transition-colors text-left text-white mb-2"
                          >
                            {String.fromCharCode(65 + optionIndex)}) {option}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex justify-end mt-4">
                  <button 
                    className="p-2 glass-card hover:bg-white/5 transition-colors text-white"
                    onClick={() => handleSaveQuestion(reel.questions?.[0]?.id || '')}
                  >
                    <Bookmark className="w-6 h-6" />
                  </button>
                </div>
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