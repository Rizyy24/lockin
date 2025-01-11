import { Navigation } from "@/components/Navigation";
import { ChevronUp, ChevronDown, Bookmark } from "lucide-react";

const Reels = () => {
  return (
    <div className="min-h-screen bg-background text-foreground page-transition">
      <div className="h-screen flex flex-col items-center justify-center p-6">
        <div className="glass-card p-8 w-full max-w-lg">
          <p className="text-sm text-muted-foreground mb-4">Question 1 of 10</p>
          <h2 className="text-xl font-medium mb-6">
            What is the primary function of mitochondria in a cell?
          </h2>
          
          <div className="space-y-4">
            <button className="w-full p-4 glass-card hover:bg-white/5 transition-colors text-left">
              A) Energy production
            </button>
            <button className="w-full p-4 glass-card hover:bg-white/5 transition-colors text-left">
              B) Protein synthesis
            </button>
            <button className="w-full p-4 glass-card hover:bg-white/5 transition-colors text-left">
              C) Cell division
            </button>
            <button className="w-full p-4 glass-card hover:bg-white/5 transition-colors text-left">
              D) Waste removal
            </button>
          </div>
          
          <div className="flex justify-between mt-8">
            <button className="p-2 glass-card hover:bg-white/5 transition-colors">
              <ChevronUp className="w-6 h-6" />
            </button>
            <button className="p-2 glass-card hover:bg-white/5 transition-colors">
              <Bookmark className="w-6 h-6" />
            </button>
            <button className="p-2 glass-card hover:bg-white/5 transition-colors">
              <ChevronDown className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
      <Navigation />
    </div>
  );
};

export default Reels;