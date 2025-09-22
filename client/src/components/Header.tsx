import { Link, useLocation } from "wouter";
import { Menu, X, User, LogIn } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import UserMenu from "@/components/auth/UserMenu";
import AuthDialog from "@/components/auth/AuthDialog";
import logoImage from "../assets/logo.png";

export default function Header() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authDialogTab, setAuthDialogTab] = useState<"login" | "register">("login");
  const { isAuthenticated, isLoading } = useAuth();

  const navigation = [
    { name: 'Home', href: '/', current: location === '/' },
    { name: 'Ranking', href: '/ranking/freiberg', current: location.startsWith('/ranking') },
    { name: 'Laden melden', href: '/melden', current: location === '/melden' },
  ];

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <img 
              src={logoImage} 
              alt="LocalDöner Logo" 
              className="h-12 w-auto object-contain hover:scale-105 transition-transform duration-200"
              data-testid="logo-image"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <nav className="flex items-center space-x-6">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    item.current ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                  data-testid={`nav-${item.name.toLowerCase().replace(' ', '-')}`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
            
            {/* Authentication UI */}
            {!isLoading && (
              <div className="flex items-center space-x-2">
                {isAuthenticated ? (
                  <UserMenu />
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAuthDialogTab("login");
                        setAuthDialogOpen(true);
                      }}
                      data-testid="button-login"
                    >
                      <LogIn className="mr-2 h-4 w-4" />
                      Anmelden
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setAuthDialogTab("register");
                        setAuthDialogOpen(true);
                      }}
                      data-testid="button-register"
                    >
                      <User className="mr-2 h-4 w-4" />
                      Registrieren
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="mobile-menu-button"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden mt-4 pb-4 border-t border-border pt-4">
            <div className="flex flex-col space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`py-2 text-sm font-medium transition-colors hover:text-primary ${
                    item.current ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                  data-testid={`mobile-nav-${item.name.toLowerCase().replace(' ', '-')}`}
                >
                  {item.name}
                </Link>
              ))}
              
              {/* Mobile Authentication UI */}
              {!isLoading && (
                <div className="pt-2 border-t border-border">
                  {isAuthenticated ? (
                    <div className="py-2">
                      <UserMenu />
                    </div>
                  ) : (
                    <div className="flex flex-col space-y-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="justify-start p-2"
                        onClick={() => {
                          setAuthDialogTab("login");
                          setAuthDialogOpen(true);
                          setMobileMenuOpen(false);
                        }}
                        data-testid="mobile-button-login"
                      >
                        <LogIn className="mr-2 h-4 w-4" />
                        Anmelden
                      </Button>
                      <Button
                        size="sm"
                        className="justify-start"
                        onClick={() => {
                          setAuthDialogTab("register");
                          setAuthDialogOpen(true);
                          setMobileMenuOpen(false);
                        }}
                        data-testid="mobile-button-register"
                      >
                        <User className="mr-2 h-4 w-4" />
                        Registrieren
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </nav>
        )}
        
        {/* Authentication Dialog */}
        <AuthDialog
          isOpen={authDialogOpen}
          onClose={() => setAuthDialogOpen(false)}
          defaultTab={authDialogTab}
        />
      </div>
    </header>
  );
}
