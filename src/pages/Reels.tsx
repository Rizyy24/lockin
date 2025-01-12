import { Navigation } from "@/components/Navigation";
import { ChevronUp, ChevronDown, Bookmark, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const Reels = () => {
  return (
    <div className="min-h-screen bg-black text-foreground page-transition">
      <div className="fixed top-0 left-0 right-0 p-4">
        <Link to="/" className="text-white/80 hover:text-white">
          <ArrowLeft className="w-6 h-6" />
        </Link>
      </div>
      
      <div className="h-screen flex flex-col items-center justify-center p-6">
        <div className="glass-card p-8 w-full max-w-lg">
          <p className="text-sm text-white/60 mb-4">Question 1 of 10</p>
          <h2 className="text-xl font-medium text-white mb-6">
            What is the primary function of mitochondria in a cell?
          </h2>
          
          <div className="space-y-4">
            <button className="w-full p-4 glass-card hover:bg-white/5 transition-colors text-left text-white">
              A) Energy production
            </button>
            <button className="w-full p-4 glass-card hover:bg-white/5 transition-colors text-left text-white">
              B) Protein synthesis
            </button>
            <button className="w-full p-4 glass-card hover:bg-white/5 transition-colors text-left text-white">
              C) Cell division
            </button>
            <button className="w-full p-4 glass-card hover:bg-white/5 transition-colors text-left text-white">
              D) Waste removal
            </button>
          </div>
          
          <div className="flex justify-between mt-8">
            <button className="p-2 glass-card hover:bg-white/5 transition-colors text-white">
              <ChevronUp className="w-6 h-6" />
            </button>
            <button className="p-2 glass-card hover:bg-white/5 transition-colors text-white">
              <Bookmark className="w-6 h-6" />
            </button>
            <button className="p-2 glass-card hover:bg-white/5 transition-colors text-white">
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