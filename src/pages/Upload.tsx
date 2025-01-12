import { Navigation } from "@/components/Navigation";
import { Upload as UploadIcon, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const Upload = () => {
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
        
        <div className="upload-zone">
          <UploadIcon className="w-12 h-12 mx-auto mb-4 text-white/60" />
          <p className="text-sm font-medium text-white">Click to upload or drag and drop</p>
          <p className="text-xs text-white/60 mt-2">
            PDF and PowerPoint files up to 10MB
          </p>
        </div>
      </div>
      <Navigation />
    </div>
  );
};

export default Upload;