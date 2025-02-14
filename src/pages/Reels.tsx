
import { Navigation } from "@/components/Navigation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef, useEffect } from "react";
import { ReelQuestion } from "@/components/reels/ReelQuestion";
import { ReelFlashcard } from "@/components/reels/ReelFlashcard";
import { ReelScrollControls } from "@/components/reels/ReelScrollControls";
import { ReelNavigation } from "@/components/reels/ReelNavigation";

const Reels = () => {
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  const { data: questions, isLoading, error } = useQuery({
    queryKey: ['study-content'],
    queryFn: async () => {
      console.log('Fetching study content...');
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching content:', error);
        toast({
          title: "Error loading content",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }

      console.log('Fetched content:', data);
      return data;
    },
  });

  const handleScroll = (direction: 'up' | 'down') => {
    if (isScrolling || !containerRef.current || !questions?.length) return;

    const newIndex = direction === 'down' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex >= 0 && newIndex < questions.length) {
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-foreground flex items-center justify-center">
        <div className="glass-card p-8">
          Loading study content...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-foreground flex items-center justify-center">
        <div className="glass-card p-8 text-red-500">
          Error loading content. Please try again.
        </div>
      </div>
    );
  }

  if (!questions?.length) {
    return (
      <div className="min-h-screen bg-black text-foreground flex items-center justify-center">
        <div className="glass-card p-8">
          No content available. Try uploading a document first!
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-foreground overflow-hidden">
      <ReelNavigation />
      
      <div 
        ref={containerRef}
        onTouchStart={handleTouchStart}
        className="h-screen overflow-y-auto snap-y snap-mandatory"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {questions.map((item) => (
          <div 
            key={item.id}
            className="h-screen snap-start snap-always"
          >
            {item.type === 'multiple_choice' ? (
              <ReelQuestion question={item.content} />
            ) : (
              <ReelFlashcard content={item.content} />
            )}
          </div>
        ))}
      </div>
      
      <ReelScrollControls
        onScroll={handleScroll}
        isAtStart={currentIndex === 0}
        isAtEnd={questions ? currentIndex === questions.length - 1 : true}
      />
      
      <Navigation />
    </div>
  );
};

export default Reels;
