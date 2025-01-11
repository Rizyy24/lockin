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
        
        <div className="space-y-4">
          <div className="message-bubble">
            <h2 className="text-xl text-white mb-2">Hey Username....</h2>
          </div>
          
          <div className="message-bubble">
            <h3 className="text-lg text-white/80 mb-2">Chatbot -</h3>
            <p className="text-white/60">
              Motivational post, or a wishing post or a reminder (all by the lockin chat bot)
            </p>
          </div>
          
          <div className="message-bubble">
            <h3 className="text-lg text-white/80 mb-2">Chatbot -</h3>
            <p className="text-white/60">
              Motivational post, or a wishing post or a reminder (all by the lockin chat bot)
            </p>
          </div>
        </div>
      </div>
      <Navigation />
    </div>
  );
};

export default Index;