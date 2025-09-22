import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";

export default function Datenschutz() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8" data-testid="datenschutz-title">
          Datenschutzerklärung
        </h1>

        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Datenschutz auf einen Blick */}
            <div data-testid="privacy-overview-section">
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Datenschutz auf einen Blick</h2>
              <div className="text-muted-foreground space-y-3">
                <p>
                  Diese Datenschutzerklärung klärt Sie über die Art, den Umfang und Zweck der Verarbeitung 
                  von personenbezogenen Daten auf unserer Website auf.
                </p>
                <div>
                  <p><strong className="text-foreground">Verantwortlicher für die Datenverarbeitung:</strong></p>
                  <div className="mt-2 ml-4">
                    <p>KroBeX UG (haftungsbeschränkt)</p>
                    <p>Stollberger Straße 85</p>
                    <p>09119 Chemnitz</p>
                    <p>E-Mail: info@localdöner.de</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Datenerfassung */}
            <div data-testid="data-collection-section">
              <h2 className="text-xl font-semibold text-foreground mb-3">2. Datenerfassung auf unserer Website</h2>
              <div className="text-muted-foreground space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-2">Cookies und Analytics</h3>
                  <p>Aktuell verwenden wir <strong className="text-foreground">keine</strong> Cookies oder Analytics-Tools auf unserer Website.</p>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-2">Kartenanzeige</h3>
                  <p>
                    Für die Anzeige der Karte verwenden wir <strong className="text-foreground">OpenStreetMap Tiles</strong>. 
                    Beim Laden der Karte wird Ihre IP-Adresse an die OpenStreetMap-Server übertragen. Dies erfolgt auf 
                    Grundlage von Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Bereitstellung der Kartenfunktion).
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-2">Bewertungen und Meldungen</h3>
                  <p>
                    Wenn Sie Bewertungen schreiben oder Läden melden, speichern wir die von Ihnen eingegebenen Daten. 
                    Zur Spam-Prävention erstellen wir einen anonymen Hash aus Ihrer IP-Adresse und Browser-Informationen.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-foreground mb-2">Server-Logs</h3>
                  <p>
                    Der Website-Provider erhebt und speichert automatisch Informationen in Server-Log-Dateien, 
                    die Ihr Browser automatisch an uns übermittelt. Dies sind:
                  </p>
                  <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                    <li>Browsertyp und Browserversion</li>
                    <li>Verwendetes Betriebssystem</li>
                    <li>Referrer URL</li>
                    <li>Hostname des zugreifenden Rechners</li>
                    <li>Uhrzeit der Serveranfrage</li>
                    <li>IP-Adresse</li>
                  </ul>
                  <p className="mt-2">
                    Diese Daten werden nicht mit anderen Datenquellen zusammengeführt. Grundlage für die 
                    Datenverarbeitung ist Art. 6 Abs. 1 lit. f DSGVO.
                  </p>
                </div>
              </div>
            </div>

            {/* Rechtsgrundlage */}
            <div data-testid="legal-basis-section">
              <h2 className="text-xl font-semibold text-foreground mb-3">3. Rechtsgrundlage der Verarbeitung</h2>
              <div className="text-muted-foreground space-y-3">
                <p>
                  Art. 6 Abs. 1 lit. a DSGVO dient unserem Unternehmen als Rechtsgrundlage für Verarbeitungsvorgänge, 
                  bei denen wir eine Einwilligung für einen bestimmten Verarbeitungszweck einholen.
                </p>
                <p>
                  Ist die Verarbeitung personenbezogener Daten zur Erfüllung eines Vertrags, dessen Vertragspartei 
                  die betroffene Person ist, erforderlich, wie dies beispielsweise bei Verarbeitungsvorgängen der Fall ist, 
                  die für eine Lieferung von Waren oder die Erbringung einer sonstigen Leistung oder Gegenleistung 
                  notwendig sind, so beruht die Verarbeitung auf Art. 6 Abs. 1 lit. b DSGVO.
                </p>
                <p>
                  Liegt eine lebenswichtige Interesse einer natürlichen Person oder einer anderen natürlichen Person 
                  erforderlich, so dient Art. 6 Abs. 1 lit. d DSGVO als Rechtsgrundlage.
                </p>
                <p>
                  Ist die Verarbeitung zur Wahrung eines berechtigten Interesses unseres Unternehmens oder eines Dritten 
                  erforderlich und überwiegen die Interessen, Grundrechte und Grundfreiheiten des Betroffenen das 
                  erstgenannte Interesse nicht, so dient Art. 6 Abs. 1 lit. f DSGVO als Rechtsgrundlage für die Verarbeitung.
                </p>
              </div>
            </div>

            {/* Ihre Rechte */}
            <div data-testid="user-rights-section">
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Ihre Rechte</h2>
              <div className="text-muted-foreground space-y-3">
                <p>Sie haben jederzeit das Recht:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Auskunft über Ihre bei uns gespeicherten personenbezogenen Daten und deren Verarbeitung zu erhalten (Art. 15 DSGVO)</li>
                  <li>Berichtigung unrichtiger personenbezogener Daten (Art. 16 DSGVO)</li>
                  <li>Löschung Ihrer bei uns gespeicherten personenbezogenen Daten (Art. 17 DSGVO)</li>
                  <li>Einschränkung der Datenverarbeitung (Art. 18 DSGVO)</li>
                  <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
                  <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
                </ul>
                <p>
                  Für Anfragen bezüglich Ihrer Rechte wenden Sie sich bitte an: 
                  <strong className="text-foreground"> info@localdöner.de</strong>
                </p>
                <p>
                  Sie haben außerdem das Recht, sich bei einer Datenschutz-Aufsichtsbehörde über die Verarbeitung 
                  Ihrer personenbezogenen Daten durch uns zu beschweren.
                </p>
              </div>
            </div>

            {/* Datenspeicherung */}
            <div data-testid="data-retention-section">
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Dauer der Speicherung</h2>
              <div className="text-muted-foreground space-y-3">
                <p>
                  Personenbezogene Daten werden nur so lange gespeichert, wie es für den jeweiligen Zweck erforderlich ist. 
                  Bewertungen und Meldungen werden dauerhaft gespeichert, um die Qualität der Plattform zu gewährleisten.
                </p>
                <p>
                  Log-Dateien werden nach 30 Tagen automatisch gelöscht, es sei denn, sie werden für 
                  Sicherheitszwecke benötigt.
                </p>
              </div>
            </div>

            {/* SSL-Verschlüsselung */}
            <div data-testid="ssl-section">
              <h2 className="text-xl font-semibold text-foreground mb-3">6. SSL- bzw. TLS-Verschlüsselung</h2>
              <div className="text-muted-foreground space-y-3">
                <p>
                  Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der Übertragung vertraulicher Inhalte, 
                  wie zum Beispiel Bewertungen oder Anfragen, die Sie an uns als Seitenbetreiber senden, eine 
                  SSL-bzw. TLS-Verschlüsselung.
                </p>
                <p>
                  Eine verschlüsselte Verbindung erkennen Sie daran, dass die Adresszeile des Browsers von 
                  "http://" auf "https://" wechselt und an dem Schloss-Symbol in Ihrer Browserzeile.
                </p>
              </div>
            </div>

            {/* Zukunftige Änderungen */}
            <div className="p-4 bg-accent bg-opacity-20 border border-accent rounded-lg" data-testid="future-changes-notice">
              <div className="flex items-start space-x-2">
                <Info className="text-accent flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-accent text-sm">
                    <strong>Hinweis:</strong> Sollten wir zukünftig Analytics-Tools wie Plausible oder Umami einsetzen, 
                    werden wir einen entsprechenden Cookie-Banner implementieren und diese Datenschutzerklärung aktualisieren.
                  </p>
                </div>
              </div>
            </div>

            {/* Kontakt */}
            <div data-testid="contact-section">
              <h2 className="text-xl font-semibold text-foreground mb-3">7. Kontakt bei Fragen zum Datenschutz</h2>
              <div className="text-muted-foreground">
                <p>
                  Bei Fragen zum Datenschutz oder zur Verarbeitung personenbezogener Daten kontaktieren Sie uns unter:
                </p>
                <div className="mt-2 ml-4">
                  <p><strong className="text-foreground">E-Mail:</strong> info@localdöner.de</p>
                  <p><strong className="text-foreground">Anschrift:</strong> KroBeX UG, Stollberger Straße 85, 09119 Chemnitz</p>
                </div>
              </div>
            </div>

            {/* Stand der Datenschutzerklärung */}
            <div className="border-t border-border pt-4">
              <p className="text-sm text-muted-foreground" data-testid="last-updated">
                Stand dieser Datenschutzerklärung: September 2025
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
