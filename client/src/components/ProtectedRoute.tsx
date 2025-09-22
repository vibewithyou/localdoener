import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import AuthDialog from "@/components/auth/AuthDialog";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center" data-testid="loading-protected-route">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Prüfe Anmeldung...</p>
        </div>
      </div>
    );
  }

  // Show login dialog if not authenticated
  if (!isAuthenticated) {
    return (
      fallback || (
        <>
          <div className="min-h-[50vh] flex items-center justify-center" data-testid="auth-required">
            <div className="max-w-md mx-auto text-center p-6">
              <h2 className="text-2xl font-bold mb-4">Anmeldung erforderlich</h2>
              <p className="text-muted-foreground mb-6">
                Du musst angemeldet sein, um diese Seite zu sehen.
              </p>
              <button 
                className="btn-primary px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                onClick={() => setShowAuthDialog(true)}
                data-testid="button-login"
              >
                Jetzt anmelden
              </button>
            </div>
          </div>
          <AuthDialog 
            isOpen={showAuthDialog} 
            onClose={() => setShowAuthDialog(false)} 
          />
        </>
      )
    );
  }

  // Render children if authenticated
  return <>{children}</>;
}