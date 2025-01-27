import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export const ReelNavigation = () => {
  return (
    <div className="fixed top-0 left-0 right-0 p-4 z-50 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm">
      <Link to="/" className="text-white/80 hover:text-white transition-colors">
        <ArrowLeft className="w-6 h-6" />
      </Link>
    </div>
  );
};