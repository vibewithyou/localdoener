import { Link } from "wouter";
import { MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-card border-t border-border mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <MapPin className="text-primary-foreground text-xs" size={12} />
            </div>
            <span className="font-semibold text-foreground">LocalDöner</span>
          </div>

          <nav className="flex items-center space-x-6 text-sm">
            <Link
              href="/impressum"
              className="text-muted-foreground hover:text-foreground transition-colors"
              data-testid="footer-link-impressum"
            >
              Impressum
            </Link>
            <Link
              href="/datenschutz"
              className="text-muted-foreground hover:text-foreground transition-colors"
              data-testid="footer-link-datenschutz"
            >
              Datenschutz
            </Link>
            <Link
              href="/melden"
              className="text-muted-foreground hover:text-foreground transition-colors"
              data-testid="footer-link-melden"
            >
              Laden melden
            </Link>
          </nav>
        </div>
        <div className="text-center mt-6 pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground">
            © 2025 LocalDöner - Alle Rechte vorbehalten
          </p>
        </div>
      </div>
    </footer>
  );
}
