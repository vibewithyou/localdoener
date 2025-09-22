import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, MapPin, Star, ExternalLink, Download, Import, AlertCircle, CheckCircle, Clock, Users, Phone, Globe, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  opening_hours?: {
    open_now: boolean;
    weekday_text?: string[];
  };
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  formatted_phone_number?: string;
  website?: string;
  business_status?: string;
  types: string[];
  isImported?: boolean;
  existingShopId?: string;
}

interface GooglePlaceDetails extends GooglePlace {
  reviews?: Array<{
    author_name: string;
    rating: number;
    text: string;
    time: number;
    relative_time_description: string;
  }>;
}

export function GooglePlacesImport() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Search state
  const [searchType, setSearchType] = useState<'text' | 'location'>('text');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [searchLat, setSearchLat] = useState('');
  const [searchLng, setSearchLng] = useState('');
  const [searchRadius, setSearchRadius] = useState('5000');
  
  // UI state
  const [selectedPlace, setSelectedPlace] = useState<GooglePlace | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [importFilters, setImportFilters] = useState({
    includeReviews: true,
    includePhotos: true,
    includeOpeningHours: true
  });

  // Search query
  const {
    data: searchResults = [],
    isLoading: isSearching,
    error: searchError,
    refetch: executeSearch
  } = useQuery({
    queryKey: ['/api/admin/google/search', { 
      query: searchQuery, 
      city: searchCity, 
      lat: searchLat, 
      lng: searchLng,
      radius: searchRadius 
    }],
    queryFn: () => {
      if (searchType === 'text') {
        return api.searchGooglePlaces({
          query: searchQuery,
          city: searchCity
        });
      } else {
        if (!searchLat || !searchLng) return [];
        return api.searchGooglePlacesNearby(
          parseFloat(searchLat),
          parseFloat(searchLng),
          parseInt(searchRadius),
          'döner kebab'
        );
      }
    },
    enabled: false
  });

  // Place details query
  const {
    data: placeDetails,
    isLoading: isLoadingDetails,
    refetch: fetchDetails
  } = useQuery({
    queryKey: ['/api/admin/google/details', selectedPlace?.place_id],
    queryFn: () => selectedPlace ? api.getGooglePlaceDetails(selectedPlace.place_id) : null,
    enabled: false
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: ({ placeId, options }: { placeId: string; options?: { forceUpdate?: boolean } }) =>
      api.importFromGooglePlaces(placeId, options),
    onSuccess: (data, variables) => {
      toast({
        title: "Import erfolgreich",
        description: `Shop "${data.shop?.name}" wurde erfolgreich importiert.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/shops'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/google/search'] });
      setShowDetailsDialog(false);
    },
    onError: (error: any) => {
      if (error.message.includes('already imported')) {
        toast({
          title: "Shop bereits importiert",
          description: "Dieser Shop wurde bereits importiert. Verwende 'Aktualisieren' um Daten zu überschreiben.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Import fehlgeschlagen",
          description: error.message || "Shop konnte nicht importiert werden.",
          variant: "destructive",
        });
      }
    },
  });

  const handleSearch = () => {
    if (searchType === 'text' && !searchQuery.trim()) {
      toast({
        title: "Suchbegriff erforderlich",
        description: "Bitte gib einen Suchbegriff ein.",
        variant: "destructive",
      });
      return;
    }
    
    if (searchType === 'location' && (!searchLat || !searchLng)) {
      toast({
        title: "Koordinaten erforderlich",
        description: "Bitte gib Längen- und Breitengrad ein.",
        variant: "destructive",
      });
      return;
    }

    executeSearch();
  };

  const handleShowDetails = (place: GooglePlace) => {
    setSelectedPlace(place);
    setShowDetailsDialog(true);
    fetchDetails();
  };

  const handleImport = (placeId: string, forceUpdate = false) => {
    importMutation.mutate({ placeId, options: { forceUpdate } });
  };

  const formatRating = (rating?: number, total?: number) => {
    if (!rating) return 'Keine Bewertung';
    return `${rating.toFixed(1)} Sterne${total ? ` (${total} Bewertungen)` : ''}`;
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const stars = [];

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />);
    }
    
    if (hasHalfStar) {
      stars.push(<Star key="half" className="h-3 w-3 fill-yellow-400/50 text-yellow-400" />);
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="h-3 w-3 text-gray-300" />);
    }

    return <div className="flex">{stars}</div>;
  };

  const getPriceLevel = (level?: number) => {
    if (!level) return '';
    return '€'.repeat(level);
  };

  return (
    <div className="space-y-6" data-testid="google-places-import">
      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Google Places Suche
          </CardTitle>
          <CardDescription>
            Suche nach Döner- und Kebab-Shops auf Google Places zur Datenimport
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={searchType} onValueChange={(value) => setSearchType(value as 'text' | 'location')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="text">Textsuche</TabsTrigger>
              <TabsTrigger value="location">Standortsuche</TabsTrigger>
            </TabsList>
            
            <TabsContent value="text" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="search-query">Suchbegriff</Label>
                  <Input
                    id="search-query"
                    placeholder="z.B. Döner Freiberg"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-search-query"
                  />
                </div>
                <div>
                  <Label htmlFor="search-city">Stadt (optional)</Label>
                  <Input
                    id="search-city"
                    placeholder="z.B. Freiberg"
                    value={searchCity}
                    onChange={(e) => setSearchCity(e.target.value)}
                    data-testid="input-search-city"
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="location" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="search-lat">Breitengrad</Label>
                  <Input
                    id="search-lat"
                    placeholder="50.9167"
                    value={searchLat}
                    onChange={(e) => setSearchLat(e.target.value)}
                    data-testid="input-search-lat"
                  />
                </div>
                <div>
                  <Label htmlFor="search-lng">Längengrad</Label>
                  <Input
                    id="search-lng"
                    placeholder="13.3417"
                    value={searchLng}
                    onChange={(e) => setSearchLng(e.target.value)}
                    data-testid="input-search-lng"
                  />
                </div>
                <div>
                  <Label htmlFor="search-radius">Radius (m)</Label>
                  <Select value={searchRadius} onValueChange={setSearchRadius}>
                    <SelectTrigger data-testid="select-search-radius">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1000">1 km</SelectItem>
                      <SelectItem value="5000">5 km</SelectItem>
                      <SelectItem value="10000">10 km</SelectItem>
                      <SelectItem value="25000">25 km</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <Button 
            onClick={handleSearch} 
            disabled={isSearching}
            className="w-full md:w-auto"
            data-testid="button-search"
          >
            {isSearching ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Suche läuft...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Suchen
              </>
            )}
          </Button>

          {searchError && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Fehler bei der Suche: {(searchError as Error).message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Suchergebnisse ({searchResults.length})</CardTitle>
            <CardDescription>
              Klicke auf einen Shop für weitere Details und Import-Optionen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {searchResults.map((place) => (
                <Card
                  key={place.place_id}
                  className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                    place.isImported ? 'border-green-200 bg-green-50' : ''
                  }`}
                  onClick={() => handleShowDetails(place)}
                  data-testid={`card-google-place-${place.place_id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{place.name}</h3>
                          {place.isImported && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Importiert
                            </Badge>
                          )}
                        </div>
                        
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {place.formatted_address}
                          </div>
                          
                          {place.rating && (
                            <div className="flex items-center gap-2">
                              {renderStars(place.rating)}
                              <span>{formatRating(place.rating, place.user_ratings_total)}</span>
                            </div>
                          )}
                          
                          {place.price_level && (
                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-green-600">
                                {getPriceLevel(place.price_level)}
                              </span>
                              <span>Preislevel</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="ml-4">
                        <Button
                          variant={place.isImported ? "outline" : "default"}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleImport(place.place_id, place.isImported);
                          }}
                          disabled={importMutation.isPending}
                          data-testid={`button-import-${place.place_id}`}
                        >
                          {place.isImported ? (
                            <>
                              <Download className="mr-1 h-3 w-3" />
                              Aktualisieren
                            </>
                          ) : (
                            <>
                              <Import className="mr-1 h-3 w-3" />
                              Importieren
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Place Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {selectedPlace?.name}
              {selectedPlace?.isImported && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Importiert
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Details und Import-Optionen für diesen Shop
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="flex items-center justify-center py-8">
              <Clock className="h-6 w-6 animate-spin mr-2" />
              Lade Details...
            </div>
          ) : placeDetails ? (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Grundinformationen</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Adresse:</strong> {placeDetails.formatted_address}
                    </div>
                    {placeDetails.formatted_phone_number && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {placeDetails.formatted_phone_number}
                      </div>
                    )}
                    {placeDetails.website && (
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        <a 
                          href={placeDetails.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Website
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Bewertungen</h4>
                  {placeDetails.rating ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {renderStars(placeDetails.rating)}
                        <span>{formatRating(placeDetails.rating, placeDetails.user_ratings_total)}</span>
                      </div>
                      {placeDetails.price_level && (
                        <div>
                          <strong>Preislevel:</strong> {getPriceLevel(placeDetails.price_level)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-muted-foreground">Keine Bewertungen verfügbar</div>
                  )}
                </div>
              </div>

              {/* Opening Hours */}
              {placeDetails.opening_hours?.weekday_text && (
                <div>
                  <h4 className="font-semibold mb-2">Öffnungszeiten</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-sm">
                    {placeDetails.opening_hours.weekday_text.map((day: string, index: number) => (
                      <div key={index}>{day}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Photos */}
              {placeDetails.photos && placeDetails.photos.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-1">
                    <Camera className="h-4 w-4" />
                    Fotos ({placeDetails.photos.length})
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {placeDetails.photos.slice(0, 6).map((photo: { photo_reference: string; height: number; width: number; }, index: number) => (
                      <img
                        key={index}
                        src={api.getGooglePhotoUrl(photo.photo_reference, 300)}
                        alt={`${placeDetails.name} Foto ${index + 1}`}
                        className="aspect-square object-cover rounded-md"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Reviews */}
              {placeDetails.reviews && placeDetails.reviews.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    Neueste Bewertungen
                  </h4>
                  <div className="space-y-3">
                    {placeDetails.reviews.slice(0, 3).map((review: { author_name: string; rating: number; text: string; time: number; relative_time_description: string; }, index: number) => (
                      <div key={index} className="border rounded-md p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <strong>{review.author_name}</strong>
                            {renderStars(review.rating)}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {review.relative_time_description}
                          </span>
                        </div>
                        <p className="text-sm">{review.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Import Actions */}
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {selectedPlace?.isImported 
                    ? "Shop bereits importiert. Import überschreibt vorhandene Daten."
                    : "Importiere diesen Shop in deine Datenbank."
                  }
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowDetailsDialog(false)}
                    data-testid="button-cancel-import"
                  >
                    Abbrechen
                  </Button>
                  <Button
                    onClick={() => selectedPlace && handleImport(selectedPlace.place_id, selectedPlace.isImported)}
                    disabled={importMutation.isPending}
                    data-testid="button-confirm-import"
                  >
                    {importMutation.isPending ? (
                      <>
                        <Clock className="mr-2 h-4 w-4 animate-spin" />
                        Importiere...
                      </>
                    ) : selectedPlace?.isImported ? (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Aktualisieren
                      </>
                    ) : (
                      <>
                        <Import className="mr-2 h-4 w-4" />
                        Importieren
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}