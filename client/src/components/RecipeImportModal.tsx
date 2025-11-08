import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Link2, Camera, Mic, Upload } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "@/components/ObjectUploader";
import { VoiceAssistant } from "./VoiceAssistant";
import type { UploadResult } from "@uppy/core";

interface RecipeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RecipeImportModal({ isOpen, onClose }: RecipeImportModalProps) {
  const [url, setUrl] = useState('');
  const [voiceText, setVoiceText] = useState('');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const importFromUrlMutation = useMutation({
    mutationFn: async (url: string) => {
      return apiRequest('POST', '/api/recipes/import/url', { url });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
      toast({
        title: "Recipe Imported",
        description: "Recipe has been successfully imported from URL.",
      });
      onClose();
      setUrl('');
    },
    onError: () => {
      toast({
        title: "Import Failed",
        description: "Failed to import recipe from URL.",
        variant: "destructive",
      });
    },
  });

  const importFromPhotoMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      return apiRequest('POST', '/api/recipes/import/photo', { imageUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
      toast({
        title: "Recipe Imported",
        description: "Recipe has been successfully imported from photo.",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Import Failed",
        description: "Failed to import recipe from photo.",
        variant: "destructive",
      });
    },
  });

  const createRecipeMutation = useMutation({
    mutationFn: async (recipeData: any) => {
      return apiRequest('POST', '/api/recipes', recipeData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
      toast({
        title: "Recipe Created",
        description: "Recipe has been successfully created.",
      });
      onClose();
      setVoiceText('');
    },
    onError: () => {
      toast({
        title: "Creation Failed",
        description: "Failed to create recipe.",
        variant: "destructive",
      });
    },
  });

  const handleGetUploadParameters = async () => {
    const response = await apiRequest('POST', '/api/objects/upload');
    const data = await response.json();
    return {
      method: 'PUT' as const,
      url: data.uploadURL,
    };
  };

  const handlePhotoUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful[0]) {
      const uploadURL = result.successful[0].uploadURL;
      if (uploadURL) {
        importFromPhotoMutation.mutate(uploadURL);
      }
    }
  };

  const handleVoiceResult = (transcript: string) => {
    setVoiceText(transcript);
  };

  const handleVoiceSubmit = () => {
    if (voiceText.trim()) {
      // Parse the voice input as a recipe description
      createRecipeMutation.mutate({
        title: "Voice Recipe",
        description: voiceText,
        servings: 4
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Recipe</DialogTitle>
          <DialogDescription>
            Import recipes from URLs, photos, or create manually
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* URL Import */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <Link2 className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h4 className="font-medium">Import from URL</h4>
                  <p className="text-sm text-muted-foreground">Paste a recipe link</p>
                </div>
              </div>
              <div className="space-y-3">
                <Input
                  type="url"
                  placeholder="https://example.com/recipe"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  data-testid="input-recipe-url"
                />
                <Button
                  className="w-full"
                  onClick={() => importFromUrlMutation.mutate(url)}
                  disabled={!url.trim() || importFromUrlMutation.isPending}
                  data-testid="button-import-url"
                >
                  {importFromUrlMutation.isPending ? "Importing..." : "Import Recipe"}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Photo Import */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                  <Camera className="w-5 h-5 text-secondary-foreground" />
                </div>
                <div>
                  <h4 className="font-medium">Import from Photo</h4>
                  <p className="text-sm text-muted-foreground">Upload a recipe image</p>
                </div>
              </div>
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={10485760}
                onGetUploadParameters={handleGetUploadParameters}
                onComplete={handlePhotoUploadComplete}
                buttonClassName="w-full"
              >
                <div className="flex items-center space-x-2">
                  <Upload className="w-4 h-4" />
                  <span>Upload Photo</span>
                </div>
              </ObjectUploader>
            </CardContent>
          </Card>
          
          {/* Voice Import */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                  <Mic className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <h4 className="font-medium">Voice Recipe</h4>
                  <p className="text-sm text-muted-foreground">Describe your recipe</p>
                </div>
              </div>
              
              {!isVoiceMode ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setIsVoiceMode(true)}
                  data-testid="button-start-voice"
                >
                  Start Voice Input
                </Button>
              ) : (
                <div className="space-y-3">
                  <VoiceAssistant
                    onResult={handleVoiceResult}
                    context="planning"
                  />
                  {voiceText && (
                    <div className="space-y-2">
                      <Textarea
                        value={voiceText}
                        onChange={(e) => setVoiceText(e.target.value)}
                        placeholder="Recipe description..."
                        className="min-h-[100px]"
                        data-testid="textarea-voice-recipe"
                      />
                      <div className="flex space-x-2">
                        <Button
                          onClick={handleVoiceSubmit}
                          disabled={!voiceText.trim() || createRecipeMutation.isPending}
                          data-testid="button-submit-voice-recipe"
                        >
                          {createRecipeMutation.isPending ? "Creating..." : "Create Recipe"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsVoiceMode(false);
                            setVoiceText('');
                          }}
                          data-testid="button-cancel-voice"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
