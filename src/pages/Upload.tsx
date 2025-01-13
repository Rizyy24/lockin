import { useState, useCallback } from "react";
import { Navigation } from "@/components/Navigation";
import { Upload as UploadIcon, ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Upload = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

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
        
        const { error: uploadError } = await supabase.storage
          .from('study_materials')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase
          .from('uploads')
          .insert({
            file_name: file.name,
            file_type: file.type,
            file_path: fileName,
            user_id: user.id
          });

        if (dbError) throw dbError;
      }

      toast({
        title: "Success",
        description: "Files uploaded successfully",
      });
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
  }, [toast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Create a proper DragEvent-like object
    const dropEvent = new DragEvent('drop', {
      dataTransfer: new DataTransfer()
    });
    
    // Add the files to the DataTransfer object
    files.forEach(file => {
      dropEvent.dataTransfer?.items.add(file);
    });
    
    handleDrop(dropEvent);
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
      </div>
      <Navigation />
    </div>
  );
};

export default Upload;