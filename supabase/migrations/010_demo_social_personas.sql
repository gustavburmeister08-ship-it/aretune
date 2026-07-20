-- Seed 20 clearly labelled, non-login demo personas for a populated community.
-- These records have no password and no auth identity. Reserved .invalid email
-- addresses make the accounts unreachable while preserving existing FKs.

create temporary table demo_social_personas (
  position integer primary key,
  user_id uuid unique not null,
  email text unique not null,
  display_name text not null,
  bio text not null,
  active_pillars text[] not null,
  pillar_scores jsonb not null,
  posts text[] not null
) on commit drop;

insert into demo_social_personas values
  (1, '10000000-0000-4000-8000-000000000001', 'demo.elon-musk@uebermensch.invalid', 'Elon Musk · Demo',
   'Demo-Profil zu Technologie und Unternehmertum. Nicht offiziell und nicht von Elon Musk betrieben.',
   array['mind','vocation','lore'], '{"body":72,"mind":88,"spirit":70,"relationships":68,"vocation":94,"lore":82}',
   array[
     'DEMO-IMPULS · Große Vorhaben werden handhabbar, wenn das Problem auf seine physikalischen und wirtschaftlichen Grundannahmen reduziert wird.',
     'DEMO-IMPULS · Ein schneller Lernzyklus braucht ein klares Ziel, einen messbaren Test und die Bereitschaft, eine falsche Annahme sofort zu verwerfen.',
     'DEMO-IMPULS · Ambition ist erst dann nützlich, wenn sie in einen konkreten nächsten Prototyp übersetzt wird.'
   ]),
  (2, '10000000-0000-4000-8000-000000000002', 'demo.arnold-schwarzenegger@uebermensch.invalid', 'Arnold Schwarzenegger · Demo',
   'Demo-Profil zu Training, Film und öffentlichem Dienst. Nicht offiziell und nicht von Arnold Schwarzenegger betrieben.',
   array['body','vocation','relationships'], '{"body":95,"mind":82,"spirit":86,"relationships":88,"vocation":90,"lore":78}',
   array[
     'DEMO-IMPULS · Fortschritt im Training entsteht aus Wiederholung: ein sauberer Plan, konsequente Ausführung und ehrliche Regeneration.',
     'DEMO-IMPULS · Eine Vision wird glaubwürdig, wenn der Kalender zeigt, dass jeden Tag dafür gearbeitet wird.',
     'DEMO-IMPULS · Stärke bedeutet auch, andere aufzubauen und Verantwortung für die Gemeinschaft zu übernehmen.'
   ]),
  (3, '10000000-0000-4000-8000-000000000003', 'demo.albert-einstein@uebermensch.invalid', 'Albert Einstein · Demo',
   'Demo-Profil zur theoretischen Physik und wissenschaftlichen Neugier. Keine offizielle oder authentische Präsenz.',
   array['mind','spirit','lore'], '{"body":65,"mind":97,"spirit":84,"relationships":75,"vocation":90,"lore":92}',
   array[
     'DEMO-IMPULS · Eine gute Frage kann wertvoller sein als eine schnelle Antwort. Formuliere heute das Problem präziser, bevor du es löst.',
     'DEMO-IMPULS · Gedankenexperimente schaffen einen Raum, in dem Annahmen sichtbar werden, bevor Ressourcen eingesetzt werden.',
     'DEMO-IMPULS · Komplexität ist kein Qualitätsmerkmal. Suche nach der einfachsten Erklärung, die alle beobachteten Fakten trägt.'
   ]),
  (4, '10000000-0000-4000-8000-000000000004', 'demo.marie-curie@uebermensch.invalid', 'Marie Curie · Demo',
   'Demo-Profil zu Physik, Chemie und beharrlicher Forschung. Keine offizielle oder authentische Präsenz.',
   array['mind','vocation','lore'], '{"body":73,"mind":98,"spirit":87,"relationships":80,"vocation":96,"lore":90}',
   array[
     'DEMO-IMPULS · Sorgfältige Forschung beginnt mit sauberer Beobachtung und endet erst, wenn Ergebnisse reproduzierbar sind.',
     'DEMO-IMPULS · Beharrlichkeit ist kein blindes Weitermachen: Sie verbindet Geduld mit fortlaufender Verbesserung der Methode.',
     'DEMO-IMPULS · Erkenntnis gewinnt an Wert, wenn sie geteilt wird und dem Leben anderer Menschen dient.'
   ]),
  (5, '10000000-0000-4000-8000-000000000005', 'demo.leonardo-da-vinci@uebermensch.invalid', 'Leonardo da Vinci · Demo',
   'Demo-Profil zu Kunst, Anatomie und Erfindungsgeist. Keine offizielle oder authentische Präsenz.',
   array['mind','vocation','lore'], '{"body":80,"mind":96,"spirit":89,"relationships":76,"vocation":91,"lore":99}',
   array[
     'DEMO-IMPULS · Zeichnen ist eine Form des Denkens. Skizziere eine Idee, um Beziehungen zu erkennen, die im Kopf unsichtbar bleiben.',
     'DEMO-IMPULS · Innovation entsteht häufig an den Grenzen zweier Disziplinen. Verbinde heute Wissen aus zwei getrennten Bereichen.',
     'DEMO-IMPULS · Neugier braucht Dokumentation. Halte Beobachtungen fest, bevor sie von der nächsten Idee verdrängt werden.'
   ]),
  (6, '10000000-0000-4000-8000-000000000006', 'demo.ada-lovelace@uebermensch.invalid', 'Ada Lovelace · Demo',
   'Demo-Profil zu Mathematik und den frühen Ideen des Computing. Keine offizielle oder authentische Präsenz.',
   array['mind','vocation','lore'], '{"body":70,"mind":97,"spirit":85,"relationships":80,"vocation":92,"lore":94}',
   array[
     'DEMO-IMPULS · Ein Verfahren wird mächtig, wenn seine Einzelschritte eindeutig genug sind, um von Mensch oder Maschine ausgeführt zu werden.',
     'DEMO-IMPULS · Technische Vorstellungskraft fragt nicht nur, was ein Werkzeug heute kann, sondern welche neuen Ausdrucksformen es ermöglicht.',
     'DEMO-IMPULS · Präzision und Kreativität sind keine Gegensätze. Die stärksten Systeme brauchen beides.'
   ]),
  (7, '10000000-0000-4000-8000-000000000007', 'demo.nikola-tesla@uebermensch.invalid', 'Nikola Tesla · Demo',
   'Demo-Profil zu Elektrotechnik, Energie und Erfindungen. Keine offizielle oder authentische Präsenz.',
   array['mind','vocation','lore'], '{"body":68,"mind":96,"spirit":75,"relationships":65,"vocation":93,"lore":89}',
   array[
     'DEMO-IMPULS · Bevor du baust, simuliere den Mechanismus gedanklich und notiere, an welcher Stelle Energie verloren gehen könnte.',
     'DEMO-IMPULS · Eine Erfindung braucht neben Originalität auch robuste Umsetzung, Sicherheit und einen realen Nutzen.',
     'DEMO-IMPULS · Tiefe Konzentration ist ein Wettbewerbsvorteil. Schütze heute einen ununterbrochenen Arbeitsblock.'
   ]),
  (8, '10000000-0000-4000-8000-000000000008', 'demo.steve-jobs@uebermensch.invalid', 'Steve Jobs · Demo',
   'Demo-Profil zu Produktentwicklung, Design und Fokus. Keine offizielle oder authentische Präsenz.',
   array['vocation','mind','lore'], '{"body":74,"mind":90,"spirit":72,"relationships":76,"vocation":96,"lore":93}',
   array[
     'DEMO-IMPULS · Fokus zeigt sich vor allem in den guten Ideen, die bewusst nicht verfolgt werden.',
     'DEMO-IMPULS · Ein Produkt ist dann verständlich, wenn Technologie, Gestaltung und Nutzerbedürfnis als ein System gedacht werden.',
     'DEMO-IMPULS · Überarbeite heute einen zentralen Ablauf, bis der nächste Schritt für Nutzer offensichtlich wird.'
   ]),
  (9, '10000000-0000-4000-8000-000000000009', 'demo.oprah-winfrey@uebermensch.invalid', 'Oprah Winfrey · Demo',
   'Demo-Profil zu Medien, Kommunikation und persönlicher Entwicklung. Nicht offiziell und nicht von Oprah Winfrey betrieben.',
   array['relationships','spirit','vocation'], '{"body":76,"mind":89,"spirit":91,"relationships":96,"vocation":94,"lore":85}',
   array[
     'DEMO-IMPULS · Ein gutes Gespräch beginnt mit echter Aufmerksamkeit. Höre heute eine Minute länger zu, bevor du antwortest.',
     'DEMO-IMPULS · Persönliche Geschichten schaffen Verbindung, wenn sie ehrlich sind und zugleich die Grenzen anderer respektieren.',
     'DEMO-IMPULS · Einfluss wird nachhaltiger, wenn er Menschen hilft, ihre eigene Stimme und Handlungsfähigkeit zu finden.'
   ]),
  (10, '10000000-0000-4000-8000-000000000010', 'demo.serena-williams@uebermensch.invalid', 'Serena Williams · Demo',
   'Demo-Profil zu Tennis, Leistung und mentaler Stärke. Nicht offiziell und nicht von Serena Williams betrieben.',
   array['body','mind','vocation'], '{"body":98,"mind":95,"spirit":86,"relationships":82,"vocation":96,"lore":80}',
   array[
     'DEMO-IMPULS · Wettkampfstärke wird im unspektakulären Training aufgebaut: Technik, Wiederholung, Erholung und Auswertung.',
     'DEMO-IMPULS · Selbstvertrauen wächst aus Belegen. Sammle heute einen kleinen Beweis dafür, dass deine Vorbereitung funktioniert.',
     'DEMO-IMPULS · Nach einem Fehler zählt die Qualität des nächsten Punktes, nicht die Dauer der Selbstkritik.'
   ]),
  (11, '10000000-0000-4000-8000-000000000011', 'demo.michael-jordan@uebermensch.invalid', 'Michael Jordan · Demo',
   'Demo-Profil zu Basketball, Wettbewerb und Leistungsstandards. Nicht offiziell und nicht von Michael Jordan betrieben.',
   array['body','mind','relationships'], '{"body":97,"mind":96,"spirit":79,"relationships":86,"vocation":94,"lore":76}',
   array[
     'DEMO-IMPULS · Hohe Standards werden erst wirksam, wenn sie auch an gewöhnlichen Trainingstagen gelten.',
     'DEMO-IMPULS · Analysiere einen Fehler nüchtern: Was war die Entscheidung, was das Signal und was wird beim nächsten Versuch verändert?',
     'DEMO-IMPULS · Ein starkes Team braucht individuelle Verantwortung und die Bereitschaft, den freien Mitspieler zu sehen.'
   ]),
  (12, '10000000-0000-4000-8000-000000000012', 'demo.warren-buffett@uebermensch.invalid', 'Warren Buffett · Demo',
   'Demo-Profil zu langfristigem Investieren und rationalen Entscheidungen. Nicht offiziell und nicht von Warren Buffett betrieben.',
   array['mind','vocation','lore'], '{"body":72,"mind":95,"spirit":84,"relationships":82,"vocation":97,"lore":90}',
   array[
     'DEMO-IMPULS · Langfristige Entscheidungen verbessern sich, wenn Anreize, Risiken und Opportunitätskosten offen notiert werden.',
     'DEMO-IMPULS · Bleibe innerhalb deines Kompetenzkreises und erweitere ihn langsam durch Lesen, Erfahrung und überprüfbare Ergebnisse.',
     'DEMO-IMPULS · Geduld ist aktiv: Sie wartet nicht auf Glück, sondern auf ein Verhältnis von Chance und Risiko, das verstanden wird.'
   ]),
  (13, '10000000-0000-4000-8000-000000000013', 'demo.maya-angelou@uebermensch.invalid', 'Maya Angelou · Demo',
   'Demo-Profil zu Literatur, Würde und gesellschaftlicher Stimme. Keine offizielle oder authentische Präsenz.',
   array['lore','relationships','spirit'], '{"body":78,"mind":92,"spirit":93,"relationships":94,"vocation":88,"lore":98}',
   array[
     'DEMO-IMPULS · Schreibe so konkret, dass ein einzelner Moment eine größere menschliche Erfahrung sichtbar machen kann.',
     'DEMO-IMPULS · Würde zeigt sich darin, die eigene Stimme zu nutzen, ohne die Menschlichkeit des Gegenübers zu leugnen.',
     'DEMO-IMPULS · Kreative Arbeit braucht Mut zur Wahrheit und Sorgfalt im Umgang mit den Geschichten anderer.'
   ]),
  (14, '10000000-0000-4000-8000-000000000014', 'demo.nelson-mandela@uebermensch.invalid', 'Nelson Mandela · Demo',
   'Demo-Profil zu Führung, Gerechtigkeit und Versöhnung. Keine offizielle oder authentische Präsenz.',
   array['relationships','spirit','vocation'], '{"body":82,"mind":91,"spirit":97,"relationships":98,"vocation":93,"lore":89}',
   array[
     'DEMO-IMPULS · Führung verbindet ein klares Prinzip mit der Fähigkeit, auch unter Druck langfristige Folgen zu bedenken.',
     'DEMO-IMPULS · Versöhnung ersetzt Verantwortung nicht; sie schafft einen Weg, auf dem Verantwortung zu einer gemeinsamen Zukunft führen kann.',
     'DEMO-IMPULS · Mut bedeutet nicht Abwesenheit von Angst, sondern eine Handlung, die trotz Angst den eigenen Werten entspricht.'
   ]),
  (15, '10000000-0000-4000-8000-000000000015', 'demo.frida-kahlo@uebermensch.invalid', 'Frida Kahlo · Demo',
   'Demo-Profil zu Malerei, Identität und künstlerischem Ausdruck. Keine offizielle oder authentische Präsenz.',
   array['lore','spirit','mind'], '{"body":76,"mind":88,"spirit":95,"relationships":84,"vocation":86,"lore":99}',
   array[
     'DEMO-IMPULS · Kunst kann eine schwierige Erfahrung in eine Form verwandeln, die betrachtet, geteilt und neu verstanden werden kann.',
     'DEMO-IMPULS · Eine eigene Bildsprache entsteht, wenn persönliche Symbole konsequent erforscht statt an Trends angepasst werden.',
     'DEMO-IMPULS · Gestalte heute etwas Kleines, das eine echte Empfindung ausdrückt, ohne sie erklären zu müssen.'
   ]),
  (16, '10000000-0000-4000-8000-000000000016', 'demo.david-attenborough@uebermensch.invalid', 'David Attenborough · Demo',
   'Demo-Profil zu Naturgeschichte und Wissenschaftskommunikation. Nicht offiziell und nicht von David Attenborough betrieben.',
   array['lore','spirit','relationships'], '{"body":83,"mind":94,"spirit":94,"relationships":91,"vocation":90,"lore":96}',
   array[
     'DEMO-IMPULS · Staunen wird belastbar, wenn es von genauer Beobachtung und verständlicher wissenschaftlicher Erklärung begleitet wird.',
     'DEMO-IMPULS · Große ökologische Fragen werden greifbar, wenn die nächste konkrete Handlung im eigenen Einflussbereich sichtbar ist.',
     'DEMO-IMPULS · Erzähle Fakten so, dass Menschen die Verbindung zwischen ihrem Alltag und dem lebendigen System dahinter erkennen.'
   ]),
  (17, '10000000-0000-4000-8000-000000000017', 'demo.jane-goodall@uebermensch.invalid', 'Jane Goodall · Demo',
   'Demo-Profil zu Primatologie, Naturschutz und Hoffnung. Nicht offiziell und nicht von Jane Goodall betrieben.',
   array['relationships','spirit','lore'], '{"body":84,"mind":93,"spirit":97,"relationships":96,"vocation":89,"lore":95}',
   array[
     'DEMO-IMPULS · Geduldige Feldbeobachtung beginnt ohne vorschnelle Erklärung. Notiere zuerst, was tatsächlich geschieht.',
     'DEMO-IMPULS · Hoffnung ist eine Praxis: Wissen, Gemeinschaft und viele kleine Handlungen werden über Zeit zu Veränderung.',
     'DEMO-IMPULS · Respekt vor anderen Lebewesen wächst, wenn wir Verhalten, Lebensraum und Abhängigkeiten wirklich kennenlernen.'
   ]),
  (18, '10000000-0000-4000-8000-000000000018', 'demo.carl-jung@uebermensch.invalid', 'Carl Jung · Demo',
   'Demo-Profil zur analytischen Psychologie und Selbsterkenntnis. Keine Therapie und keine offizielle oder authentische Präsenz.',
   array['mind','spirit','relationships'], '{"body":70,"mind":95,"spirit":96,"relationships":88,"vocation":85,"lore":92}',
   array[
     'DEMO-IMPULS · Selbstbeobachtung wird hilfreich, wenn widersprüchliche Impulse benannt werden, ohne daraus vorschnell eine Diagnose zu machen.',
     'DEMO-IMPULS · Wiederkehrende Bilder und Geschichten können Fragen öffnen. Sie ersetzen keine Fakten und keine professionelle Behandlung.',
     'DEMO-IMPULS · Entwicklung bedeutet auch, Eigenschaften anzuerkennen, die nicht zum bevorzugten Selbstbild passen.'
   ]),
  (19, '10000000-0000-4000-8000-000000000019', 'demo.viktor-frankl@uebermensch.invalid', 'Viktor Frankl · Demo',
   'Demo-Profil zu Sinn, Verantwortung und Resilienz. Keine Therapie und keine offizielle oder authentische Präsenz.',
   array['spirit','mind','relationships'], '{"body":68,"mind":94,"spirit":98,"relationships":92,"vocation":90,"lore":88}',
   array[
     'DEMO-IMPULS · Sinn ist oft weniger eine abstrakte Antwort als eine konkrete Verantwortung gegenüber einer Aufgabe oder einem Menschen.',
     'DEMO-IMPULS · Auch wenn nicht jede Lage gewählt werden kann, bleibt häufig ein kleiner Bereich für Haltung und nächste Handlung.',
     'DEMO-IMPULS · Bei anhaltender psychischer Belastung ist professionelle Hilfe ein Zeichen von Verantwortung, nicht von Schwäche.'
   ]),
  (20, '10000000-0000-4000-8000-000000000020', 'demo.bruce-lee@uebermensch.invalid', 'Bruce Lee · Demo',
   'Demo-Profil zu Kampfkunst, Bewegung und persönlicher Philosophie. Keine offizielle oder authentische Präsenz.',
   array['body','mind','spirit'], '{"body":97,"mind":94,"spirit":93,"relationships":82,"vocation":89,"lore":87}',
   array[
     'DEMO-IMPULS · Effektives Training behält, was funktioniert, verwirft unnötige Bewegung und passt sich dem Kontext an.',
     'DEMO-IMPULS · Technik wird frei, wenn Grundlagen so oft geübt wurden, dass Aufmerksamkeit wieder für den Moment verfügbar ist.',
     'DEMO-IMPULS · Körperliche Präsenz beginnt mit Atmung, Haltung und einer klaren Wahrnehmung dessen, was gerade geschieht.'
   ]);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  created_at,
  updated_at
)
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  user_id,
  'authenticated',
  'authenticated',
  email,
  extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
  now(),
  jsonb_build_object('provider', 'demo', 'providers', '[]'::jsonb, 'is_demo', true),
  jsonb_build_object('display_name', display_name, 'demo_seed', 'uebermensch-v1'),
  '',
  '',
  '',
  '',
  now(),
  now()
from demo_social_personas
on conflict (id) do nothing;

insert into public.profiles (
  id,
  email,
  display_name,
  phase,
  level,
  active_pillars,
  onboarding_complete,
  subscription_tier,
  pillar_scores,
  legal_consent_complete,
  ai_processing_consent,
  terms_version,
  privacy_version,
  legal_accepted_at
)
select
  user_id,
  email,
  display_name,
  'discovery',
  '3.0',
  active_pillars,
  true,
  'free',
  pillar_scores,
  true,
  false,
  '2026-07-14-community-v1',
  '2026-07-14-community-v1',
  now()
from demo_social_personas
on conflict (id) do update set
  display_name = excluded.display_name,
  phase = excluded.phase,
  level = excluded.level,
  active_pillars = excluded.active_pillars,
  onboarding_complete = excluded.onboarding_complete,
  pillar_scores = excluded.pillar_scores;

insert into public.social_profiles (user_id, display_name, bio, avatar_path, is_discoverable)
select user_id, display_name, bio, null, true
from demo_social_personas
on conflict (user_id) do update set
  display_name = excluded.display_name,
  bio = excluded.bio,
  avatar_path = excluded.avatar_path,
  is_discoverable = excluded.is_discoverable;

insert into public.social_posts (id, user_id, body, created_at, updated_at)
select
  ('20000000-0000-4000-8000-' || lpad((((persona.position - 1) * 3) + post.ordinality)::text, 12, '0'))::uuid,
  persona.user_id,
  post.body,
  now() - make_interval(hours => (((post.ordinality - 1) * 20 + persona.position)::integer)),
  now() - make_interval(hours => (((post.ordinality - 1) * 20 + persona.position)::integer))
from demo_social_personas persona
cross join lateral unnest(persona.posts) with ordinality as post(body, ordinality)
on conflict (id) do update set
  body = excluded.body,
  deleted_at = null,
  updated_at = excluded.updated_at;
