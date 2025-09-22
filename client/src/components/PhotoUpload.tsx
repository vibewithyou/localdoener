import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Image, AlertCircle, CheckCircle2, Loader2, Camera, Tag, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface PhotoFile {
  file: File;
  id: string;
  preview: string;
  category: string;
  altText: string;
  description: string;
  tags: string[];
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
}

interface PhotoUploadProps {
  shopId?: string;
  onUploadComplete?: (photos: any[]) => void;
  maxFiles?: number;
  isOpen?: boolean;
  onClose?: () => void;
}

const PHOTO_CATEGORIES = [
  { value: 'storefront', label: 'Storefront' },
  { value: 'interior', label: 'Interior' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'food', label: 'Food' },
  { value: 'menu', label: 'Menu' },
  { value: 'logo', label: 'Logo' },
  { value: 'other', label: 'Other' }
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif']
};

export function PhotoUpload({ 
  shopId, 
  onUploadComplete, 
  maxFiles = 10,
  isOpen = false,
  onClose 
}: PhotoUploadProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: async (uploadData: { shopId: string; formData: FormData }) => {
      const response = await apiRequest('POST', `/api/admin/photos/upload/${uploadData.shopId}`, uploadData.formData, {
        headers: {
          'X-Admin-Secret': import.meta.env.VITE_ADMIN_SECRET || 'dev-secret'
        }
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Photos uploaded successfully",
        description: `${data.length} photos have been uploaded.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/photos'] });
      onUploadComplete?.(data);
      handleClearAll();
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload photos.",
        variant: "destructive",
      });
    }
  });

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    rejectedFiles.forEach(({ file, errors }) => {
      errors.forEach((error: any) => {
        if (error.code === 'file-too-large') {
          toast({
            title: "File too large",
            description: `${file.name} is larger than 10MB.`,
            variant: "destructive",
          });
        } else if (error.code === 'file-invalid-type') {
          toast({
            title: "Invalid file type",
            description: `${file.name} is not a supported image format.`,
            variant: "destructive",
          });
        }
      });
    });

    // Handle accepted files
    const newPhotos: PhotoFile[] = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      preview: URL.createObjectURL(file),
      category: 'other',
      altText: '',
      description: '',
      tags: [],
      status: 'pending',
      progress: 0
    }));

    setPhotos(prev => [...prev, ...newPhotos].slice(0, maxFiles));
  }, [maxFiles, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    maxFiles: maxFiles - photos.length,
    disabled: isUploading
  });

  const handleRemovePhoto = (id: string) => {
    setPhotos(prev => {
      const photo = prev.find(p => p.id === id);
      if (photo?.preview) {
        URL.revokeObjectURL(photo.preview);
      }
      return prev.filter(p => p.id !== id);
    });
  };

  const handleUpdatePhoto = (id: string, updates: Partial<PhotoFile>) => {
    setPhotos(prev => prev.map(photo => 
      photo.id === id ? { ...photo, ...updates } : photo
    ));
  };

  const handleClearAll = () => {
    photos.forEach(photo => {
      if (photo.preview) {
        URL.revokeObjectURL(photo.preview);
      }
    });
    setPhotos([]);
  };

  const handleUpload = async () => {
    if (!shopId) {
      toast({
        title: "No shop selected",
        description: "Please select a shop before uploading photos.",
        variant: "destructive",
      });
      return;
    }

    if (photos.length === 0) {
      toast({
        title: "No photos selected",
        description: "Please select at least one photo to upload.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      
      photos.forEach(photo => {
        formData.append('photos', photo.file);
      });

      // Add metadata for all photos
      formData.append('category', photos[0]?.category || 'other');
      formData.append('tags', JSON.stringify(photos.flatMap(p => p.tags)));

      await uploadMutation.mutateAsync({ shopId, formData });
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddTags = (photoId: string, newTag: string) => {
    if (newTag.trim()) {
      handleUpdatePhoto(photoId, {
        tags: [...(photos.find(p => p.id === photoId)?.tags || []), newTag.trim()]
      });
    }
  };

  const handleRemoveTag = (photoId: string, tagToRemove: string) => {
    const photo = photos.find(p => p.id === photoId);
    if (photo) {
      handleUpdatePhoto(photoId, {
        tags: photo.tags.filter(tag => tag !== tagToRemove)
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-photo-upload">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Upload Photos
          </DialogTitle>
          <DialogDescription>
            Upload photos for your shop. Drag and drop files or click to browse.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-gray-300 hover:border-gray-400'
              }
              ${isUploading ? 'pointer-events-none opacity-50' : ''}
            `}
            data-testid="dropzone-photo-upload"
          >
            <input {...getInputProps()} ref={fileInputRef} />
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-12 w-12 text-gray-400" />
              <div>
                <p className="text-lg font-medium">
                  {isDragActive ? 'Drop photos here' : 'Drag & drop photos here'}
                </p>
                <p className="text-sm text-gray-500">
                  or click to browse • JPG, PNG, WebP, GIF up to 10MB each
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {maxFiles - photos.length} of {maxFiles} remaining
                </p>
              </div>
            </div>
          </div>

          {/* Photo List */}
          {photos.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold" data-testid="text-photos-count">
                  Selected Photos ({photos.length})
                </h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleClearAll}
                  disabled={isUploading}
                  data-testid="button-clear-all"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              </div>

              <div className="grid gap-4">
                {photos.map(photo => (
                  <Card key={photo.id} className="overflow-hidden" data-testid={`card-photo-${photo.id}`}>
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {/* Photo Preview */}
                        <div className="flex-shrink-0">
                          <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100">
                            <img
                              src={photo.preview}
                              alt="Preview"
                              className="w-full h-full object-cover"
                              data-testid={`img-preview-${photo.id}`}
                            />
                            <Button
                              variant="destructive"
                              size="sm"
                              className="absolute top-1 right-1 w-6 h-6 p-0"
                              onClick={() => handleRemovePhoto(photo.id)}
                              disabled={isUploading}
                              data-testid={`button-remove-${photo.id}`}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Photo Metadata */}
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate" title={photo.file.name}>
                              {photo.file.name}
                            </p>
                            <Badge variant="secondary" className="text-xs">
                              {(photo.file.size / (1024 * 1024)).toFixed(1)} MB
                            </Badge>
                            {photo.status === 'completed' && (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                            {photo.status === 'error' && (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            )}
                            {photo.status === 'uploading' && (
                              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Category */}
                            <div>
                              <Label htmlFor={`category-${photo.id}`} className="text-sm">Category</Label>
                              <Select
                                value={photo.category}
                                onValueChange={(value) => handleUpdatePhoto(photo.id, { category: value })}
                                disabled={isUploading}
                              >
                                <SelectTrigger id={`category-${photo.id}`} data-testid={`select-category-${photo.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {PHOTO_CATEGORIES.map(cat => (
                                    <SelectItem key={cat.value} value={cat.value}>
                                      {cat.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Alt Text */}
                            <div>
                              <Label htmlFor={`alt-${photo.id}`} className="text-sm">Alt Text</Label>
                              <Input
                                id={`alt-${photo.id}`}
                                placeholder="Describe the image..."
                                value={photo.altText}
                                onChange={(e) => handleUpdatePhoto(photo.id, { altText: e.target.value })}
                                disabled={isUploading}
                                data-testid={`input-alt-${photo.id}`}
                              />
                            </div>
                          </div>

                          {/* Description */}
                          <div>
                            <Label htmlFor={`desc-${photo.id}`} className="text-sm">Description</Label>
                            <Textarea
                              id={`desc-${photo.id}`}
                              placeholder="Additional description..."
                              value={photo.description}
                              onChange={(e) => handleUpdatePhoto(photo.id, { description: e.target.value })}
                              rows={2}
                              disabled={isUploading}
                              data-testid={`textarea-description-${photo.id}`}
                            />
                          </div>

                          {/* Tags */}
                          <div>
                            <Label className="text-sm">Tags</Label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {photo.tags.map(tag => (
                                <Badge 
                                  key={tag} 
                                  variant="outline" 
                                  className="text-xs"
                                  data-testid={`badge-tag-${tag}`}
                                >
                                  {tag}
                                  <button
                                    onClick={() => handleRemoveTag(photo.id, tag)}
                                    className="ml-1 hover:text-red-500"
                                    disabled={isUploading}
                                    data-testid={`button-remove-tag-${tag}`}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                              <Input
                                placeholder="Add tag..."
                                className="w-24 h-6 text-xs"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddTags(photo.id, (e.target as HTMLInputElement).value);
                                    (e.target as HTMLInputElement).value = '';
                                  }
                                }}
                                disabled={isUploading}
                                data-testid={`input-add-tag-${photo.id}`}
                              />
                            </div>
                          </div>

                          {/* Progress */}
                          {photo.status === 'uploading' && (
                            <Progress value={photo.progress} className="h-2" />
                          )}

                          {/* Error */}
                          {photo.error && (
                            <p className="text-sm text-red-600">{photo.error}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Upload Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-gray-500">
                  {photos.length} photo{photos.length !== 1 ? 's' : ''} ready to upload
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={onClose}
                    disabled={isUploading}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleUpload}
                    disabled={photos.length === 0 || isUploading || !shopId}
                    data-testid="button-upload"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload {photos.length} Photo{photos.length !== 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}