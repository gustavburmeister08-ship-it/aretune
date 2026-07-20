export const TERMS_VERSION = '2026-07-14-integrations-v1';
export const PRIVACY_VERSION = '2026-07-14-integrations-v1';
export const AI_NOTICE_VERSION = '2026-07-14';

export const LEGAL_TEXTS = {
  privacy: {
    title: 'Datenschutzerklärung',
    content: `Verantwortlicher: Gustav Burmeister, [LADUNGSFÄHIGE ANSCHRIFT], privacy@aretune.com.

ARETUNE verarbeitet Konto- und Profildaten, freiwillige Social-Profilangaben, Posts, Bilder, Likes, Kommentare, Meldungen und private Nachrichten, außerdem Onboarding-Antworten, Check-ins, detaillierte Kategorie-Metriken und Notizen, Scores, Direktiven, Audits, Einwilligungsnachweise und technische Produkt-Events. Bei aktiviertem Community-Profil sind Name, Beschreibung, Profilbild, externe Profillinks und veröffentlichte Beiträge für angemeldete Community-Mitglieder sichtbar; veröffentlichte Medien werden über öffentlich abrufbare, schwer erratbare URLs bereitgestellt. Private Nachrichten sind nur für die Gesprächsteilnehmer lesbar. Kategorie-Metriken bleiben kontobezogen geschützt und sind keine öffentlichen Profildaten.

Optional kannst du Trackingquellen verbinden oder CSV-/JSON-Dateien importieren. Dabei verarbeiten wir die von dir ausgewählten Aktivitäts-, Schlaf-, Ernährungs-, Achtsamkeits-, Stimmungs-, Körper- und gegebenenfalls medizinischen Messwerte, Quellenkennungen, Synchronisationszeiten sowie technische Fehler. OAuth-Zugangs- und Aktualisierungstoken werden serverseitig verschlüsselt gespeichert, niemals im Profil angezeigt und beim Trennen oder bei der Kontolöschung gelöscht. Gerätedaten von Apple Health, Android Health Connect und Samsung Health erfordern gesonderte Betriebssystemberechtigungen. Medizinische Rohwerte werden nicht automatisch diagnostisch bewertet. Du kannst Verbindungen einzeln widerrufen; Importdaten sind Bestandteil des Datenexports.

Auftragsverarbeiter sind Supabase für Authentifizierung und Datenbankbetrieb sowie Cloudflare für Pages-Hosting, Pages Functions und, nur bei aktivierter KI-Einwilligung, Workers AI. Andere serverseitige Konfigurationen können einen in der vollständigen Datenschutzerklärung genannten KI-API-Anbieter einsetzen. Internationale Übermittlungen können auf Standardvertragsklauseln oder anderen zulässigen Garantien beruhen.

Deine Produktdaten werden grundsätzlich bis zur Kontolöschung gespeichert. Technische Produkt-Events werden für höchstens 12 Monate benötigt; API-Sicherheitslogs sollen höchstens 30 Tage aufbewahrt werden. Einwilligungsnachweise können zur Erfüllung rechtlicher Nachweispflichten länger gespeichert werden.

Du hast insbesondere Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch, Widerruf einer Einwilligung und Beschwerde bei einer Datenschutzaufsichtsbehörde. Export und Kontolöschung sind in der App verfügbar.

Die vollständige, veröffentlichungsfähige Fassung befindet sich im Projekt unter legal/DATENSCHUTZERKLAERUNG.md.`,
  },
  terms: {
    title: 'Nutzungsbedingungen',
    content: `Anbieter: Gustav Burmeister, [LADUNGSFÄHIGE ANSCHRIFT], support@aretune.com.

ARETUNE ist ein Selbstreflexions-, Tracking- und Coaching-Werkzeug für volljährige Nutzer. Der Dienst ist kein Medizinprodukt und ersetzt keine ärztliche, psychotherapeutische, rechtliche oder finanzielle Beratung. KI-Ausgaben können falsch, unvollständig oder ungeeignet sein und müssen eigenverantwortlich geprüft werden.

Du bist für richtige Kontodaten, die Sicherheit deiner Zugangsdaten und die Rechtmäßigkeit deiner Eingaben verantwortlich. Unzulässig sind rechtswidrige Nutzung, Missbrauch, Umgehung technischer Schutzmaßnahmen und die Eingabe personenbezogener Daten Dritter ohne Rechtsgrundlage.

Für Community-Inhalte gilt zusätzlich: keine Belästigung, Hassrede, Gewaltandrohung, nicht einvernehmliche intime Inhalte, Spam, Identitätstäuschung oder Verletzung fremder Rechte. Inhalte können gemeldet, geprüft und bei Verstößen entfernt werden; Konten können nach Maßgabe der gesetzlichen Anforderungen eingeschränkt werden. Private Nachrichten dürfen nicht für unerwünschte Werbung oder Belästigung genutzt werden.

In der Alpha besteht kein Anspruch auf ununterbrochene Verfügbarkeit. Gesetzliche Verbraucherrechte und zwingende Haftungsvorschriften bleiben unberührt. Die vollständige Fassung befindet sich unter legal/NUTZUNGSBEDINGUNGEN.md.`,
  },
  ai: {
    title: 'KI-Transparenz und Einwilligung',
    content: `Tägliche Direktiven und textliche Wochenzusammenfassungen werden durch ein KI-System erzeugt. Die App kennzeichnet diese Inhalte als KI-generiert.

Für die Generierung werden deine Phase, aktiven Säulen, Scores, Stimmung, Energie und ausgewählte Metrikverläufe an Cloudflare Workers AI oder den konfigurierten KI-API-Anbieter übertragen. Freitext-Notizen werden derzeit nicht an die KI gesendet. Diese Daten können Rückschlüsse auf Gesundheit, emotionale Verfassung, Beziehungen oder Finanzen zulassen.

Die KI-Einwilligung ist freiwillig und separat. Ohne sie bleiben Konto, Tracking und deterministisches Scoring nutzbar; KI-Direktiven und KI-Zusammenfassungen sind deaktiviert. Du kannst die Einwilligung jederzeit mit Wirkung für die Zukunft in „Privacy & Data“ widerrufen.`,
  },
} as const;

export type LegalDocument = keyof typeof LEGAL_TEXTS;
