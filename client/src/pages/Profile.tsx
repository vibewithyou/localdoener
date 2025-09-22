import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Edit3, Calendar, Star, Heart, Mail, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";
import type { UpdateUserProfile } from "@/lib/types";

export default function Profile() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}

function ProfileContent() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: UpdateUserProfile) => api.updateProfile(data),
    onSuccess: () => {
      toast({
        title: "Profil aktualisiert",
        description: "Deine Änderungen wurden erfolgreich gespeichert.",
      });
      setIsEditing(false);
      refreshUser();
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
    onError: (error: any) => {
      toast({
        title: "Fehler",
        description: error.message || "Profil konnte nicht aktualisiert werden.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({
        title: "Fehler",
        description: "Name ist erforderlich.",
        variant: "destructive",
      });
      return;
    }

    const updates: UpdateUserProfile = {};
    if (formData.name !== user?.name) {
      updates.name = formData.name.trim();
    }

    if (Object.keys(updates).length > 0) {
      updateProfileMutation.mutate(updates);
    } else {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || "",
      email: user?.email || "",
    });
    setIsEditing(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground" data-testid="profile-title">
            Mein Profil
          </h1>
          {!isEditing && (
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              data-testid="edit-profile-button"
            >
              <Edit3 className="mr-2" size={16} />
              Bearbeiten
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Info */}
          <div className="lg:col-span-2">
            <Card data-testid="profile-info-card">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="mr-2" size={20} />
                  Persönliche Informationen
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <form onSubmit={handleSubmit} className="space-y-4" data-testid="profile-edit-form">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Dein vollständiger Name"
                        data-testid="input-name"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">E-Mail (schreibgeschützt)</Label>
                      <Input
                        id="email"
                        value={formData.email}
                        disabled
                        className="bg-muted"
                        data-testid="input-email"
                      />
                      <p className="text-xs text-muted-foreground">
                        E-Mail-Adresse kann nicht geändert werden
                      </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                        data-testid="save-profile-button"
                      >
                        {updateProfileMutation.isPending ? 'Speichert...' : 'Speichern'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        data-testid="cancel-edit-button"
                      >
                        Abbrechen
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-6" data-testid="profile-display">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                        <AvatarFallback className="text-lg">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h2 className="text-xl font-semibold" data-testid="user-name">{user.name}</h2>
                        <p className="text-muted-foreground flex items-center" data-testid="user-email">
                          <Mail className="mr-1" size={14} />
                          {user.email}
                        </p>
                        <div className="flex items-center mt-1">
                          {user.isEmailVerified ? (
                            <Badge variant="default" className="text-xs">
                              <Shield className="mr-1" size={10} />
                              E-Mail verifiziert
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              <Shield className="mr-1" size={10} />
                              E-Mail nicht verifiziert
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <Calendar className="mx-auto mb-2 text-muted-foreground" size={20} />
                        <p className="text-sm text-muted-foreground">Mitglied seit</p>
                        <p className="font-medium" data-testid="join-date">
                          {formatDate(user.createdAt)}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <User className="mx-auto mb-2 text-muted-foreground" size={20} />
                        <p className="text-sm text-muted-foreground">Letzter Login</p>
                        <p className="font-medium" data-testid="last-login">
                          {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Nie'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Statistics */}
          <div className="space-y-6">
            <Card data-testid="stats-card">
              <CardHeader>
                <CardTitle>Statistiken</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center">
                    <Heart className="mr-2 text-red-500" size={20} />
                    <span className="text-sm">Favoriten</span>
                  </div>
                  <span className="font-bold text-lg" data-testid="favorites-count">
                    {user.favoriteCount}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center">
                    <Star className="mr-2 text-yellow-500" size={20} />
                    <span className="text-sm">Bewertungen</span>
                  </div>
                  <span className="font-bold text-lg" data-testid="reviews-count">
                    {user.reviewCount}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="quick-actions-card">
              <CardHeader>
                <CardTitle>Schnellzugriff</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/favoriten'}
                  data-testid="goto-favorites-button"
                >
                  <Heart className="mr-2" size={16} />
                  Meine Favoriten
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/meine-bewertungen'}
                  data-testid="goto-reviews-button"
                >
                  <Star className="mr-2" size={16} />
                  Meine Bewertungen
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}