# CLAUDE.md

## Projektzweck

Fahrzeugprüfungs-PWA für die Freiwillige Feuerwehr Hohe Börde - Irxleben.
Die Anwendung erlaubt das Erfassen von Fahrzeugprüfungen offline, das Speichern laufender Prüfungen, das Erfassen von n.i.O.-Hinweisen mit Fotos, das Einholen einer Unterschrift und das Erstellen eines druckbaren Prüfberichts.

## Tech-Stack

- HTML / CSS / JavaScript
- Progressive Web App (PWA) mit Manifest und Service Worker
- Lokale Speicherung derzeit mit `localStorage`
- Druckoptimierter Bericht für PDF-Export über `window.print()`
- Geplante Erweiterung: IndexedDB für robustere lokale Datenspeicherung und später auch zentrale Synchronisierung

## Projektstruktur

- `index.html`
  - Einstiegsseite der PWA
  - Enthält Hero, Installations-Hinweis und Root-Container für die App
  - Bindet Styles und JavaScript ein

- `styles.css`
  - Visuelles Design
  - Karten-Layout, Formular- und Eingabestile
  - Druckstile für PDF/Print-Export

- `script.js`
  - Anwendungslogik
  - Prüfungsdaten bauen, rendern und aktualisieren
  - Event-Handling für Start, Statusauswahl, Foto-Anhang, Unterschrift und Speichern
  - Installation als PWA, Storage-Persistenz und lokale Datenverwaltung

- `js/checklisten.js`
  - Enthält die Fahrzeugprüfungs-Checklisten-Daten
  - Wird in `script.js` geladen, um Prüfungsfälle zu initialisieren

- `manifest.json`
  - PWA-Metadaten
  - Name, Short Name, Farben, Start-URL, Icons

- `service-worker.js`
  - Offline-Caching der App-Shell
  - Stellt die App auch ohne Netzwerk für wiederholte Nutzung bereit

- `icons/`
  - App-Icon-Dateien für Manifest und Installation

- `data/`
  - Projektordner für zusätzliche Daten oder spätere Exporte

## Design-Vorgaben

- Farbwelt: Feuerwehr-Rot als zentrales Akzent- und Markenfarbe
- Karten-Layout: Klare, abgesetzte Kartelemente mit weichen Rundungen und Schatten
- Typografie: Modern, gut lesbar, Kontrast für Formulare und Labels
- UI-Stil: Mobile-first, large touch targets, klare Status-Pillen und Aktionsknöpfe
- Atmosphäre: Helles Layout mit roten Akzenten für Warnung/Markierung und neutralen Flächen für übersichtliche Prüfungslisten

## Was bereits funktioniert

- Start einer neuen Fahrzeugprüfung mit Auswahl eines Fahrzeugtyps
- Darstellung der Checkliste im Kartenlayout
- Statusauswahl für Prüfpunkte (`OK` / `N.i.O.`)
- Eingabe von Bemerkungen und Anhängen von Fotos
- Speichern des aktuellen Arbeitsstands in `localStorage`
- Offline-fähiges App-Shell-Caching mit Service Worker
- Installations-Banner für PWA-Install
- Druckbarer Bericht über Browser-Print

## Offene Punkte / geplante nächste Schritte

- Hosting auf GitHub Pages zur einfachen Verteilung
- Umstieg von `localStorage` auf IndexedDB für stabilere Offline-Storage und größere Datenmengen
- Zentralisierung über Supabase oder ein anderes Backend für gemeinsame Prüfungsdaten
- Automatisierte Export- und Import-Funktion für Prüfungslisten
- Verbesserte Validierung und UI für Unterschrifts-Workflow
- Mehrere Prüfungen parallel verwalten / Prüfungsarchiv
- Barrierefreiheit und Zugänglichkeit weiter verbessern

## Pflegehinweis

Diese Datei wird bei jeder größeren Änderung am Projekt aktualisiert. Sie dokumentiert den aktuellen Stand, die wichtigsten Komponenten und die nächsten Entwicklungs-Schritte.
