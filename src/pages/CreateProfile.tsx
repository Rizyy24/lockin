import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

const CreateProfile = () => {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const checkUsername = async (value: string) => {
    if (!value) return;
    setIsChecking(true);
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', value)
      .single();
    
    setIsAvailable(!data);
    setIsChecking(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !isAvailable) return;

    setIsLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ username })
      .eq('id', (await supabase.auth.getUser()).data.user?.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    } else {
      toast({
        title: "Profile created",
        description: "Welcome to LockIn!"
      });
      navigate('/');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#1A1F2C] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 bg-[#222222]/80 backdrop-blur-xl p-8 rounded-xl border border-white/10">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Create Your Profile</h1>
          <p className="text-gray-400">Choose a username to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm text-gray-300">
              Username
            </label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                checkUsername(e.target.value);
              }}
              className="bg-[#1A1F2C] border-white/10 text-white"
              placeholder="Choose a username"
              disabled={isLoading}
            />
            {username && (
              <p className={`text-sm ${isAvailable ? 'text-green-500' : 'text-red-500'}`}>
                {isChecking ? (
                  <span className="flex items-center">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking availability...
                  </span>
                ) : (
                  username && (isAvailable ? '✓ Username is available' : '✗ Username is taken')
                )}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-[#333333] hover:bg-[#444444] text-white"
            disabled={!username || !isAvailable || isLoading}
          >
            {isLoading ? (
              <span className="flex items-center">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating profile...
              </span>
            ) : (
              'Create Profile'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default CreateProfile;