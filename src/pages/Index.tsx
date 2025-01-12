import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
      }
    };
    
    checkAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto p-4">
        <header className="app-header">
          <h1 className="text-2xl font-bold">LockIn</h1>
        </header>

        <main className="space-y-6">
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold mb-4">Welcome to LockIn</h2>
            <p className="text-gray-300">
              Your personal space for focused study and productivity.
            </p>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => navigate('/chat')}
                className="p-4 glass-card hover:bg-white/5 transition-colors"
              >
                Study Chat
              </button>
              <button 
                onClick={() => navigate('/reels')}
                className="p-4 glass-card hover:bg-white/5 transition-colors"
              >
                Study Reels
              </button>
            </div>
          </div>
        </main>
      </div>
      <Navigation />
    </div>
  );
};

export default Index;