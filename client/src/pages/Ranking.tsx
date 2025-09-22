import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ShopCard from "@/components/ShopCard";
import { api } from "@/lib/api";
import type { SearchFilters } from "@/lib/types";

export default function Ranking() {
  const { city } = useParams<{ city: string }>();
  const [sortBy, setSortBy] = useState<'rating' | 'price' | 'distance'>('rating');

  // Fetch shops for the city
  const filters: SearchFilters = {
    city: city || undefined,
    sortBy
  };

  const { data: shops = [], isLoading, error } = useQuery({
    queryKey: ['/api/shops', filters],
    queryFn: () => api.getShops(filters),
    enabled: !!city,
  });

  const cityName = city ? city.charAt(0).toUpperCase() + city.slice(1) : '';

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2" size={16} />
            Zurück zur Übersicht
          </Button>
        </Link>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="ranking-title">
              Dönerläden in {cityName}
            </h1>
            <p className="text-muted-foreground mt-1" data-testid="ranking-count">
              {shops.length} {shops.length === 1 ? 'Laden gefunden' : 'Läden gefunden'}
            </p>
          </div>
          
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-48" data-testid="ranking-sort-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Beste Bewertung</SelectItem>
              <SelectItem value="price">Preis/Leistung</SelectItem>
              <SelectItem value="distance">Entfernung</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4" data-testid="ranking-loading">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton h-32 rounded-lg"></div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12" data-testid="ranking-error">
          <p className="text-muted-foreground mb-4">
            Fehler beim Laden der Dönerläden für {cityName}.
          </p>
          <Button onClick={() => window.location.reload()}>
            Erneut versuchen
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && shops.length === 0 && (
        <div className="text-center py-12" data-testid="ranking-empty">
          <h2 className="text-xl font-semibold mb-4">Keine Dönerläden gefunden</h2>
          <p className="text-muted-foreground mb-6">
            In {cityName} sind noch keine Dönerläden registriert.
          </p>
          <Link href="/melden">
            <Button>Ersten Laden melden</Button>
          </Link>
        </div>
      )}

      {/* Shop List */}
      <div className="max-w-4xl mx-auto" data-testid="ranking-list">
        <div className="space-y-4">
          {shops.map((shop, index) => (
            <div key={shop.id} className="relative">
              {/* Ranking Number */}
              <div className="absolute -left-4 top-4 z-10">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
              </div>
              
              <ShopCard 
                shop={shop}
                onClick={() => window.location.href = `/laden/${shop.slug}`}
              />
            </div>
          ))}
        </div>

        {/* Pagination could be added here */}
        {shops.length > 0 && shops.length % 20 === 0 && (
          <div className="text-center mt-8">
            <Button variant="outline" data-testid="ranking-load-more">
              Mehr laden
            </Button>
          </div>
        )}
      </div>

      {/* SEO Content */}
      <div className="max-w-4xl mx-auto mt-16 prose prose-invert">
        <h2 className="text-2xl font-semibold mb-4">Die besten Dönerläden in {cityName}</h2>
        <p className="text-muted-foreground">
          Entdecke die beliebtesten Dönerläden in {cityName}. Unsere Rangliste basiert auf echten 
          Nutzerbewertungen und berücksichtigt Faktoren wie Geschmack, Preis-Leistung und Service. 
          Finde deinen neuen Lieblingsdöner und teile deine Erfahrungen mit der Community.
        </p>
      </div>
    </div>
  );
}
