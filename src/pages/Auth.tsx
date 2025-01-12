import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth as SupabaseAuth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthError, AuthApiError } from '@supabase/supabase-js';

const Auth = () => {
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        // Check if user has a username
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', session?.user?.id)
          .single();

        if (!profile?.username) {
          navigate('/create-profile');
        } else {
          navigate('/');
        }
      }
      if (event === 'SIGNED_OUT') {
        navigate('/auth');
        setErrorMessage("");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const getErrorMessage = (error: AuthError) => {
    if (error instanceof AuthApiError) {
      switch (error.status) {
        case 400:
          return 'Invalid email or password';
        case 422:
          return 'Email already registered';
        default:
          return error.message;
      }
    }
    return error.message;
  };

  return (
    <div className="min-h-screen bg-[#1A1F2C] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4 bg-[#222222]/80 backdrop-blur-xl p-8 rounded-xl border border-white/10">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Welcome to LockIn</h1>
          <p className="text-gray-400">Sign in or create an account</p>
        </div>

        {errorMessage && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <SupabaseAuth 
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#333333',
                  brandAccent: '#444444',
                  inputBackground: '#1A1F2C',
                  inputText: 'white',
                  inputPlaceholder: '#666666',
                }
              }
            },
            className: {
              container: 'w-full',
              button: 'w-full px-4 py-2 text-white rounded transition-colors',
              input: 'w-full px-4 py-2 bg-[#1A1F2C] border border-white/10 rounded text-white placeholder-gray-500',
              label: 'text-sm text-gray-300',
            }
          }}
          theme="dark"
          providers={[]}
        />
      </div>
    </div>
  );
};

export default Auth;