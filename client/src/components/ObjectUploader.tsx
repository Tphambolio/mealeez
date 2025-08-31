import { useState, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, X, FileImage } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (result: any) => void;
  buttonClassName?: string;
  children: ReactNode;
}

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Validate file count
    if (files.length > maxNumberOfFiles) {
      toast({
        title: "Too many files",
        description: `Maximum ${maxNumberOfFiles} file(s) allowed`,
        variant: "destructive",
      });
      return;
    }

    // Validate file sizes
    const oversizedFiles = files.filter(file => file.size > maxFileSize);
    if (oversizedFiles.length > 0) {
      toast({
        title: "File too large",
        description: `Maximum file size is ${Math.round(maxFileSize / 1024 / 1024)}MB`,
        variant: "destructive",
      });
      return;
    }

    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    try {
      const results = [];
      
      for (const file of selectedFiles) {
        const { url } = await onGetUploadParameters();
        
        const response = await fetch(url, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        results.push({
          file,
          uploadURL: url,
          response,
        });
      }

      onComplete?.({
        successful: results,
        failed: [],
      });

      toast({
        title: "Upload successful",
        description: `${selectedFiles.length} file(s) uploaded successfully`,
      });

      setShowModal(false);
      setSelectedFiles([]);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload file(s). Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <Button 
        onClick={() => setShowModal(true)} 
        className={buttonClassName}
        data-testid="button-upload-file"
      >
        {children}
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Input
              ref={fileInputRef}
              type="file"
              multiple={maxNumberOfFiles > 1}
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {selectedFiles.length === 0 ? (
              <div 
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                onClick={openFileDialog}
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click to select {maxNumberOfFiles === 1 ? 'a file' : 'files'} or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Max size: {Math.round(maxFileSize / 1024 / 1024)}MB
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center space-x-2">
                      <FileImage className="w-4 h-4" />
                      <span className="text-sm truncate">{file.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                
                <div className="flex space-x-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={openFileDialog}
                    className="flex-1"
                  >
                    Change Files
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="flex-1"
                  >
                    {isUploading ? 'Uploading...' : 'Upload'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}