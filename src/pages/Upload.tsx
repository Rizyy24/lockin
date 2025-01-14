import { useState, useCallback, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UploadZone } from "@/components/upload/UploadZone";
import { FileList } from "@/components/upload/FileList";

const Upload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
      }
    };
    checkAuth();
  }, [navigate]);

  const { data: uploads, isLoading } = useQuery({
    queryKey: ['uploads'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('uploads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const deleteUpload = useMutation({
    mutationFn: async (uploadId: string) => {
      const upload = uploads?.find(u => u.id === uploadId);
      if (!upload) return;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('study_materials')
        .remove([upload.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('uploads')
        .delete()
        .eq('id', uploadId);

      if (dbError) throw dbError;

      // Delete associated study reel
      const { error: reelError } = await supabase
        .from('study_reels')
        .delete()
        .eq('source_upload_id', uploadId);

      if (reelError) throw reelError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uploads'] });
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting file",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpload = useCallback(async (files: File[]) => {
    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('study_materials')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: upload, error: dbError } = await supabase
          .from('uploads')
          .insert({
            file_name: file.name,
            file_type: file.type,
            file_path: fileName,
            user_id: user.id
          })
          .select()
          .single();

        if (dbError) throw dbError;

        // Process document with OpenAI
        const { data: processedData, error: processError } = await supabase.functions
          .invoke('process-document', {
            body: { 
              content: await file.text(),
              title: file.name,
              uploadId: upload.id
            },
          });

        if (processError) throw processError;

        // Create study reel
        const { error: reelError } = await supabase
          .from('study_reels')
          .insert({
            title: file.name,
            content: "Content processed by AI",
            type: "document",
            user_id: user.id,
            source_upload_id: upload.id
          });

        if (reelError) throw reelError;
      }

      queryClient.invalidateQueries({ queryKey: ['uploads'] });
      toast({
        title: "Success",
        description: "Files uploaded and processed successfully",
      });
      
      navigate('/reels');
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [toast, navigate, queryClient]);

  return (
    <div className="min-h-screen bg-black text-foreground p-6 page-transition">
      <div className="fixed top-0 left-0 right-0 p-4">
        <Link to="/" className="text-white/80 hover:text-white">
          <ArrowLeft className="w-6 h-6" />
        </Link>
      </div>
      
      <div className="max-w-lg mx-auto space-y-6 pb-20 pt-16">
        <div className="glass-card p-8">
          <h1 className="text-2xl font-semibold text-white mb-4">Upload Documents</h1>
          <p className="text-sm text-white/60">
            Share your PDF and PowerPoint files to generate study questions
          </p>
        </div>
        
        <UploadZone
          onFileUpload={handleUpload}
          isUploading={isUploading}
        />

        <FileList
          uploads={uploads || []}
          onDelete={(id) => deleteUpload.mutate(id)}
          isDeleting={deleteUpload.isPending}
        />
      </div>
      <Navigation />
    </div>
  );
};

export default Upload;