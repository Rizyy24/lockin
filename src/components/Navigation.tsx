import { Home, Plus, Video, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export const Navigation = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-black/90 border-t border-[#1e40af]/20 flex items-center justify-around px-4">
      <Link to="/" className={`nav-icon ${location.pathname === "/" ? "text-white" : ""}`}>
        <Home className="w-6 h-6" />
      </Link>
      <Link to="/upload" className={`nav-icon ${location.pathname === "/upload" ? "text-white" : ""}`}>
        <Plus className="w-6 h-6" />
      </Link>
      <Link to="/reels" className={`nav-icon ${location.pathname === "/reels" ? "text-white" : ""}`}>
        <Video className="w-6 h-6" />
      </Link>
      <Link to="/profile" className={`nav-icon ${location.pathname === "/profile" ? "text-white" : ""}`}>
        <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </div>
      </Link>
    </nav>
  );
};