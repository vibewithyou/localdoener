import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { LogOut, Check, X, Plus, Edit, Eye, Trash, Search, Filter, BarChart3, Users, MapPin, Star, Clock, Download, Upload, Settings, AlertCircle, Globe } from "lucide-react";
import { GooglePlacesImport } from "@/components/GooglePlacesImport";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import type { Submission, ShopWithDetails, Review } from "@/lib/types";
import { PhotoGallery } from "@/components/PhotoGallery";

// Form schemas
const shopFormSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich"),
  street: z.string().min(1, "Straße ist erforderlich"),
  city: z.string().min(1, "Stadt ist erforderlich"),
  zip: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  lat: z.string().min(1, "Latitude ist erforderlich"),
  lng: z.string().min(1, "Longitude ist erforderlich"),
  priceLevel: z.number().min(1).max(4).optional(),
  halal: z.boolean(),
  veg: z.boolean(),
  meatType: z.string().optional(),
  isPublished: z.boolean(),
});

type ShopFormData = z.infer<typeof shopFormSchema>;

export default function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedShops, setSelectedShops] = useState<string[]>([]);
  const [showShopDialog, setShowShopDialog] = useState(false);
  const [editingShop, setEditingShop] = useState<ShopWithDetails | null>(null);

  // Fetch data for different tabs
  const { data: submissions = [], isLoading: submissionsLoading } = useQuery({
    queryKey: ['/api/admin/submissions', 'pending'],
    queryFn: () => api.getSubmissions('pending'),
  });

  const { data: allShops = [], isLoading: shopsLoading } = useQuery({
    queryKey: ['/api/admin/shops'],
    queryFn: () => api.getShops({}),
  });

  const { data: allReviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ['/api/admin/reviews'],
    queryFn: () => api.getAllReviews(),
    enabled: activeTab === 'reviews',
  });

  const { data: cities = [] } = useQuery({
    queryKey: ['/api/cities'],
    queryFn: () => api.getCities(),
  });

  // Filter shops based on search and filters
  const filteredShops = useMemo(() => {
    let filtered = allShops;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (shop) =>
          shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          shop.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
          shop.street.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // City filter
    if (cityFilter !== 'all') {
      filtered = filtered.filter((shop) => shop.city === cityFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((shop) => 
        statusFilter === 'published' ? shop.isPublished : !shop.isPublished
      );
    }

    return filtered;
  }, [allShops, searchQuery, cityFilter, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const totalShops = allShops.length;
    const publishedShops = allShops.filter(shop => shop.isPublished).length;
    const totalReviews = allShops.reduce((acc, shop) => acc + (shop.reviewCount || 0), 0);
    const avgRating = allShops.length > 0 
      ? allShops.reduce((acc, shop) => acc + (shop.avgRating || 0), 0) / allShops.length 
      : 0;
    const pendingSubmissions = submissions.length;
    const citiesWithShops = [...new Set(allShops.map(shop => shop.city))].length;

    return {
      totalShops,
      publishedShops,
      totalReviews,
      avgRating,
      pendingSubmissions,
      citiesWithShops,
    };
  }, [allShops, submissions]);

  // Shop form
  const shopForm = useForm<ShopFormData>({
    resolver: zodResolver(shopFormSchema),
    defaultValues: {
      name: "",
      street: "",
      city: "",
      zip: "",
      phone: "",
      website: "",
      lat: "",
      lng: "",
      priceLevel: 2,
      halal: false,
      veg: false,
      meatType: "",
      isPublished: true,
    },
  });

  // Mutations
  const updateSubmissionMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) =>
      api.updateSubmissionStatus(id, status),
    onSuccess: (data, variables) => {
      toast({
        title: variables.status === 'approved' ? "Meldung genehmigt" : "Meldung abgelehnt",
        description: "Die Änderung wurde gespeichert.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/submissions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Aktion konnte nicht ausgeführt werden.",
        variant: "destructive",
      });
    },
  });

  const createShopMutation = useMutation({
    mutationFn: (data: ShopFormData) => api.createShop(data),
    onSuccess: () => {
      toast({
        title: "Shop erstellt",
        description: "Der Shop wurde erfolgreich erstellt.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/shops'] });
      setShowShopDialog(false);
      shopForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Shop konnte nicht erstellt werden.",
        variant: "destructive",
      });
    },
  });

  const updateShopMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ShopFormData> }) => 
      api.updateShop(id, data),
    onSuccess: () => {
      toast({
        title: "Shop aktualisiert",
        description: "Die Änderungen wurden gespeichert.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/shops'] });
      setEditingShop(null);
      setShowShopDialog(false);
      shopForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Shop konnte nicht aktualisiert werden.",
        variant: "destructive",
      });
    },
  });

  const deleteShopMutation = useMutation({
    mutationFn: (id: string) => api.deleteShop(id),
    onSuccess: () => {
      toast({
        title: "Shop gelöscht",
        description: "Der Shop wurde erfolgreich gelöscht.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/shops'] });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Shop konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: ({ ids, updates }: { ids: string[]; updates: Partial<ShopFormData> }) =>
      api.bulkUpdateShops(ids, updates),
    onSuccess: () => {
      toast({
        title: "Shops aktualisiert",
        description: `${selectedShops.length} Shops wurden erfolgreich aktualisiert.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/shops'] });
      setSelectedShops([]);
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Bulk-Update fehlgeschlagen.",
        variant: "destructive",
      });
    },
  });

  // Event handlers
  const handleSubmissionAction = (id: string, status: 'approved' | 'rejected') => {
    updateSubmissionMutation.mutate({ id, status });
  };

  const handleDeleteShop = (id: string, name: string) => {
    if (window.confirm(`Shop "${name}" wirklich löschen?`)) {
      deleteShopMutation.mutate(id);
    }
  };

  const handleShopSubmit = (data: ShopFormData) => {
    if (editingShop) {
      updateShopMutation.mutate({ id: editingShop.id, data });
    } else {
      createShopMutation.mutate(data);
    }
  };

  const handleEditShop = (shop: ShopWithDetails) => {
    setEditingShop(shop);
    shopForm.reset({
      name: shop.name,
      street: shop.street,
      city: shop.city,
      zip: shop.zip || "",
      phone: shop.phone || "",
      website: shop.website || "",
      lat: shop.lat,
      lng: shop.lng,
      priceLevel: shop.priceLevel || 2,
      halal: shop.halal,
      veg: shop.veg,
      meatType: shop.meatType || "",
      isPublished: shop.isPublished,
    });
    setShowShopDialog(true);
  };

  const handleShopSelection = (shopId: string, selected: boolean) => {
    if (selected) {
      setSelectedShops([...selectedShops, shopId]);
    } else {
      setSelectedShops(selectedShops.filter(id => id !== shopId));
    }
  };

  const handleSelectAllShops = (selected: boolean) => {
    if (selected) {
      setSelectedShops(filteredShops.map(shop => shop.id));
    } else {
      setSelectedShops([]);
    }
  };

  const handleBulkAction = (action: string) => {
    if (selectedShops.length === 0) {
      toast({
        title: "Keine Shops ausgewählt",
        description: "Wähle mindestens einen Shop aus.",
        variant: "destructive",
      });
      return;
    }

    switch (action) {
      case 'publish':
        bulkUpdateMutation.mutate({ ids: selectedShops, updates: { isPublished: true } });
        break;
      case 'unpublish':
        bulkUpdateMutation.mutate({ ids: selectedShops, updates: { isPublished: false } });
        break;
      case 'delete':
        if (window.confirm(`${selectedShops.length} Shops wirklich löschen?`)) {
          selectedShops.forEach(id => {
            const shop = allShops.find(s => s.id === id);
            if (shop) deleteShopMutation.mutate(id);
          });
        }
        break;
    }
  };

  // Utility functions
  const formatSubmissionPayload = (payload: any) => {
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch {
        return payload;
      }
    }

    const fields = [];
    if (payload.name) fields.push(`Name: ${payload.name}`);
    if (payload.street) fields.push(`Adresse: ${payload.street}`);
    if (payload.city) fields.push(`Stadt: ${payload.city}`);
    if (payload.phone) fields.push(`Telefon: ${payload.phone}`);
    if (payload.website) fields.push(`Website: ${payload.website}`);
    if (payload.halal !== undefined) fields.push(`Halal: ${payload.halal ? 'Ja' : 'Nein'}`);
    if (payload.veg !== undefined) fields.push(`Veggie: ${payload.veg ? 'Ja' : 'Nein'}`);
    if (payload.priceLevel) fields.push(`Preislevel: ${'€'.repeat(payload.priceLevel)}`);
    if (payload.note) fields.push(`Notiz: ${payload.note}`);

    return fields.join(' • ');
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    return (
      <div className="flex text-rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className="text-xs">
            {star <= fullStars ? '★' : '☆'}
          </span>
        ))}
      </div>
    );
  };

  const renderPriceLevel = (level?: number) => {
    if (!level) return '—';
    return '€'.repeat(level);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Settings className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold text-foreground" data-testid="admin-title">
                  Admin Dashboard
                </h1>
                <p className="text-muted-foreground">Döner-Läden und Reviews verwalten</p>
              </div>
            </div>
            <Button 
              variant="destructive"
              onClick={() => window.location.href = '/'}
              data-testid="admin-logout"
            >
              <LogOut className="mr-2" size={16} />
              Logout
            </Button>
          </div>

          {/* Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
            <TabsList className="grid w-full grid-cols-7 mb-8 h-12">
              <TabsTrigger value="overview" data-testid="tab-overview" className="flex items-center space-x-2">
                <BarChart3 size={16} />
                <span>Übersicht</span>
              </TabsTrigger>
              <TabsTrigger value="shops" data-testid="tab-shops" className="flex items-center space-x-2">
                <MapPin size={16} />
                <span>Shops ({filteredShops.length})</span>
              </TabsTrigger>
              <TabsTrigger value="photos" data-testid="tab-photos" className="flex items-center space-x-2">
                <Camera size={16} />
                <span>Photos</span>
              </TabsTrigger>
              <TabsTrigger value="reviews" data-testid="tab-reviews" className="flex items-center space-x-2">
                <Star size={16} />
                <span>Reviews</span>
              </TabsTrigger>
              <TabsTrigger value="submissions" data-testid="tab-submissions" className="flex items-center space-x-2">
                <Clock size={16} />
                <span>Meldungen</span>
                {submissions.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {submissions.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="google-import" data-testid="tab-google-import" className="flex items-center space-x-2">
                <Globe size={16} />
                <span>Google Import</span>
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" data-testid="overview-tab">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Shops gesamt</CardTitle>
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalShops}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.publishedShops} veröffentlicht
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Reviews gesamt</CardTitle>
                    <Star className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalReviews}</div>
                    <p className="text-xs text-muted-foreground">
                      ⌀ {stats.avgRating.toFixed(1)} Sterne
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Städte</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.citiesWithShops}</div>
                    <p className="text-xs text-muted-foreground">
                      mit Shops
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Offene Meldungen</CardTitle>
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.pendingSubmissions}</div>
                    <p className="text-xs text-muted-foreground">
                      zu bearbeiten
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Neueste Meldungen</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {submissions.slice(0, 5).map((submission) => (
                      <div key={submission.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <p className="text-sm font-medium">
                            {submission.type === 'new' ? 'Neuer Laden' : 'Änderung'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(submission.createdAt).toLocaleDateString('de-DE')}
                          </p>
                        </div>
                        <Badge variant={submission.type === 'new' ? 'default' : 'secondary'}>
                          {submission.type === 'new' ? 'Neu' : 'Update'}
                        </Badge>
                      </div>
                    ))}
                    {submissions.length === 0 && (
                      <p className="text-muted-foreground text-center py-4">Keine offenen Meldungen</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top bewertete Shops</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {allShops
                      .filter(shop => shop.reviewCount > 0)
                      .sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0))
                      .slice(0, 5)
                      .map((shop) => (
                        <div key={shop.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div>
                            <p className="text-sm font-medium">{shop.name}</p>
                            <p className="text-xs text-muted-foreground">{shop.city}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{(shop.avgRating || 0).toFixed(1)}</div>
                            <div className="text-xs text-muted-foreground">{shop.reviewCount} Reviews</div>
                          </div>
                        </div>
                      ))}
                    {allShops.filter(shop => shop.reviewCount > 0).length === 0 && (
                      <p className="text-muted-foreground text-center py-4">Keine bewerteten Shops</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Shops Tab */}
            <TabsContent value="shops" data-testid="shops-tab">
              <div className="space-y-6">
                {/* Shop Management Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold">Shops verwalten</h2>
                    <p className="text-muted-foreground">
                      {filteredShops.length} von {allShops.length} Shops
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Dialog open={showShopDialog} onOpenChange={setShowShopDialog}>
                      <DialogTrigger asChild>
                        <Button data-testid="add-shop-button" onClick={() => { setEditingShop(null); shopForm.reset(); }}>
                          <Plus className="mr-2" size={16} />
                          Neuen Shop hinzufügen
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>
                            {editingShop ? 'Shop bearbeiten' : 'Neuen Shop hinzufügen'}
                          </DialogTitle>
                          <DialogDescription>
                            {editingShop ? 'Bearbeite die Shop-Details' : 'Füge einen neuen Döner-Shop hinzu'}
                          </DialogDescription>
                        </DialogHeader>
                        
                        <Form {...shopForm}>
                          <form onSubmit={shopForm.handleSubmit(handleShopSubmit)} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={shopForm.control}
                                name="name"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Name *</FormLabel>
                                    <FormControl>
                                      <Input placeholder="z.B. Döner Palace" {...field} data-testid="input-name" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={shopForm.control}
                                name="city"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Stadt *</FormLabel>
                                    <FormControl>
                                      <Select value={field.value} onValueChange={field.onChange} data-testid="select-city">
                                        <SelectTrigger>
                                          <SelectValue placeholder="Stadt auswählen" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {cities.map(city => (
                                            <SelectItem key={city.id} value={city.name}>
                                              {city.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <FormField
                              control={shopForm.control}
                              name="street"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Straße *</FormLabel>
                                  <FormControl>
                                    <Input placeholder="z.B. Hauptstraße 123" {...field} data-testid="input-street" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={shopForm.control}
                                name="zip"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>PLZ</FormLabel>
                                    <FormControl>
                                      <Input placeholder="z.B. 09599" {...field} data-testid="input-zip" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={shopForm.control}
                                name="phone"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Telefon</FormLabel>
                                    <FormControl>
                                      <Input placeholder="z.B. +49 123 456789" {...field} data-testid="input-phone" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <FormField
                              control={shopForm.control}
                              name="website"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Website</FormLabel>
                                  <FormControl>
                                    <Input placeholder="z.B. https://example.com" {...field} data-testid="input-website" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <FormField
                                control={shopForm.control}
                                name="lat"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Latitude *</FormLabel>
                                    <FormControl>
                                      <Input placeholder="z.B. 50.9167" {...field} data-testid="input-lat" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={shopForm.control}
                                name="lng"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Longitude *</FormLabel>
                                    <FormControl>
                                      <Input placeholder="z.B. 13.3417" {...field} data-testid="input-lng" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <FormField
                                control={shopForm.control}
                                name="priceLevel"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Preislevel</FormLabel>
                                    <FormControl>
                                      <Select 
                                        value={field.value?.toString() || "2"} 
                                        onValueChange={(value) => field.onChange(parseInt(value))}
                                        data-testid="select-pricelevel"
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="1">€ (günstig)</SelectItem>
                                          <SelectItem value="2">€€ (mittel)</SelectItem>
                                          <SelectItem value="3">€€€ (teuer)</SelectItem>
                                          <SelectItem value="4">€€€€ (sehr teuer)</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={shopForm.control}
                                name="halal"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        data-testid="checkbox-halal"
                                      />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                      <FormLabel>Halal</FormLabel>
                                    </div>
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={shopForm.control}
                                name="veg"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        data-testid="checkbox-veg"
                                      />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                      <FormLabel>Vegetarisch</FormLabel>
                                    </div>
                                  </FormItem>
                                )}
                              />
                            </div>

                            <FormField
                              control={shopForm.control}
                              name="meatType"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Fleischsorte</FormLabel>
                                  <FormControl>
                                    <Input placeholder="z.B. Huhn, Lamm, Kalb" {...field} data-testid="input-meattype" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={shopForm.control}
                              name="isPublished"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      data-testid="checkbox-published"
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel>Shop veröffentlichen</FormLabel>
                                    <p className="text-xs text-muted-foreground">
                                      Nicht veröffentlichte Shops sind für Nutzer nicht sichtbar
                                    </p>
                                  </div>
                                </FormItem>
                              )}
                            />

                            <Separator />
                            
                            <div className="flex justify-end space-x-2">
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setShowShopDialog(false)}
                                data-testid="button-cancel"
                              >
                                Abbrechen
                              </Button>
                              <Button 
                                type="submit" 
                                disabled={createShopMutation.isPending || updateShopMutation.isPending}
                                data-testid="button-save"
                              >
                                {editingShop ? 'Speichern' : 'Shop erstellen'}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {/* Filters and Search */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Shop suchen..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                            data-testid="input-search"
                          />
                        </div>
                      </div>
                      
                      <Select value={cityFilter} onValueChange={setCityFilter} data-testid="select-city-filter">
                        <SelectTrigger className="w-full sm:w-48">
                          <SelectValue placeholder="Stadt filtern" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle Städte</SelectItem>
                          {cities.map(city => (
                            <SelectItem key={city.id} value={city.name}>
                              {city.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select value={statusFilter} onValueChange={setStatusFilter} data-testid="select-status-filter">
                        <SelectTrigger className="w-full sm:w-48">
                          <SelectValue placeholder="Status filtern" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alle Status</SelectItem>
                          <SelectItem value="published">Veröffentlicht</SelectItem>
                          <SelectItem value="draft">Entwurf</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Bulk Actions */}
                    {selectedShops.length > 0 && (
                      <div className="flex items-center justify-between p-4 bg-muted rounded-lg mb-4">
                        <span className="text-sm font-medium">
                          {selectedShops.length} Shop{selectedShops.length > 1 ? 's' : ''} ausgewählt
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleBulkAction('publish')}
                            disabled={bulkUpdateMutation.isPending}
                            data-testid="button-bulk-publish"
                          >
                            <Eye className="mr-1" size={14} />
                            Veröffentlichen
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleBulkAction('unpublish')}
                            disabled={bulkUpdateMutation.isPending}
                            data-testid="button-bulk-unpublish"
                          >
                            <Eye className="mr-1" size={14} />
                            Verstecken
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleBulkAction('delete')}
                            disabled={bulkUpdateMutation.isPending}
                            data-testid="button-bulk-delete"
                          >
                            <Trash className="mr-1" size={14} />
                            Löschen
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Shops Table */}
                <Card>
                  <CardContent className="p-0">
                    {shopsLoading ? (
                      <div className="p-6">
                        <div className="space-y-4" data-testid="shops-loading">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="skeleton h-16 rounded-lg"></div>
                          ))}
                        </div>
                      </div>
                    ) : filteredShops.length === 0 ? (
                      <div className="text-center py-12" data-testid="shops-empty">
                        <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">Keine Shops gefunden</p>
                        <p className="text-muted-foreground mb-6">
                          {searchQuery || cityFilter !== 'all' || statusFilter !== 'all' 
                            ? 'Versuche andere Suchkriterien oder Filter'
                            : 'Füge den ersten Shop hinzu'
                          }
                        </p>
                        <Button onClick={() => { setEditingShop(null); shopForm.reset(); setShowShopDialog(true); }}>
                          <Plus className="mr-2" size={16} />
                          Shop hinzufügen
                        </Button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table data-testid="shops-table">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">
                                <Checkbox
                                  checked={selectedShops.length === filteredShops.length && filteredShops.length > 0}
                                  onCheckedChange={handleSelectAllShops}
                                  data-testid="checkbox-select-all"
                                />
                              </TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Stadt</TableHead>
                              <TableHead>Bewertung</TableHead>
                              <TableHead>Preis</TableHead>
                              <TableHead>Features</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Aktionen</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredShops.map((shop) => (
                              <TableRow key={shop.id} data-testid={`shop-row-${shop.slug}`}>
                                <TableCell>
                                  <Checkbox
                                    checked={selectedShops.includes(shop.id)}
                                    onCheckedChange={(checked) => handleShopSelection(shop.id, !!checked)}
                                    data-testid={`checkbox-shop-${shop.slug}`}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                      🥙
                                    </div>
                                    <div>
                                      <div className="font-medium text-foreground">{shop.name}</div>
                                      <div className="text-sm text-muted-foreground">{shop.street}</div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground">{shop.city}</TableCell>
                                <TableCell>
                                  <div className="flex items-center space-x-1">
                                    {renderStars(shop.avgRating || 0)}
                                    <span className="text-sm text-muted-foreground ml-1">
                                      ({shop.reviewCount || 0})
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="font-medium">{renderPriceLevel(shop.priceLevel)}</span>
                                </TableCell>
                                <TableCell>
                                  <div className="flex space-x-1">
                                    {shop.halal && <Badge variant="secondary" className="text-xs">Halal</Badge>}
                                    {shop.veg && <Badge variant="secondary" className="text-xs">Veg</Badge>}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={shop.isPublished ? "default" : "secondary"} 
                                    className={shop.isPublished ? "bg-green-100 text-green-800" : ""}
                                  >
                                    {shop.isPublished ? 'Veröffentlicht' : 'Entwurf'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex space-x-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleEditShop(shop)}
                                      data-testid={`edit-shop-${shop.slug}`}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => window.open(`/shops/${shop.slug}`, '_blank')}
                                      data-testid={`view-shop-${shop.slug}`}
                                    >
                                      <Eye className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleDeleteShop(shop.id, shop.name)}
                                      disabled={deleteShopMutation.isPending}
                                      data-testid={`delete-shop-${shop.slug}`}
                                    >
                                      <Trash className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Reviews Tab */}
            <TabsContent value="reviews" data-testid="reviews-tab">
              <Card>
                <CardHeader>
                  <CardTitle>Review Management</CardTitle>
                  <CardDescription>Verwalte und moderiere Kundenbewertungen</CardDescription>
                </CardHeader>
                <CardContent>
                  {reviewsLoading ? (
                    <div className="space-y-4" data-testid="reviews-loading">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="skeleton h-20 rounded-lg"></div>
                      ))}
                    </div>
                  ) : allReviews.length === 0 ? (
                    <div className="text-center py-8" data-testid="reviews-empty">
                      <Star className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium">Keine Reviews vorhanden</p>
                      <p className="text-muted-foreground">Reviews werden hier angezeigt, sobald Nutzer welche abgeben.</p>
                    </div>
                  ) : (
                    <div className="space-y-4" data-testid="reviews-list">
                      {allReviews.map((review) => {
                        const shop = allShops.find(s => s.id === review.shopId);
                        return (
                          <div key={review.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center space-x-2 mb-1">
                                  {renderStars(review.rating)}
                                  <span className="font-medium">{review.rating}/5</span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {shop?.name} • {new Date(review.createdAt).toLocaleDateString('de-DE')}
                                </p>
                              </div>
                              <div className="flex space-x-2">
                                <Button size="sm" variant="outline" data-testid={`moderate-review-${review.id}`}>
                                  <AlertCircle className="mr-1" size={14} />
                                  Moderieren
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm">{review.text}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Submissions Tab */}
            <TabsContent value="submissions" data-testid="submissions-tab">
              <Card>
                <CardHeader>
                  <CardTitle>Eingereichte Meldungen</CardTitle>
                  <CardDescription>Neue Läden und Änderungsvorschläge prüfen</CardDescription>
                </CardHeader>
                <CardContent>
                  {submissionsLoading ? (
                    <div className="space-y-4" data-testid="submissions-loading">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="skeleton h-24 rounded-lg"></div>
                      ))}
                    </div>
                  ) : submissions.length === 0 ? (
                    <div className="text-center py-8" data-testid="submissions-empty">
                      <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium">Keine offenen Meldungen</p>
                      <p className="text-muted-foreground">Alle Meldungen wurden bearbeitet.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border" data-testid="submissions-list">
                      {submissions.map((submission) => (
                        <div key={submission.id} className="py-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-3">
                                <Badge 
                                  variant={submission.type === 'new' ? 'default' : 'secondary'}
                                  data-testid={`submission-type-${submission.id}`}
                                >
                                  {submission.type === 'new' ? 'Neuer Laden' : 'Änderung'}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {new Date(submission.createdAt).toLocaleDateString('de-DE')}
                                </span>
                              </div>
                              
                              <div className="text-sm" data-testid={`submission-payload-${submission.id}`}>
                                <p className="font-medium text-foreground mb-2">
                                  {submission.type === 'new' 
                                    ? submission.payload?.name || 'Neuer Laden' 
                                    : 'Änderungsvorschlag'}
                                </p>
                                <p className="text-muted-foreground">
                                  {formatSubmissionPayload(submission.payload)}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex space-x-2 ml-4">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleSubmissionAction(submission.id, 'approved')}
                                disabled={updateSubmissionMutation.isPending}
                                data-testid={`approve-submission-${submission.id}`}
                              >
                                <Check className="mr-1" size={14} />
                                Genehmigen
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleSubmissionAction(submission.id, 'rejected')}
                                disabled={updateSubmissionMutation.isPending}
                                data-testid={`reject-submission-${submission.id}`}
                              >
                                <X className="mr-1" size={14} />
                                Ablehnen
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Photos Tab */}
            <TabsContent value="photos" data-testid="photos-tab">
              <PhotoGallery />
            </TabsContent>

            {/* Import Tab */}
            <TabsContent value="google-import" data-testid="google-import-tab">
              <GooglePlacesImport />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}