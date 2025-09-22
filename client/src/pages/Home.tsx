import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Search, Clock, Leaf, Sprout, MapPin, Target, Truck, Tag, X, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import ShopCard from "@/components/ShopCard";
import MapView from "@/components/MapView";
import { api } from "@/lib/api";
import { requestLocationPermission, formatDistance, sortShopsByDistance } from "@/lib/utils";
import type { ShopWithDetails, SearchFilters } from "@/lib/types";

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({
    city: "Freiberg",
    sortBy: "price"
  });
  
  // Enhanced filter state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [distanceFilter, setDistanceFilter] = useState<number | null>(null);
  
  // Processed shops with distance calculations
  const [processedShops, setProcessedShops] = useState<(ShopWithDetails & {distance?: number})[]>([]);

  // Fetch shops
  const { data: shops = [], isLoading, error } = useQuery({
    queryKey: ['/api/shops', filters],
    queryFn: () => api.getShops(filters),
  });

  // Fetch top 3 shops
  const { data: topShops = [] } = useQuery({
    queryKey: ['/api/top', filters.city],
    queryFn: () => api.getTopShops(filters.city, 3),
  });

  const handleSearch = () => {
    if (searchTerm.trim()) {
      setFilters(prev => ({ ...prev, city: searchTerm.trim() }));
    }
  };

  const toggleFilter = (key: keyof SearchFilters) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key] ? undefined : true
    }));
  };

  const handleShopClick = (shop: ShopWithDetails) => {
    setLocation(`/laden/${shop.slug}`);
  };

  // Enhanced filter functions
  const requestLocation = async () => {
    setLocationLoading(true);
    try {
      const result = await requestLocationPermission();
      if (result.position) {
        const { latitude, longitude } = result.position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setFilters(prev => ({
          ...prev,
          lat: latitude,
          lng: longitude,
          sortBy: prev.sortBy === 'distance' ? 'distance' : prev.sortBy
        }));
        toast({
          title: "Standort erfolgreich ermittelt",
          description: "Du kannst nun nach Entfernung filtern und sortieren.",
        });
      } else if (result.error) {
        toast({
          title: "Standort konnte nicht ermittelt werden",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Fehler beim Standortabruf",
        description: "Bitte erlaube den Zugriff auf deinen Standort.",
        variant: "destructive",
      });
    } finally {
      setLocationLoading(false);
    }
  };

  const setDistanceRadius = (radius: number | null) => {
    setDistanceFilter(radius);
    setFilters(prev => ({
      ...prev,
      radius: radius || undefined,
      sortBy: radius && userLocation ? 'distance' : prev.sortBy
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      city: "Freiberg",
      sortBy: "price"
    });
    setDistanceFilter(null);
    setShowAdvancedFilters(false);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.openNow) count++;
    if (filters.halal) count++;
    if (filters.veg) count++;
    if (filters.hasOffers) count++;
    if (filters.hasDelivery) count++;
    if (filters.radius) count++;
    return count;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Search Bar */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="bg-card rounded-lg p-6 border border-border shadow-lg">
          <h2 className="text-2xl font-semibold mb-4 text-center">
            Finde den besten Döner in deiner Nähe
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Stadt, PLZ oder Adresse eingeben..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full"
                data-testid="search-input"
              />
            </div>
            <Button 
              onClick={handleSearch}
              className="px-6 py-3"
              data-testid="search-button"
            >
              <Search className="mr-2" size={16} />
              Suchen
            </Button>
          </div>

          {/* Basic Filter Chips */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Button
              variant={filters.openNow ? "secondary" : "outline"}
              size="sm"
              onClick={() => toggleFilter('openNow')}
              className="text-sm"
              data-testid="filter-open-now"
            >
              <Clock className="mr-1" size={14} />
              Jetzt geöffnet
            </Button>
            <Button
              variant={filters.halal ? "secondary" : "outline"}
              size="sm"
              onClick={() => toggleFilter('halal')}
              className="text-sm"
              data-testid="filter-halal"
            >
              <Leaf className="mr-1" size={14} />
              Halal
            </Button>
            <Button
              variant={filters.veg ? "secondary" : "outline"}
              size="sm"
              onClick={() => toggleFilter('veg')}
              className="text-sm"
              data-testid="filter-veggie"
            >
              <Sprout className="mr-1" size={14} />
              Veggie
            </Button>
            <Button
              variant={filters.hasOffers ? "secondary" : "outline"}
              size="sm"
              onClick={() => toggleFilter('hasOffers')}
              className="text-sm"
              data-testid="filter-offers"
            >
              <Tag className="mr-1" size={14} />
              Sonderangebote
            </Button>
            <Button
              variant={filters.hasDelivery ? "secondary" : "outline"}
              size="sm"
              onClick={() => toggleFilter('hasDelivery')}
              className="text-sm"
              data-testid="filter-delivery"
            >
              <Truck className="mr-1" size={14} />
              Lieferservice
            </Button>
          </div>

          {/* Advanced Filters */}
          <div className="mt-4 border-t border-border pt-4">
            <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
              <div className="flex items-center justify-between">
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 h-auto hover:bg-transparent"
                    data-testid="toggle-advanced-filters"
                  >
                    <span className="text-sm font-medium">
                      Erweiterte Filter {getActiveFilterCount() > 0 && `(${getActiveFilterCount()})`}
                    </span>
                    {showAdvancedFilters ? (
                      <ChevronUp className="ml-2" size={16} />
                    ) : (
                      <ChevronDown className="ml-2" size={16} />
                    )}
                  </Button>
                </CollapsibleTrigger>
                
                {getActiveFilterCount() > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-muted-foreground hover:text-foreground text-xs"
                    data-testid="clear-all-filters"
                  >
                    <X className="mr-1" size={12} />
                    Alle Filter löschen
                  </Button>
                )}
              </div>

              <CollapsibleContent className="space-y-4 mt-4">
                {/* Distance Filter Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium flex items-center">
                      <MapPin className="mr-2" size={14} />
                      Entfernung
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={requestLocation}
                      disabled={locationLoading}
                      className="text-xs"
                      data-testid="request-location"
                    >
                      {locationLoading ? (
                        <Loader2 className="mr-1 animate-spin" size={12} />
                      ) : (
                        <Target className="mr-1" size={12} />
                      )}
                      {userLocation ? 'Standort aktualisieren' : 'Standort ermitteln'}
                    </Button>
                  </div>
                  
                  {userLocation && (
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 5, 10, 20].map((radius) => (
                        <Button
                          key={radius}
                          variant={distanceFilter === radius ? "secondary" : "outline"}
                          size="sm"
                          onClick={() => setDistanceRadius(distanceFilter === radius ? null : radius)}
                          className="text-xs"
                          data-testid={`distance-${radius}km`}
                        >
                          {radius}km
                        </Button>
                      ))}
                      {distanceFilter && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDistanceRadius(null)}
                          className="text-xs text-muted-foreground"
                          data-testid="clear-distance"
                        >
                          <X className="mr-1" size={12} />
                          Entfernung löschen
                        </Button>
                      )}
                    </div>
                  )}
                  
                  {!userLocation && (
                    <p className="text-xs text-muted-foreground">
                      Erlaube Standortzugriff, um nach Entfernung zu filtern
                    </p>
                  )}
                </div>

                {/* Sort Options */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Sortierung</h4>
                  <Select 
                    value={filters.sortBy || "price"} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value as any }))}
                  >
                    <SelectTrigger className="h-8 text-sm" data-testid="sort-selector">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="price">Preis</SelectItem>
                      <SelectItem value="rating">Bewertung</SelectItem>
                      {userLocation && <SelectItem value="distance">Entfernung</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </div>

      {/* Top 3 Banner */}
      {topShops.length > 0 && (
        <div className="max-w-6xl mx-auto mb-8">
          <div className="bg-gradient-to-r from-primary to-secondary rounded-lg p-6 text-white">
            <h3 className="text-lg font-semibold mb-4">🏆 Top 3 in deiner Nähe</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topShops.slice(0, 3).map((shop, index) => (
                <div 
                  key={shop.id}
                  className="bg-white bg-opacity-10 rounded-lg p-4 backdrop-blur-sm cursor-pointer hover:bg-opacity-20 transition-colors"
                  onClick={() => handleShopClick(shop)}
                  data-testid={`top-shop-${index + 1}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold">#{index + 1}</span>
                    <span className="text-sm bg-white bg-opacity-20 px-2 py-1 rounded">
                      {'€'.repeat(shop.priceLevel || 1)}
                    </span>
                  </div>
                  <h4 className="font-semibold">{shop.name}</h4>
                  <div className="flex items-center mt-1">
                    <div className="flex text-yellow-400">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className="text-xs">
                          {star <= Math.floor(shop.avgRating) ? '★' : '☆'}
                        </span>
                      ))}
                    </div>
                    <span className="text-sm ml-2">
                      {shop.avgRating.toFixed(1)} • {shop.reviewCount} Bewertungen
                    </span>
                  </div>
                  <p className="text-sm opacity-90 mt-1">{shop.street}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Map Section */}
      <div className="max-w-7xl mx-auto mb-8">
        <MapView 
          shops={shops}
          onMarkerClick={handleShopClick}
          className="h-96 md:h-[420px]"
        />
      </div>

      {/* Shop List Section */}
      <div className="max-w-7xl mx-auto">
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold" data-testid="shops-title">
              Dönerläden in {filters.city || 'deiner Nähe'}
            </h3>
            <Select
              value={filters.sortBy}
              onValueChange={(value: 'rating' | 'price' | 'distance') => 
                setFilters(prev => ({ ...prev, sortBy: value }))
              }
            >
              <SelectTrigger className="w-48" data-testid="sort-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price">Günstigste zuerst</SelectItem>
                <SelectItem value="rating">Beste Bewertung</SelectItem>
                <SelectItem value="distance">Entfernung</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-4" data-testid="loading-skeleton">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-32 rounded-lg"></div>
              ))}
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-8" data-testid="error-state">
              <p className="text-muted-foreground mb-4">
                Fehler beim Laden der Dönerläden. Versuche es erneut.
              </p>
              <Button onClick={() => window.location.reload()}>
                Erneut versuchen
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && shops.length === 0 && (
            <div className="text-center py-8" data-testid="empty-state">
              <p className="text-muted-foreground mb-4">
                Keine Dönerläden gefunden. 
              </p>
              <Link href="/melden">
                <Button>Laden melden</Button>
              </Link>
            </div>
          )}

          {/* Shop Cards */}
          <div className="space-y-4" data-testid="shops-list">
            {shops.map((shop) => (
              <ShopCard 
                key={shop.id} 
                shop={shop} 
                onClick={() => handleShopClick(shop)}
                userLocation={userLocation}
              />
            ))}
          </div>

          {/* Load More Button */}
          {shops.length > 0 && (
            <div className="text-center mt-6">
              <Button variant="outline" data-testid="load-more-button">
                Mehr laden
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
