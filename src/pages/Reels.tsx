import { Navigation } from "@/components/Navigation";
import { ArrowLeft, Save, Share2, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const Reels = () => {
  const { toast } = useToast();
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

  const saveReel = useMutation({
    mutationFn: async (reelId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Here you would implement the save functionality
      // For now, we'll just show a toast
      toast({
        title: "Reel saved",
        description: "The reel has been saved to your library",
      });
    },
  });

  const handleScroll = (direction: 'up' | 'down') => {
    if (!scrollContainerRef.current) return;
    
    const newIndex = direction === 'down' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex >= 0 && reels && newIndex < reels.length) {
      setCurrentIndex(newIndex);
      scrollContainerRef.current.style.transform = `translateY(-${newIndex * 100}vh)`;
    }
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') handleScroll('up');
      if (e.key === 'ArrowDown') handleScroll('down');
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex]);

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
    <div className="min-h-screen bg-black text-foreground overflow-hidden">
      <div className="fixed top-0 left-0 right-0 p-4 z-50 bg-black/80 backdrop-blur-sm">
        <Link to="/" className="text-white/80 hover:text-white">
          <ArrowLeft className="w-6 h-6" />
        </Link>
      </div>
      
      <div 
        ref={scrollContainerRef}
        className="transition-transform duration-500 ease-out"
        style={{ height: reels?.length ? `${reels.length * 100}vh` : '100vh' }}
      >
        {reels?.map((reel, reelIndex) => (
          <div 
            key={reel.id} 
            className={cn(
              "fixed top-0 left-0 right-0 h-screen w-full transition-opacity duration-500",
              reelIndex === currentIndex ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
          >
            {reel.questions && reel.questions.length > 0 && (
              <div className="h-full flex items-center justify-center px-4">
                {reel.questions.map((question, qIndex) => (
                  <div 
                    key={question.id} 
                    className="glass-card p-6 w-full max-w-md mx-auto"
                  >
                    <p className="text-white text-xl mb-8">{question.question}</p>
                    
                    {!revealedAnswers[question.id] && question.options && Array.isArray(question.options) && (
                      <div className="space-y-3">
                        {question.options.map((option: string, optionIndex: number) => (
                          <button
                            key={optionIndex}
                            onClick={() => {
                              // Handle answer submission
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
                            }}
                            className="w-full p-4 text-left text-white bg-[#1A1F2C]/80 rounded-lg hover:bg-[#1A1F2C] transition-colors"
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}

                    {revealedAnswers[question.id] && (
                      <div className="text-white bg-[#1A1F2C]/80 p-4 rounded-lg">
                        <p className="text-lg font-medium mb-2">Answer:</p>
                        <p>{question.correct_answer}</p>
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/10">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setRevealedAnswers(prev => ({
                          ...prev,
                          [question.id]: !prev[question.id]
                        }))}
                        className="text-white/60 hover:text-white"
                      >
                        {revealedAnswers[question.id] ? 
                          <EyeOff className="w-5 h-5" /> : 
                          <Eye className="w-5 h-5" />
                        }
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => saveReel.mutate(reel.id)}
                          className="text-white/60 hover:text-white"
                        >
                          <Save className="w-5 h-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            navigator.share({
                              title: "Check out this study reel!",
                              url: `${window.location.origin}/reels/${reel.id}`,
                            }).catch(() => {
                              toast({
                                title: "Sharing not supported",
                                description: "Your browser doesn't support sharing.",
                                variant: "destructive",
                              });
                            });
                          }}
                          className="text-white/60 hover:text-white"
                        >
                          <Share2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleScroll('up')}
          disabled={currentIndex === 0}
          className="text-white/60 hover:text-white disabled:opacity-30"
        >
          <ArrowLeft className="w-6 h-6 rotate-90" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleScroll('down')}
          disabled={reels && currentIndex === reels.length - 1}
          className="text-white/60 hover:text-white disabled:opacity-30"
        >
          <ArrowLeft className="w-6 h-6 -rotate-90" />
        </Button>
      </div>
      
      <Navigation />
    </div>
  );
};

export default Reels;