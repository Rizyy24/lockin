import { ScrollArea } from "@/components/ui/scroll-area";
import { UploadIcon, Trash2, Loader2 } from "lucide-react";

interface Upload {
  id: string;
  file_name: string;
  created_at: string;
}

interface FileListProps {
  uploads: Upload[];
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export const FileList = ({ uploads, onDelete, isDeleting }: FileListProps) => {
  if (!uploads || uploads.length === 0) return null;

  return (
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
                onClick={() => onDelete(upload.id)}
                disabled={isDeleting}
                className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 text-red-400" />
                )}
              </button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};