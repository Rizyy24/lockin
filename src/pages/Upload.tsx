import { useState, useCallback, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Upload as UploadIcon, ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const Upload = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const createStudyReel = async (uploadId: string, fileName: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: reel, error } = await supabase
      .from('study_reels')
      .insert({
        title: fileName,
        content: "Content will be processed...",
        type: "document",
        user_id: user.id,
        source_upload_id: uploadId
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating study reel:', error);
      return null;
    }

    return reel;
  };

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Check file types
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid file type",
        description: "Only PDF and PowerPoint files are allowed",
        variant: "destructive",
      });
      return;
    }

    // Check file sizes
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const oversizedFiles = files.filter(file => file.size > MAX_SIZE);
    
    if (oversizedFiles.length > 0) {
      toast({
        title: "File too large",
        description: "Files must be under 10MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

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

        // Create a study reel from the upload
        const reel = await createStudyReel(upload.id, file.name);
        
        if (!reel) {
          throw new Error('Failed to create study reel');
        }
      }

      toast({
        title: "Success",
        description: "Files uploaded and reels created successfully",
      });

      // Navigate to reels page after successful upload
      navigate('/reels');
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your files",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [toast, navigate]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const syntheticEvent = {
      preventDefault: () => {},
      dataTransfer: {
        files,
      },
      currentTarget: e.currentTarget,
      target: e.target,
      bubbles: true,
      cancelable: true,
      defaultPrevented: false,
      eventPhase: 0,
      isTrusted: true,
      timeStamp: Date.now(),
      type: 'drop',
    } as unknown as React.DragEvent<HTMLDivElement>;
    
    handleDrop(syntheticEvent);
  }, [handleDrop]);

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
        
        <div
          className={`upload-zone relative ${
            isDragging ? 'border-primary border-2' : ''
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isUploading ? (
            <div className="text-center">
              <Loader2 className="w-12 h-12 mx-auto mb-4 text-white/60 animate-spin" />
              <p className="text-sm font-medium text-white">Uploading...</p>
            </div>
          ) : (
            <>
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileSelect}
                accept=".pdf,.pptx"
                multiple
              />
              <UploadIcon className="w-12 h-12 mx-auto mb-4 text-white/60" />
              <p className="text-sm font-medium text-white">
                {isDragging ? "Drop files here" : "Click to upload or drag and drop"}
              </p>
              <p className="text-xs text-white/60 mt-2">
                PDF and PowerPoint files up to 10MB
              </p>
            </>
          )}
        </div>

        {uploads && uploads.length > 0 && (
          <div className="glass-card p-8">
            <h2 className="text-lg font-semibold text-white mb-4">Uploaded Documents</h2>
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {uploads.map((upload) => (
                  <div key={upload.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <UploadIcon className="w-5 h-5 text-white/60" />
                      <span className="text-sm text-white">{upload.file_name}</span>
                    </div>
                    <button
                      onClick={() => deleteUpload.mutate(upload.id)}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
      <Navigation />
    </div>
  );
};

export default Upload;
