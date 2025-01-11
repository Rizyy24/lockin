import { Heart, Plus, Video } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export const Navigation = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 glass-card border-t border-white/10 flex items-center justify-around px-4">
      <Link to="/" className={`nav-icon ${location.pathname === "/" ? "text-white" : ""}`}>
        <Heart className="w-6 h-6" />
      </Link>
      <Link to="/upload" className={`nav-icon ${location.pathname === "/upload" ? "text-white" : ""}`}>
        <Plus className="w-6 h-6" />
      </Link>
      <Link to="/reels" className={`nav-icon ${location.pathname === "/reels" ? "text-white" : ""}`}>
        <Video className="w-6 h-6" />
      </Link>
    </nav>
  );
};