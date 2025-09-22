import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function Impressum() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8" data-testid="impressum-title">
          Impressum
        </h1>

        <Card className="space-y-6">
          <CardContent className="p-6 space-y-6">
            {/* Betreiber */}
            <div data-testid="operator-section">
              <h2 className="text-xl font-semibold text-foreground mb-3">Betreiber</h2>
              <div className="text-muted-foreground space-y-1">
                <p><strong className="text-foreground">KroBeX UG (haftungsbeschränkt)</strong></p>
                <p>Stollberger Straße 85</p>
                <p>09119 Chemnitz</p>
                <p>Deutschland</p>
              </div>
            </div>

            {/* Kontakt */}
            <div data-testid="contact-section">
              <h2 className="text-xl font-semibold text-foreground mb-3">Kontakt</h2>
              <div className="text-muted-foreground space-y-1">
                <p><strong className="text-foreground">E-Mail:</strong> info@localdöner.de</p>
                <p><strong className="text-foreground">Website:</strong> www.localdöner.de</p>
              </div>
            </div>

            {/* Hinweis */}
            <div className="p-4 bg-warning bg-opacity-20 border border-warning rounded-lg" data-testid="completion-notice">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="text-warning flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-warning font-medium text-sm">
                    <strong>Hinweis:</strong> Weitere Angaben wie Geschäftsführer, Handelsregister und USt-ID werden noch ergänzt.
                  </p>
                </div>
              </div>
            </div>

            {/* Haftungsausschluss */}
            <div data-testid="disclaimer-section">
              <h2 className="text-xl font-semibold text-foreground mb-3">Haftungsausschluss</h2>
              <div className="text-muted-foreground space-y-3">
                <p>
                  Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, 
                  Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.
                </p>
                <p>
                  Die Informationen zu Öffnungszeiten, Preisen und anderen Angaben zu Dönerläden basieren 
                  auf Nutzereingaben und können sich jederzeit ändern. Wir empfehlen, vor einem Besuch die 
                  aktuellen Informationen direkt beim jeweiligen Laden zu erfragen.
                </p>
              </div>
            </div>

            {/* Verbraucherschlichtung */}
            <div data-testid="dispute-resolution-section">
              <h2 className="text-xl font-semibold text-foreground mb-3">Verbraucherschlichtung</h2>
              <div className="text-muted-foreground">
                <p>
                  Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer 
                  Verbraucherschlichtungsstelle teilzunehmen.
                </p>
              </div>
            </div>

            {/* Verantwortlich für den Inhalt */}
            <div data-testid="content-responsibility-section">
              <h2 className="text-xl font-semibold text-foreground mb-3">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
              <div className="text-muted-foreground space-y-1">
                <p>KroBeX UG (haftungsbeschränkt)</p>
                <p>Stollberger Straße 85</p>
                <p>09119 Chemnitz</p>
                <p>Deutschland</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
