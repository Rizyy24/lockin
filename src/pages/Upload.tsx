
import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Link } from "react-router-dom";
import { ArrowLeft, Upload as UploadIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileList } from "@/components/upload/FileList";

const Upload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [convertApiKey, setConvertApiKey] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch previous uploads for the current user
  const { data: previousUploads = [], refetch: refetchUploads } = useQuery({
    queryKey: ["user-uploads"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return [];
      }
      
      const { data, error } = await supabase
        .from("uploads")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
        
      if (error) {
        console.error("Error fetching uploads:", error);
        return [];
      }
      
      return data || [];
    },
  });

  // Fetch the ConvertAPI key from Supabase
  useQuery({
    queryKey: ["convert-api-key"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-convert-api-key');
      
      if (error) {
        console.error("Error fetching ConvertAPI key:", error);
        return null;
      }
      
      if (data?.key) {
        setConvertApiKey(data.key);
      }
      
      return data;
    },
  });

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

  const convertPdfToText = async (file: File): Promise<string> => {
    try {
      if (!convertApiKey) {
        throw new Error("ConvertAPI key not available. Please check your configuration.");
      }

      // Create form data for the ConvertAPI
      const formData = new FormData();
      formData.append('File', file);
      
      // Call the ConvertAPI service
      const response = await fetch(`https://v2.convertapi.com/convert/pdf/to/txt?Secret=${convertApiKey}`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error("ConvertAPI error:", errorData);
        throw new Error(`ConvertAPI returned error: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Get the converted file URL from the response
      if (result.Files && result.Files.length > 0) {
        const convertedFileUrl = result.Files[0].Url;
        
        // Fetch the text content
        const textResponse = await fetch(convertedFileUrl);
        if (!textResponse.ok) {
          throw new Error(`Failed to download converted text: ${textResponse.status}`);
        }
        
        return await textResponse.text();
      } else {
        throw new Error("No converted files returned from ConvertAPI");
      }
    } catch (error) {
      console.error("PDF conversion error:", error);
      throw new Error(`Failed to convert PDF to text: ${error.message}`);
    }
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    // For plain text files, just read the text content
    if (file.type === 'text/plain') {
      return await file.text();
    }
    
    // For PDFs, use ConvertAPI to extract text
    if (file.type === 'application/pdf') {
      try {
        return await convertPdfToText(file);
      } catch (error) {
        console.error("PDF text extraction error:", error);
        throw error;
      }
    }
    
    // For Word documents and other formats
    if (file.type.includes('document') || file.type.includes('text')) {
      try {
        // ConvertAPI also supports other document formats but we'll need to
        // modify the conversion endpoint and parameters accordingly
        return await file.text();
      } catch (error) {
        console.error("Document text extraction error:", error);
        return "Document text extraction limited. Please upload plain text files for best results.";
      }
    }
    
    return "File format not supported for text extraction. Please upload text files.";
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

    // Check if the ConvertAPI key is available for PDF conversion
    if (file.type === 'application/pdf' && !convertApiKey) {
      toast({
        title: "Error",
        description: "ConvertAPI key not configured. PDF conversion unavailable.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsUploading(true);

      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Authentication required');
      }
      
      // Extract text from document (before uploading)
      setIsProcessing(true);
      toast({
        title: "Processing Document",
        description: "Converting and extracting text content..."
      });
      
      // Extract text from document (PDF, txt, doc, etc.)
      const fileContent = await extractTextFromFile(file);
      
      if (!fileContent || fileContent.trim() === '') {
        throw new Error("Could not extract text content from the document");
      }
      
      // Create a text file from the extracted content
      const textBlob = new Blob([fileContent], { type: 'text/plain' });
      const textFile = new File([textBlob], `${title}.txt`, { type: 'text/plain' });
      
      // 1. Upload original file to Supabase storage
      const originalFileExt = file.name.split('.').pop();
      const originalFilePath = `original_${crypto.randomUUID()}.${originalFileExt}`;
      
      const { error: originalUploadError } = await supabase.storage
        .from('documents')
        .upload(originalFilePath, file);
      
      if (originalUploadError) {
        console.warn(`Original file upload failed: ${originalUploadError.message}`);
        // Continue even if original upload fails
      }
      
      // 2. Upload text file to Supabase storage
      const textFilePath = `${crypto.randomUUID()}.txt`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(textFilePath, textFile);
      
      if (uploadError) {
        throw new Error(`Text file upload failed: ${uploadError.message}`);
      }
      
      // 3. Save file metadata to the uploads table
      const { data: uploadRecord, error: uploadRecordError } = await supabase
        .from('uploads')
        .insert({
          file_name: `${title}.txt`,
          file_path: textFilePath,
          file_type: 'text/plain',
          user_id: user.id
        })
        .select()
        .single();
      
      if (uploadRecordError) {
        throw new Error(`Failed to save upload record: ${uploadRecordError.message}`);
      }
      
      setIsUploading(false);
      
      toast({
        title: "Text Extraction Complete",
        description: "Generating questions from content..."
      });
      
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
      
      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ["user-uploads"] });
      queryClient.invalidateQueries({ queryKey: ["study-reels"] });
      
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
            Share your PDF and text files to generate study questions from your content
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
                    <p className="text-xs text-white/40 mt-1">PDF and TXT files are fully supported</p>
                  </label>
                )}
              </div>
            </div>
            
            <Button 
              type="submit" 
              disabled={!file || isUploading || isProcessing || (file?.type === 'application/pdf' && !convertApiKey)} 
              className="w-full"
            >
              {isUploading ? "Converting & Uploading..." : isProcessing ? "Processing Content..." : "Upload & Generate Questions"}
            </Button>
          </form>
        </div>
        
        {/* Display the list of previously uploaded documents */}
        {previousUploads && previousUploads.length > 0 && (
          <FileList 
            uploads={previousUploads} 
            onRefetch={refetchUploads}
          />
        )}
      </div>
      <Navigation />
    </div>
  );
};

export default Upload;
