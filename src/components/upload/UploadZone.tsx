import { useState, useCallback } from "react";
import { UploadIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UploadZoneProps {
  onFileUpload: (files: File[]) => void;
  isUploading: boolean;
}

export const UploadZone = ({ onFileUpload, isUploading }: UploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateFiles = (files: File[]) => {
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB

    const invalidFiles = files.filter(file => !validTypes.includes(file.type));
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid file type",
        description: "Only PDF and PowerPoint files are allowed",
        variant: "destructive",
      });
      return false;
    }

    const oversizedFiles = files.filter(file => file.size > MAX_SIZE);
    if (oversizedFiles.length > 0) {
      toast({
        title: "File too large",
        description: "Files must be under 10MB",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    if (validateFiles(files)) {
      onFileUpload(files);
    }
  }, [onFileUpload, toast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (validateFiles(files)) {
      onFileUpload(files);
    }
  }, [onFileUpload]);

  return (
    <div
      className={`upload-zone relative ${isDragging ? 'border-primary border-2' : ''}`}
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
  );
};