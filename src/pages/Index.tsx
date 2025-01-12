import { Navigation } from "@/components/Navigation";
import { MessageCircle, Heart } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-black text-foreground p-6 page-transition">
      <div className="max-w-lg mx-auto pb-20">
        <div className="app-header">
          <h1 className="text-2xl font-bold text-white">LockIn</h1>
          <div className="flex gap-4">
            <Heart className="w-6 h-6 text-white/80 hover:text-white cursor-pointer" />
            <div className="relative">
              <Link to="/chat">
                <MessageCircle className="w-6 h-6 text-white/80 hover:text-white cursor-pointer" />
                <span className="notification-badge">1</span>
              </Link>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="glass-card p-8">
            <h2 className="text-xl text-white mb-4">Hey Username....</h2>
            <p className="text-white/60">
              Welcome back! Ready to continue your study session?
            </p>
          </div>
          
          <div className="glass-card p-8">
            <h3 className="text-lg text-white mb-2">Today's Goal</h3>
            <p className="text-white/60">
              Complete 5 practice questions from your uploaded materials
            </p>
          </div>
          
          <div className="glass-card p-8">
            <h3 className="text-lg text-white mb-2">Study Tip</h3>
            <p className="text-white/60">
              Take short breaks every 25 minutes to maintain focus and productivity
            </p>
          </div>
        </div>
      </div>
      <Navigation />
    </div>
  );
};

export default Index;