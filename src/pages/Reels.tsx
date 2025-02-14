import { Navigation } from "@/components/Navigation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef, useEffect } from "react";
import { ReelQuestion } from "@/components/reels/ReelQuestion";
import { ReelScrollControls } from "@/components/reels/ReelScrollControls";
import { ReelNavigation } from "@/components/reels/ReelNavigation";
import { Json } from "@/integrations/supabase/types";

const Reels = () => {
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  const { data: reels, isLoading, error } = useQuery({
    queryKey: ['study-reels'],
    queryFn: async () => {
      console.log('Fetching reels...');
      const { data, error } = await supabase
        .from('study_reels')
        .select(`
          *,
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
        console.error('Error fetching reels:', error);
        toast({
          title: "Error loading reels",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }

      console.log('Fetched reels:', data);
      return data;
    },
  });

  const handleScroll = (direction: 'up' | 'down') => {
    if (isScrolling || !containerRef.current || !reels?.length) return;

    const newIndex = direction === 'down' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex >= 0 && newIndex < reels.length) {
      setIsScrolling(true);
      setCurrentIndex(newIndex);
      
      containerRef.current.scrollTo({
        top: newIndex * window.innerHeight,
        behavior: 'smooth'
      });

      setTimeout(() => setIsScrolling(false), 500);
    }
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') handleScroll('up');
      if (e.key === 'ArrowDown') handleScroll('down');
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, isScrolling]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const startY = touch.clientY;

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const deltaY = startY - touch.clientY;

      if (Math.abs(deltaY) > 50) {
        handleScroll(deltaY > 0 ? 'down' : 'up');
        document.removeEventListener('touchmove', handleTouchMove);
      }
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', () => {
      document.removeEventListener('touchmove', handleTouchMove);
    }, { once: true });
  };

  const convertOptions = (options: Json | null): string[] => {
    if (!options) return [];
    if (Array.isArray(options)) {
      return options.map(opt => String(opt));
    }
    console.warn('Invalid options format:', options);
    return [];
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

  if (error) {
    return (
      <div className="min-h-screen bg-black text-foreground flex items-center justify-center">
        <div className="glass-card p-8 text-red-500">
          Error loading reels. Please try again.
        </div>
      </div>
    );
  }

  if (!reels?.length) {
    return (
      <div className="min-h-screen bg-black text-foreground flex items-center justify-center">
        <div className="glass-card p-8">
          No reels available. Try uploading a document first!
        </div>
      </div>
    );
  }

  const allQuestions = reels.flatMap(reel => 
    reel.questions?.map(question => ({
      ...question,
      options: convertOptions(question.options)
    })) || []
  );

  return (
    <div className="min-h-screen bg-black text-foreground overflow-hidden">
      <ReelNavigation />
      
      <div 
        ref={containerRef}
        onTouchStart={handleTouchStart}
        className="h-screen overflow-y-auto snap-y snap-mandatory"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {allQuestions.map((question) => (
          <ReelQuestion 
            key={question.id} 
            question={{
              id: question.id,
              question: question.question,
              options: question.options,
              correct_answer: question.correct_answer
            }} 
          />
        ))}
      </div>
      
      <ReelScrollControls
        onScroll={handleScroll}
        isAtStart={currentIndex === 0}
        isAtEnd={allQuestions ? currentIndex === allQuestions.length - 1 : true}
      />
      
      <Navigation />
    </div>
  );
};

export default Reels;
