import { Navigation } from "@/components/Navigation";
import { Upload as UploadIcon } from "lucide-react";

const Upload = () => {
  return (
    <div className="min-h-screen bg-background text-foreground p-6 page-transition">
      <div className="max-w-lg mx-auto space-y-6 pb-20">
        <h1 className="text-2xl font-semibold mb-8">Upload Documents</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Share your PDF and PowerPoint files
        </p>
        
        <div className="upload-zone">
          <UploadIcon className="w-12 h-12 mx-auto mb-4 text-white/60" />
          <p className="text-sm font-medium">Click to upload or drag and drop</p>
          <p className="text-xs text-muted-foreground mt-2">
            PDF and PowerPoint files up to 10MB
          </p>
        </div>
      </div>
      <Navigation />
    </div>
  );
};

export default Upload;