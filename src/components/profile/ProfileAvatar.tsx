import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Upload, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ProfileAvatarProps {
  avatarUrl: string | null;
  onAvatarUpdate: (url: string | null) => void;
}

export const ProfileAvatar = ({ avatarUrl, onAvatarUpdate }: ProfileAvatarProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

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

      onAvatarUpdate(publicUrl);
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

  const handleRemoveAvatar = async () => {
    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (updateError) throw updateError;

      onAvatarUpdate(null);
      toast({
        title: "Success",
        description: "Profile picture removed successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error removing profile picture",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative">
      <Avatar className="w-24 h-24">
        <AvatarImage src={avatarUrl || undefined} />
        <AvatarFallback>
          <User className="w-12 h-12" />
        </AvatarFallback>
      </Avatar>
      <div className="flex gap-2 mt-2">
        <label 
          htmlFor="avatar-upload" 
          className="cursor-pointer"
        >
          <Button variant="secondary" size="sm" className="gap-2" disabled={isUploading}>
            <Upload className="w-4 h-4" />
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
            disabled={isUploading}
          />
        </label>
        {avatarUrl && (
          <Button 
            variant="destructive" 
            size="sm" 
            className="gap-2"
            onClick={handleRemoveAvatar}
            disabled={isUploading}
          >
            <Trash2 className="w-4 h-4" />
            Remove
          </Button>
        )}
      </div>
    </div>
  );
};