
import { Navigation } from "@/components/Navigation";
import { ReelNavigation } from "@/components/reels/ReelNavigation";

const Reels = () => {
  return (
    <div className="min-h-screen bg-black text-foreground overflow-hidden">
      <ReelNavigation />
      
      <div className="h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Study Reels</h1>
          <p className="text-white/60">Ready to start learning!</p>
        </div>
      </div>
      
      <Navigation />
    </div>
  );
};

export default Reels;
