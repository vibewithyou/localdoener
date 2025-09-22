import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { User, UserWithProfile, InsertUser, LoginUser } from '@/lib/types';

interface AuthContextType {
  user: UserWithProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginUser) => Promise<void>;
  register: (data: InsertUser) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user session
  const { data: userResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: () => api.getMe(),
    retry: false,
    enabled: true,
  });

  const user = userResponse?.user || null;
  const isAuthenticated = !!user;

  // Initialize auth state on mount
  useEffect(() => {
    if (!isLoading) {
      setIsInitialized(true);
    }
  }, [isLoading]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (data: LoginUser) => api.login(data),
    onSuccess: (response) => {
      // Update user data in cache
      queryClient.setQueryData(['/api/auth/me'], { user: response.user });
      toast({
        title: "Erfolgreich angemeldet",
        description: `Willkommen zurück, ${response.user.name}!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Anmeldung fehlgeschlagen",
        description: error.message || "E-Mail oder Passwort ist falsch",
        variant: "destructive",
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (data: InsertUser) => api.register(data),
    onSuccess: (response) => {
      // Update user data in cache
      queryClient.setQueryData(['/api/auth/me'], { user: response.user });
      toast({
        title: "Registrierung erfolgreich",
        description: `Willkommen bei LocalDöner, ${response.user.name}!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Registrierung fehlgeschlagen",
        description: error.message || "Registrierung konnte nicht abgeschlossen werden",
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => api.logout(),
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();
      toast({
        title: "Erfolgreich abgemeldet",
        description: "Du wurdest erfolgreich abgemeldet.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Abmeldung fehlgeschlagen",
        description: error.message || "Abmeldung konnte nicht abgeschlossen werden",
        variant: "destructive",
      });
    },
  });

  const login = async (data: LoginUser) => {
    await loginMutation.mutateAsync(data);
  };

  const register = async (data: InsertUser) => {
    await registerMutation.mutateAsync(data);
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const refreshUser = () => {
    refetch();
  };

  const contextValue: AuthContextType = {
    user,
    isLoading: isLoading || !isInitialized,
    isAuthenticated,
    login,
    register,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for protecting routes
export function useRequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return { isLoading: true, isAuthenticated: false };
  }
  
  return { isLoading: false, isAuthenticated };
}