# Internes Verzeichnis von Verarbeitungstätigkeiten – Alpha

Verantwortlicher: Aretune – Einzelunternehmen Gustav Burmeister, An der Märchenwiese 40, 04277 Leipzig  
Stand: 21. Juli 2026

| Verarbeitung | Betroffene/Daten | Zweck | Rechtsgrundlage | Empfänger | Löschziel |
|---|---|---|---|---|---|
| Konto/Auth | Nutzer, E-Mail, IDs, Tokens | Anmeldung/Sicherheit | Art. 6(1)(b) DSGVO | Supabase | Kontolöschung |
| Onboarding/Profil | Antworten, Phase, Säulen, Scores | Personalisierung | Art. 6(1)(b) | Supabase | Kontolöschung |
| Social-Profil/Feed | Beschreibung, Profilbild, Links, Posts, Bilder, Likes, Kommentare, Follows | Selbstdarstellung und Community | Art. 6(1)(b), Moderation Art. 6(1)(f) | Supabase Database/Storage | Einzel-/Kontolöschung |
| Private Nachrichten | Teilnehmer, Nachrichten, Zeit- und Lesestatus | Direkte Kommunikation | Art. 6(1)(b) | Supabase | Konversations-/Kontolöschung |
| Inhaltsmeldungen | Melder, Zielinhalt, Grund, Status | Community-Sicherheit/Moderation | Art. 6(1)(f) | Supabase | nach Moderations- und Nachweisfrist |
| Check-ins | Stimmung, Energie, Metriken, Notizen | Tracking/Scoring | Art. 6(1)(b); ggf. Art. 9(2)(a) | Supabase | Kontolöschung |
| Kategorie-Tracking | Gesundheits-, Leistungs-, Psychologie-, Beziehungs-, Finanz- und Lebensereignis-Metriken, Kontextnotizen | Detailliertes Tracking/Scoring | Art. 6(1)(b); bei besonderen Kategorien ggf. Art. 9(2)(a) | Supabase | Kontolöschung |
| KI-Coaching | Scores und numerische Verläufe | Direktive/Audit | Art. 6(1)(a), Art. 9(2)(a) | konfigurierter KI-Anbieter | Anbieterfrist/Vertrag prüfen |
| Produkt-Events | Ereignistyp, Nutzer-ID, Zeit | Betrieb/Verbesserung | Art. 6(1)(f) | Supabase | 12 Monate |
| Sicherheitslogs | IP/Route/Status/Fehler | Missbrauchsschutz | Art. 6(1)(f) | API-Host | 30 Tage |
| Einwilligungsnachweis | Typ, Version, Status, Zeit | Nachweis | Art. 6(1)(c)/(f) | Supabase | Nachweispflicht/Verjährung |

## Technische und organisatorische Maßnahmen

- TLS für alle externen Verbindungen
- Supabase Row Level Security
- Service-Role-Key ausschließlich serverseitig
- SecureStore auf Mobilgeräten
- Authentifizierte und rate-limitierte KI-Endpunkte
- Datenminimierung im KI-Payload
- versionierte Einwilligungen und Widerruf
- Kontoexport und kaskadierende Kontolöschung
- CI, Dependency Audit und getrennte Umgebungen

Offen vor Produktion: AV-Verträge mit Supabase und Cloudflare abschließen, Backup-Löschfrist verifizieren, Incident-Prozess und zuständige Aufsichtsbehörde dokumentieren, Datenschutz-Folgenabschätzungs-Schwelle prüfen.
