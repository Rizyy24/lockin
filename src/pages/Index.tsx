import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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
    <div>
      <h1>Welcome to the Cozy Study Buddy!</h1>
      <p>This is the main page of your application.</p>
    </div>
  );
};

export default Index;
