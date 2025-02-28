
import { ScrollArea } from "@/components/ui/scroll-area";
import { UploadIcon, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface Upload {
  id: string;
  file_name: string;
  file_path: string;
  created_at: string;
}

interface FileListProps {
  uploads: Upload[];
  onRefetch: () => void;
}

export const FileList = ({ uploads, onRefetch }: FileListProps) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  if (!uploads || uploads.length === 0) return null;

  const handleDelete = async (upload: Upload) => {
    try {
      setDeletingId(upload.id);
      
      // 1. Delete the file from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([upload.file_path]);
        
      if (storageError) {
        console.error("Error deleting file from storage:", storageError);
        throw new Error("Failed to delete file from storage");
      }
      
      // 2. Delete associated study reels
      const { data: reels, error: reelsError } = await supabase
        .from('study_reels')
        .select('id')
        .eq('source_upload_id', upload.id);
        
      if (reelsError) {
        console.error("Error fetching associated reels:", reelsError);
      } else if (reels && reels.length > 0) {
        // Delete questions associated with these reels
        for (const reel of reels) {
          const { error: questionsError } = await supabase
            .from('questions')
            .delete()
            .eq('reel_id', reel.id);
            
          if (questionsError) {
            console.error("Error deleting questions:", questionsError);
          }
        }
        
        // Delete the reels
        const { error: reelDeleteError } = await supabase
          .from('study_reels')
          .delete()
          .eq('source_upload_id', upload.id);
          
        if (reelDeleteError) {
          console.error("Error deleting reels:", reelDeleteError);
        }
      }
      
      // 3. Delete the upload record
      const { error: uploadError } = await supabase
        .from('uploads')
        .delete()
        .eq('id', upload.id);
        
      if (uploadError) {
        console.error("Error deleting upload record:", uploadError);
        throw new Error("Failed to delete upload record");
      }
      
      // Refresh queries for uploads and reels
      queryClient.invalidateQueries({ queryKey: ["user-uploads"] });
      queryClient.invalidateQueries({ queryKey: ["study-reels"] });
      
      toast({
        title: "Document deleted",
        description: `"${upload.file_name}" has been removed`
      });
      
      onRefetch();
    } catch (error: any) {
      console.error("Error during deletion:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete document",
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="glass-card p-6 mt-6">
      <h2 className="text-lg font-semibold text-white mb-4">Your Documents</h2>
      <ScrollArea className="h-[250px] pr-4">
        <div className="space-y-3">
          {uploads.map((upload) => (
            <div key={upload.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-3 overflow-hidden">
                <UploadIcon className="w-5 h-5 text-white/60 shrink-0" />
                <span className="text-sm text-white truncate">{upload.file_name}</span>
              </div>
              <Button
                onClick={() => handleDelete(upload)}
                disabled={deletingId === upload.id}
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
              >
                {deletingId === upload.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
