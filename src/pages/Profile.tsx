import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Upload } from "lucide-react";

interface Profile {
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
}

const Profile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => ({ ...prev!, avatar_url: publicUrl }));
      toast({
        title: "Success",
        description: "Profile picture updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error updating profile picture",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

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
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback>
                  <User className="w-12 h-12" />
                </AvatarFallback>
              </Avatar>
              <label 
                htmlFor="avatar-upload" 
                className="absolute bottom-0 right-0 p-1 bg-white/10 rounded-full cursor-pointer hover:bg-white/20 transition-colors"
              >
                <Upload className="w-4 h-4 text-white" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-white/80">Username</label>
              <Input
                value={profile?.username || ''}
                onChange={(e) => setProfile(prev => ({ ...prev!, username: e.target.value }))}
                className="mt-1"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-white/80">Bio</label>
              <Textarea
                value={profile?.bio || ''}
                onChange={(e) => setProfile(prev => ({ ...prev!, bio: e.target.value }))}
                className="mt-1"
                placeholder="Tell us about yourself"
                rows={4}
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={isSaving || isUploading}
              className="w-full"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </div>
      <Navigation />
    </div>
  );
};

export default Profile;