
import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Link } from "react-router-dom";
import { ArrowLeft, Upload as UploadIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Upload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      // Auto-set title from filename if not manually set
      if (!title) {
        const fileName = e.target.files[0].name;
        // Remove file extension for title
        setTitle(fileName.split('.')[0]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive"
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a title for your document",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsUploading(true);
      
      // 1. Upload file to Supabase storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);
      
      if (uploadError) {
        throw new Error(`File upload failed: ${uploadError.message}`);
      }
      
      // 2. Save file metadata to the uploads table
      const { data: uploadRecord, error: uploadRecordError } = await supabase
        .from('uploads')
        .insert({
          file_name: file.name,
          file_path: filePath,
          file_type: file.type
        })
        .select()
        .single();
      
      if (uploadRecordError) {
        throw new Error(`Failed to save upload record: ${uploadRecordError.message}`);
      }
      
      setIsUploading(false);
      toast({
        title: "Upload Complete",
        description: "Document uploaded successfully. Processing content..."
      });
      
      // 3. Process the document to extract text and generate questions
      setIsProcessing(true);
      
      // Extract text from document
      let fileContent = "";
      
      // For text-based files, read the content
      if (file.type === 'text/plain' || file.type === 'application/pdf' || 
          file.type.includes('document') || file.type.includes('text')) {
        
        const { data } = await supabase.storage
          .from('documents')
          .download(filePath);
        
        if (data) {
          fileContent = await data.text();
        }
      }
      
      // 4. Use the edge function to process content and generate questions
      const { data: processedData, error: processError } = await supabase.functions
        .invoke('process-document', {
          body: { 
            content: fileContent, 
            title: title,
            uploadId: uploadRecord.id
          }
        });
      
      if (processError) {
        throw new Error(`Failed to process document: ${processError.message}`);
      }
      
      setIsProcessing(false);
      toast({
        title: "Success",
        description: "Document processed! Questions are now available in Study Reels."
      });
      
      // Reset form
      setFile(null);
      setTitle("");
      
    } catch (error: any) {
      console.error("Upload error:", error);
      setIsUploading(false);
      setIsProcessing(false);
      toast({
        title: "Error",
        description: error.message || "Failed to upload document. Please try again.",
        variant: "destructive"
      });
    }
  };
  
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
          <p className="text-sm text-white/60 mb-6">
            Share your PDF and text files to generate study questions
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white/80 text-sm mb-2">Document Title</label>
              <Input 
                type="text" 
                placeholder="Enter a title for your document"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isUploading || isProcessing}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            
            <div>
              <label className="block text-white/80 text-sm mb-2">Upload File</label>
              <div className="border-2 border-dashed border-white/20 rounded-md p-6 text-center">
                <input
                  type="file"
                  accept=".pdf,.txt,.doc,.docx"
                  onChange={handleFileChange}
                  disabled={isUploading || isProcessing}
                  className="hidden"
                  id="file-upload"
                />
                
                {file ? (
                  <div className="text-white">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-white/60">{(file.size / 1024).toFixed(2)} KB</p>
                    <button 
                      type="button" 
                      onClick={() => setFile(null)} 
                      className="text-xs text-blue-400 mt-2"
                      disabled={isUploading || isProcessing}
                    >
                      Choose different file
                    </button>
                  </div>
                ) : (
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <UploadIcon className="mx-auto h-8 w-8 text-white/40" />
                    <p className="text-white/60 mt-2">Click to select a file</p>
                    <p className="text-xs text-white/40 mt-1">PDF, TXT, DOC supported</p>
                  </label>
                )}
              </div>
            </div>
            
            <Button 
              type="submit" 
              disabled={!file || isUploading || isProcessing} 
              className="w-full"
            >
              {isUploading ? "Uploading..." : isProcessing ? "Processing..." : "Upload & Generate Questions"}
            </Button>
          </form>
        </div>
      </div>
      <Navigation />
    </div>
  );
};

export default Upload;
