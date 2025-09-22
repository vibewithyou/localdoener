import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Search, Filter, Eye, Edit, Trash2, Star, StarOff, MoveUp, MoveDown, Download, Tag, Grid, List, Camera, Upload, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import type { Photo, ShopWithDetails } from "@/lib/types";
import { PhotoUpload } from "./PhotoUpload";

interface PhotoGalleryProps {
  shopId?: string;
  onPhotoSelect?: (photo: Photo) => void;
  selectable?: boolean;
}

const PHOTO_CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'storefront', label: 'Storefront' },
  { value: 'interior', label: 'Interior' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'food', label: 'Food' },
  { value: 'menu', label: 'Menu' },
  { value: 'logo', label: 'Logo' },
  { value: 'other', label: 'Other' }
];

export function PhotoGallery({ shopId, onPhotoSelect, selectable = false }: PhotoGalleryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [editForm, setEditForm] = useState({
    altText: '',
    description: '',
    category: 'other',
    tags: [] as string[]
  });

  // Fetch photos
  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['/api/admin/photos', shopId, categoryFilter],
    queryFn: () => api.getAllPhotos({
      shopId,
      category: categoryFilter === 'all' ? undefined : categoryFilter,
      limit: 100
    }),
  });

  // Fetch shops for dropdown
  const { data: shops = [] } = useQuery({
    queryKey: ['/api/admin/shops'],
    queryFn: () => api.getShops({}),
  });

  // Filter photos based on search
  const filteredPhotos = useMemo(() => {
    let filtered = photos;

    if (searchQuery) {
      filtered = filtered.filter(photo => 
        photo.altText?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        photo.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        photo.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        photo.filename?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [photos, searchQuery]);

  // Mutations
  const deletePhotoMutation = useMutation({
    mutationFn: (photoId: string) => api.deletePhoto(photoId),
    onSuccess: () => {
      toast({ title: "Photo deleted", description: "Photo has been deleted successfully." });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/photos'] });
      setSelectedPhotos(prev => prev.filter(id => id !== photoId));
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete photo.",
        variant: "destructive",
      });
    },
  });

  const updatePhotoMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => api.updatePhoto(id, updates),
    onSuccess: () => {
      toast({ title: "Photo updated", description: "Photo has been updated successfully." });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/photos'] });
      setEditingPhoto(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update photo.",
        variant: "destructive",
      });
    },
  });

  const setPrimaryPhotoMutation = useMutation({
    mutationFn: (photoId: string) => api.setPrimaryPhoto(photoId),
    onSuccess: () => {
      toast({ title: "Primary photo set", description: "Photo has been set as primary." });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/photos'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set primary photo.",
        variant: "destructive",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (photoIds: string[]) => api.bulkDeletePhotos(photoIds),
    onSuccess: (_, photoIds) => {
      toast({ 
        title: "Photos deleted", 
        description: `${photoIds.length} photos have been deleted successfully.` 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/photos'] });
      setSelectedPhotos([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete photos.",
        variant: "destructive",
      });
    },
  });

  const handlePhotoClick = (photo: Photo) => {
    if (selectable && onPhotoSelect) {
      onPhotoSelect(photo);
    }
  };

  const handleSelectPhoto = (photoId: string, selected: boolean) => {
    setSelectedPhotos(prev => 
      selected 
        ? [...prev, photoId]
        : prev.filter(id => id !== photoId)
    );
  };

  const handleSelectAll = (selected: boolean) => {
    setSelectedPhotos(selected ? filteredPhotos.map(p => p.id) : []);
  };

  const handleEditPhoto = (photo: Photo) => {
    setEditingPhoto(photo);
    setEditForm({
      altText: photo.altText || '',
      description: photo.description || '',
      category: photo.category || 'other',
      tags: photo.tags || []
    });
  };

  const handleUpdatePhoto = () => {
    if (!editingPhoto) return;
    
    updatePhotoMutation.mutate({
      id: editingPhoto.id,
      updates: editForm
    });
  };

  const handleAddTag = (newTag: string) => {
    if (newTag.trim() && !editForm.tags.includes(newTag.trim())) {
      setEditForm(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const getShopName = (shopId: string) => {
    const shop = shops.find(s => s.id === shopId);
    return shop?.name || 'Unknown Shop';
  };

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      storefront: 'bg-blue-100 text-blue-800',
      interior: 'bg-green-100 text-green-800',
      exterior: 'bg-purple-100 text-purple-800',
      food: 'bg-orange-100 text-orange-800',
      menu: 'bg-red-100 text-red-800',
      logo: 'bg-gray-100 text-gray-800',
      other: 'bg-yellow-100 text-yellow-800'
    };
    return colors[category] || colors.other;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">Loading photos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" data-testid="text-gallery-title">Photo Gallery</h2>
          <p className="text-gray-600" data-testid="text-gallery-count">
            {filteredPhotos.length} photo{filteredPhotos.length !== 1 ? 's' : ''}
            {selectedPhotos.length > 0 && ` • ${selectedPhotos.length} selected`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowUploadDialog(true)}
            data-testid="button-upload-photos"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Photos
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search photos by name, description, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-photos"
            />
          </div>
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-category-filter">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PHOTO_CATEGORIES.map(category => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
            data-testid="button-grid-view"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
            data-testid="button-list-view"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedPhotos.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border">
          <span className="text-sm font-medium" data-testid="text-selected-count">
            {selectedPhotos.length} photo{selectedPhotos.length !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedPhotos([])}
              data-testid="button-clear-selection"
            >
              Clear Selection
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" data-testid="button-bulk-delete">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete Selected
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Photos</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {selectedPhotos.length} photo{selectedPhotos.length !== 1 ? 's' : ''}? 
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => bulkDeleteMutation.mutate(selectedPhotos)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {/* Photo Grid/List */}
      {filteredPhotos.length === 0 ? (
        <div className="text-center py-12">
          <Camera className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No photos found</h3>
          <p className="text-gray-500 mb-4">
            {searchQuery || categoryFilter !== 'all' 
              ? 'Try adjusting your search or filters.' 
              : 'Start by uploading some photos for your shops.'
            }
          </p>
          <Button onClick={() => setShowUploadDialog(true)} data-testid="button-upload-first">
            <Upload className="h-4 w-4 mr-2" />
            Upload Photos
          </Button>
        </div>
      ) : (
        <>
          {/* Select All */}
          <div className="flex items-center gap-2 border-b pb-2">
            <Checkbox
              checked={selectedPhotos.length === filteredPhotos.length}
              onCheckedChange={handleSelectAll}
              data-testid="checkbox-select-all"
            />
            <Label className="text-sm">
              Select all {filteredPhotos.length} photo{filteredPhotos.length !== 1 ? 's' : ''}
            </Label>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {filteredPhotos.map(photo => (
                <Card
                  key={photo.id}
                  className={`group cursor-pointer transition-all hover:shadow-md ${
                    selectedPhotos.includes(photo.id) ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => handlePhotoClick(photo)}
                  data-testid={`card-photo-${photo.id}`}
                >
                  <CardContent className="p-2">
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 mb-2">
                      <img
                        src={photo.thumbnailUrl || photo.url}
                        alt={photo.altText || 'Photo'}
                        className="w-full h-full object-cover"
                        data-testid={`img-photo-${photo.id}`}
                      />
                      
                      {/* Primary Badge */}
                      {photo.isPrimary && (
                        <Badge className="absolute top-1 left-1 bg-yellow-500">
                          <Star className="h-3 w-3" />
                        </Badge>
                      )}
                      
                      {/* Selection Checkbox */}
                      <div className="absolute top-1 right-1">
                        <Checkbox
                          checked={selectedPhotos.includes(photo.id)}
                          onCheckedChange={(checked) => handleSelectPhoto(photo.id, !!checked)}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-white border-white"
                          data-testid={`checkbox-photo-${photo.id}`}
                        />
                      </div>

                      {/* Actions Menu */}
                      <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="secondary" className="h-6 w-6 p-0">
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditPhoto(photo)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setPrimaryPhotoMutation.mutate(photo.id)}
                              disabled={photo.isPrimary}
                            >
                              {photo.isPrimary ? (
                                <StarOff className="h-4 w-4 mr-2" />
                              ) : (
                                <Star className="h-4 w-4 mr-2" />
                              )}
                              {photo.isPrimary ? 'Remove Primary' : 'Set Primary'}
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a href={photo.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View Full Size
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => deletePhotoMutation.mutate(photo.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge className={`text-xs ${getCategoryBadgeColor(photo.category || 'other')}`}>
                          {photo.category || 'other'}
                        </Badge>
                        {photo.source === 'google' && (
                          <Badge variant="outline" className="text-xs">
                            Google
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 truncate" title={photo.filename}>
                        {photo.filename}
                      </p>
                      {!shopId && (
                        <p className="text-xs text-gray-500 truncate">
                          {getShopName(photo.shopId)}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPhotos.map(photo => (
                <Card key={photo.id} data-testid={`card-photo-list-${photo.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Checkbox
                        checked={selectedPhotos.includes(photo.id)}
                        onCheckedChange={(checked) => handleSelectPhoto(photo.id, !!checked)}
                        data-testid={`checkbox-photo-list-${photo.id}`}
                      />
                      
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        <img
                          src={photo.thumbnailUrl || photo.url}
                          alt={photo.altText || 'Photo'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">{photo.filename}</p>
                          {photo.isPrimary && (
                            <Badge className="bg-yellow-500">
                              <Star className="h-3 w-3" />
                            </Badge>
                          )}
                          <Badge className={`text-xs ${getCategoryBadgeColor(photo.category || 'other')}`}>
                            {photo.category || 'other'}
                          </Badge>
                          {photo.source === 'google' && (
                            <Badge variant="outline" className="text-xs">
                              Google
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-1">
                          {photo.description || photo.altText || 'No description'}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {!shopId && <span>{getShopName(photo.shopId)}</span>}
                          <span>{photo.width}×{photo.height}</span>
                          {photo.fileSize && (
                            <span>{(photo.fileSize / (1024 * 1024)).toFixed(1)} MB</span>
                          )}
                        </div>
                        
                        {photo.tags && photo.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {photo.tags.map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditPhoto(photo)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setPrimaryPhotoMutation.mutate(photo.id)}
                            disabled={photo.isPrimary}
                          >
                            {photo.isPrimary ? (
                              <StarOff className="h-4 w-4 mr-2" />
                            ) : (
                              <Star className="h-4 w-4 mr-2" />
                            )}
                            {photo.isPrimary ? 'Remove Primary' : 'Set Primary'}
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <a href={photo.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View Full Size
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => deletePhotoMutation.mutate(photo.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Photo Upload Dialog */}
      <PhotoUpload
        shopId={shopId}
        isOpen={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
        onUploadComplete={() => {
          setShowUploadDialog(false);
          queryClient.invalidateQueries({ queryKey: ['/api/admin/photos'] });
        }}
      />

      {/* Edit Photo Dialog */}
      <Dialog open={!!editingPhoto} onOpenChange={() => setEditingPhoto(null)}>
        <DialogContent className="max-w-2xl" data-testid="dialog-edit-photo">
          <DialogHeader>
            <DialogTitle>Edit Photo</DialogTitle>
            <DialogDescription>
              Update photo details and metadata
            </DialogDescription>
          </DialogHeader>

          {editingPhoto && (
            <div className="space-y-4">
              {/* Photo Preview */}
              <div className="flex items-start gap-4">
                <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  <img
                    src={editingPhoto.thumbnailUrl || editingPhoto.url}
                    alt={editingPhoto.altText || 'Photo'}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <p className="font-medium">{editingPhoto.filename}</p>
                  <p className="text-sm text-gray-600">
                    {editingPhoto.width}×{editingPhoto.height}
                    {editingPhoto.fileSize && ` • ${(editingPhoto.fileSize / (1024 * 1024)).toFixed(1)} MB`}
                  </p>
                  <p className="text-sm text-gray-600">
                    Shop: {getShopName(editingPhoto.shopId)}
                  </p>
                </div>
              </div>

              {/* Edit Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-category">Category</Label>
                  <Select
                    value={editForm.category}
                    onValueChange={(value) => setEditForm(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger id="edit-category" data-testid="select-edit-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PHOTO_CATEGORIES.slice(1).map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="edit-alt">Alt Text</Label>
                  <Input
                    id="edit-alt"
                    value={editForm.altText}
                    onChange={(e) => setEditForm(prev => ({ ...prev, altText: e.target.value }))}
                    placeholder="Describe the image..."
                    data-testid="input-edit-alt"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Additional description..."
                  rows={3}
                  data-testid="textarea-edit-description"
                />
              </div>

              <div>
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-1 mt-1 mb-2">
                  {editForm.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-red-500"
                        data-testid={`button-remove-edit-tag-${tag}`}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                <Input
                  placeholder="Add tag..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag((e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                  data-testid="input-add-edit-tag"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditingPhoto(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdatePhoto}
                  disabled={updatePhotoMutation.isPending}
                  data-testid="button-save-edit"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}