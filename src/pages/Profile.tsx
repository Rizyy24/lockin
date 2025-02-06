import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { ProfileForm } from "@/components/profile/ProfileForm";

interface Profile {
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
}

const Profile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('username, avatar_url, bio')
        .eq('id', user.id)
        .single();

      if (error) {
        toast({
          title: "Error fetching profile",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setProfile(data);
      setIsLoading(false);
    };

    fetchProfile();
  }, [navigate, toast]);

  const handleSave = async () => {
    if (!profile) return;

    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate('/auth');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        username: profile.username,
        bio: profile.bio,
      })
      .eq('id', user.id);

    setIsSaving(false);

    if (error) {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Profile updated",
      description: "Your profile has been successfully updated.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-foreground">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="glass-card p-8">
          <div className="flex flex-col items-center space-y-4 mb-8">
            <ProfileAvatar 
              avatarUrl={profile?.avatar_url || null}
              onAvatarUpdate={(url) => setProfile(prev => prev ? { ...prev, avatar_url: url } : null)}
            />
          </div>

          <ProfileForm
            username={profile?.username || null}
            bio={profile?.bio || null}
            isSaving={isSaving}
            onUsernameChange={(username) => setProfile(prev => prev ? { ...prev, username } : null)}
            onBioChange={(bio) => setProfile(prev => prev ? { ...prev, bio } : null)}
            onSave={handleSave}
          />
        </div>
      </div>
      <Navigation />
    </div>
  );
};

export default Profile;