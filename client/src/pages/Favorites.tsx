import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, Search, Filter, Trash2, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import ShopCard from "@/components/ShopCard";
import ProtectedRoute from "@/components/ProtectedRoute";
import type { FavoriteWithShop } from "@/lib/types";

export default function Favorites() {
  return (
    <ProtectedRoute>
      <FavoritesContent />
    </ProtectedRoute>
  );
}

function FavoritesContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterCity, setFilterCity] = useState("all");

  // Fetch user favorites
  const { data: favorites = [], isLoading, error } = useQuery({
    queryKey: ['/api/auth/favorites'],
    queryFn: () => api.getUserFavorites(),
    enabled: !!user,
  });

  // Remove favorite mutation
  const removeFavoriteMutation = useMutation({
    mutationFn: (shopId: string) => api.removeFavorite(shopId),
    onSuccess: () => {
      toast({
        title: "Favorit entfernt",
        description: "Der Shop wurde aus deinen Favoriten entfernt.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/favorites'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Favorit konnte nicht entfernt werden.",
        variant: "destructive",
      });
    },
  });

  // Filter and sort favorites
  const filteredFavorites = favorites
    .filter(favorite => {
      const shop = favorite.shop;
      const matchesSearch = searchTerm === "" || 
        shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shop.street.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shop.city.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCity = filterCity === "all" || shop.city === filterCity;
      
      return matchesSearch && matchesCity;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "name":
          return a.shop.name.localeCompare(b.shop.name);
        case "rating":
          return b.shop.avgRating - a.shop.avgRating;
        default:
          return 0;
      }
    });

  // Get unique cities for filter
  const cities = Array.from(new Set(favorites.map(f => f.shop.city))).sort();

  const handleRemoveFavorite = (shopId: string, shopName: string) => {
    if (confirm(`Möchtest du "${shopName}" wirklich aus deinen Favoriten entfernen?`)) {
      removeFavoriteMutation.mutate(shopId);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-48"></div>
            <div className="h-12 bg-muted rounded"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-64 bg-muted rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="favorites-title">
              Meine Favoriten
            </h1>
            <p className="text-muted-foreground" data-testid="favorites-count">
              {favorites.length} {favorites.length === 1 ? 'Favorit' : 'Favoriten'}
            </p>
          </div>
          <Heart className="h-8 w-8 text-red-500" />
        </div>

        {/* Search and Filters */}
        {favorites.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                    <Input
                      placeholder="Shops durchsuchen..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="search-favorites"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Select value={filterCity} onValueChange={setFilterCity}>
                    <SelectTrigger className="w-40" data-testid="filter-city">
                      <Filter className="mr-2" size={16} />
                      <SelectValue placeholder="Stadt" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Städte</SelectItem>
                      {cities.map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-40" data-testid="sort-favorites">
                      <SelectValue placeholder="Sortieren" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Neueste zuerst</SelectItem>
                      <SelectItem value="oldest">Älteste zuerst</SelectItem>
                      <SelectItem value="name">Name A-Z</SelectItem>
                      <SelectItem value="rating">Beste Bewertung</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Favorites Grid */}
        {filteredFavorites.length === 0 ? (
          <Card data-testid="empty-favorites">
            <CardContent className="text-center py-12">
              {searchTerm || filterCity !== "all" ? (
                <>
                  <Search className="mx-auto mb-4 text-muted-foreground" size={48} />
                  <h3 className="text-lg font-semibold mb-2">Keine Ergebnisse</h3>
                  <p className="text-muted-foreground mb-4">
                    Keine Favoriten entsprechen deinen Suchkriterien.
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setFilterCity("all");
                    }}
                  >
                    Filter zurücksetzen
                  </Button>
                </>
              ) : (
                <>
                  <Heart className="mx-auto mb-4 text-muted-foreground" size={48} />
                  <h3 className="text-lg font-semibold mb-2">Noch keine Favoriten</h3>
                  <p className="text-muted-foreground mb-4">
                    Du hast noch keine Dönerläden zu deinen Favoriten hinzugefügt.
                  </p>
                  <Button 
                    onClick={() => window.location.href = '/'}
                    data-testid="browse-shops-button"
                  >
                    <MapPin className="mr-2" size={16} />
                    Shops entdecken
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6" data-testid="favorites-grid">
            {filteredFavorites.map((favorite) => (
              <div key={favorite.id} className="relative group">
                <ShopCard 
                  shop={favorite.shop}
                  onClick={() => window.location.href = `/laden/${favorite.shop.slug}`}
                />
                
                {/* Remove favorite button */}
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFavorite(favorite.shop.id, favorite.shop.name);
                  }}
                  disabled={removeFavoriteMutation.isPending}
                  data-testid={`remove-favorite-${favorite.shop.slug}`}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Load More Button (for pagination if needed) */}
        {filteredFavorites.length > 0 && filteredFavorites.length % 20 === 0 && (
          <div className="text-center">
            <Button variant="outline" data-testid="load-more-favorites">
              Mehr laden
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}