import { ArrowLeft, Search, Edit2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";

const Chat = () => {
  return (
    <div className="min-h-screen bg-black text-foreground">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-[#1e40af]/20">
        <Link to="/" className="text-white/80 hover:text-white">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-xl font-semibold text-white">Username</h1>
        <div className="ml-auto">
          <Edit2 className="w-6 h-6 text-white/80 hover:text-white cursor-pointer" />
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input 
            placeholder="Search" 
            className="w-full bg-[#1e1e1e] border-none pl-10 text-white placeholder:text-white/40"
          />
        </div>
      </div>

      {/* AI Quote Section */}
      <div className="p-4 border-b border-[#1e40af]/20">
        <div className="glass-card p-6">
          <h2 className="text-xl text-white text-center mb-2">AI generated quote</h2>
          <p className="text-white/60 text-center">
            "Success is not final, failure is not fatal: it is the courage to continue that counts."
          </p>
        </div>
      </div>

      {/* Messages/Requests Section */}
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white/80 font-medium">Messages</h3>
          <Link to="#" className="text-[#1e40af] hover:text-[#2563eb]">
            Requests
          </Link>
        </div>

        {/* StudyBot Message */}
        <div className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg cursor-pointer">
          <div className="w-12 h-12 rounded-full bg-[#1e40af] flex items-center justify-center">
            <span className="text-white text-sm">SB</span>
          </div>
          <div>
            <h4 className="text-white font-medium">StudyBot</h4>
            <p className="text-white/60 text-sm">Click to start chatting...</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;