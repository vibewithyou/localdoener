import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, MapPin, Clock, Navigation, Tag, Truck, Target } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import AuthDialog from "@/components/auth/AuthDialog";
import { openRoute, isShopOpen, getShopStatusText, formatDistance, calculateDistance } from "@/lib/utils";
import { api } from "@/lib/api";
import type { ShopWithDetails } from "@/lib/types";

interface ShopCardProps {
  shop: ShopWithDetails & { distance?: number };
  onClick?: () => void;
  userLocation?: { lat: number; lng: number } | null;
}

export default function ShopCard({ shop, onClick, userLocation }: ShopCardProps) {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  
  const priceLevel = shop.priceLevel || 1;
  const priceSymbol = '€'.repeat(priceLevel);
  
  const isOpen = isShopOpen(shop.openingHours);
  const statusText = getShopStatusText(shop.openingHours);

  // Check if shop is in user favorites
  const { data: favorites = [] } = useQuery({
    queryKey: ['/api/auth/favorites'],
    queryFn: () => api.getUserFavorites(),
    enabled: isAuthenticated,
  });

  const isFavorite = favorites.some(fav => fav.shop.id === shop.id);

  // Add/remove favorite mutations
  const addFavoriteMutation = useMutation({
    mutationFn: () => api.addFavorite(shop.id),
    onSuccess: () => {
      toast({
        title: "Zu Favoriten hinzugefügt",
        description: `${shop.name} wurde zu deinen Favoriten hinzugefügt.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/favorites'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Shop konnte nicht zu Favoriten hinzugefügt werden.",
        variant: "destructive",
      });
    },
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: () => api.removeFavorite(shop.id),
    onSuccess: () => {
      toast({
        title: "Aus Favoriten entfernt",
        description: `${shop.name} wurde aus deinen Favoriten entfernt.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/favorites'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Shop konnte nicht aus Favoriten entfernt werden.",
        variant: "destructive",
      });
    },
  });

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isAuthenticated) {
      setShowAuthDialog(true);
      return;
    }

    if (isFavorite) {
      removeFavoriteMutation.mutate();
    } else {
      addFavoriteMutation.mutate();
    }
  };
  
  // Calculate distance if user location is available
  const distance = userLocation && shop.lat && shop.lng
    ? calculateDistance(
        userLocation.lat, 
        userLocation.lng, 
        parseFloat(shop.lat.toString()), 
        parseFloat(shop.lng.toString())
      )
    : shop.distance;
  
  const formatRating = (rating: number) => {
    return rating > 0 ? rating.toFixed(1) : '0.0';
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    return (
      <div className="flex text-rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className="text-sm">
            {star <= fullStars ? '★' : (star === fullStars + 1 && hasHalfStar ? '☆' : '☆')}
          </span>
        ))}
      </div>
    );
  };

  return (
    <Card 
      className="p-6 hover:border-primary transition-colors cursor-pointer"
      onClick={onClick}
      data-testid={`shop-card-${shop.slug}`}
    >
      <div className="flex items-start space-x-4">
        {/* Shop Image Placeholder */}
        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-2xl">🥙</span>
        </div>

        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <Link 
                href={`/laden/${shop.slug}`}
                className="hover:text-primary transition-colors"
              >
                <h4 className="font-semibold text-lg text-foreground" data-testid={`shop-name-${shop.slug}`}>
                  {shop.name}
                </h4>
              </Link>
              <div className="flex items-center space-x-2 mt-1">
                <div className="flex items-center">
                  {renderStars(shop.avgRating)}
                  <span className="text-sm text-muted-foreground ml-2" data-testid={`shop-rating-${shop.slug}`}>
                    {formatRating(shop.avgRating)} ({shop.reviewCount})
                  </span>
                </div>
                <span className="text-secondary font-semibold" data-testid={`shop-price-${shop.slug}`}>
                  {priceSymbol}
                </span>
              </div>
            </div>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-muted-foreground hover:text-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  openRoute(shop.lat, shop.lng, shop.name);
                }}
                data-testid={`shop-route-${shop.slug}`}
                title="Route planen"
              >
                <Navigation size={16} />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className={`transition-colors ${isFavorite 
                  ? 'text-red-500 hover:text-red-600' 
                  : 'text-muted-foreground hover:text-red-500'
                }`}
                onClick={handleFavoriteClick}
                disabled={addFavoriteMutation.isPending || removeFavoriteMutation.isPending}
                data-testid={`shop-favorite-${shop.slug}`}
                title={isFavorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
              >
                <Heart 
                  size={16} 
                  className={isFavorite ? "fill-current" : ""} 
                />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {shop.halal && (
              <Badge variant="secondary" className="text-xs" data-testid={`shop-halal-${shop.slug}`}>
                Halal
              </Badge>
            )}
            {shop.veg && (
              <Badge variant="outline" className="text-xs bg-accent text-accent-foreground" data-testid={`shop-veggie-${shop.slug}`}>
                Veggie
              </Badge>
            )}
            {shop.hasOffers && (
              <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800 border-orange-300" data-testid={`shop-offers-${shop.slug}`}>
                <Tag className="mr-1" size={10} />
                Sonderangebote
              </Badge>
            )}
            {shop.hasDelivery && (
              <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-300" data-testid={`shop-delivery-${shop.slug}`}>
                <Truck className="mr-1" size={10} />
                Lieferservice
              </Badge>
            )}
            <Badge 
              variant="outline" 
              className={`text-xs ${isOpen ? 'bg-success text-white' : 'bg-error text-white'}`}
              data-testid={`shop-status-${shop.slug}`}
            >
              {isOpen ? 'Jetzt geöffnet' : 'Geschlossen'}
            </Badge>
            {distance && (
              <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800 border-purple-300" data-testid={`shop-distance-${shop.slug}`}>
                <Target className="mr-1" size={10} />
                {formatDistance(distance)}
              </Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground mb-2 flex items-center" data-testid={`shop-address-${shop.slug}`}>
            <MapPin size={14} className="mr-1" />
            {shop.street}, {shop.city}
          </p>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center" data-testid={`shop-hours-${shop.slug}`}>
              <Clock size={14} className="mr-1" />
              {statusText}
            </span>
            <div className="price-badge text-white px-3 py-1 rounded-full text-sm font-semibold" data-testid={`shop-price-badge-${shop.slug}`}>
              ab 5,50€
            </div>
          </div>
        </div>
      </div>

      {/* Auth Dialog for unauthenticated users */}
      {showAuthDialog && (
        <AuthDialog 
          open={showAuthDialog} 
          onOpenChange={setShowAuthDialog}
        />
      )}
    </Card>
  );
}
