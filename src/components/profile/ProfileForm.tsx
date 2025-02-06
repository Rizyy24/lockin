import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ProfileFormProps {
  username: string | null;
  bio: string | null;
  isSaving: boolean;
  onUsernameChange: (username: string) => void;
  onBioChange: (bio: string) => void;
  onSave: () => void;
}

export const ProfileForm = ({
  username,
  bio,
  isSaving,
  onUsernameChange,
  onBioChange,
  onSave,
}: ProfileFormProps) => {
  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium text-white/80">Username</label>
        <Input
          value={username || ''}
          onChange={(e) => onUsernameChange(e.target.value)}
          className="mt-1"
          placeholder="Enter your username"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-white/80">Bio</label>
        <Textarea
          value={bio || ''}
          onChange={(e) => onBioChange(e.target.value)}
          className="mt-1"
          placeholder="Tell us about yourself"
          rows={4}
        />
      </div>

      <Button
        onClick={onSave}
        disabled={isSaving}
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
  );
};