# Kodi Script Card (Home Assistant)

Eine Lovelace-Kachel für Kodi-Aktionen. Diese Version basiert auf der `ha-kodi-smart-playlist-card` und dient als Startpunkt für ein eigenes HACS-Repository.

## Features

- Mehrere konfigurierbare Einträge in einer Card
- Ausführung über Home Assistant Service `kodi.call_method`
- Visueller Lovelace-Editor (GUI)
- Icon-Auswahl pro Eintrag
- Header mit Kodi-Infos und System-Aktionen
- Optionaler Debug-Modus

## Installation über HACS (Custom Repository)

1. In HACS: **Custom repositories** öffnen.
2. Repository-URL von `ha-kodi-script-card` eintragen.
3. Kategorie: **Dashboard**.
4. Danach die Karte installieren und Home Assistant neu laden.

## Manuelle Installation

1. Datei `kodi-script-card.js` nach `/config/www/kodi-script-card.js` kopieren.
2. In Home Assistant unter **Einstellungen -> Dashboards -> Ressourcen** als JavaScript-Modul eintragen:
   - URL: `/local/kodi-script-card.js`
   - Typ: `JavaScript Module`

## Basis-Konfiguration

```yaml
type: custom:kodi-script-card
entity: media_player.kodi_wohnzimmer
playlists:
  - name: Aktion 1
    icon: mdi:play
    playlist: special://profile/playlists/video/Filme.xsp
```

## Hinweis

Das Repo ist aktuell ein funktionaler Fork der `ha-kodi-smart-playlist-card` mit neuem Karten-Typ (`custom:kodi-script-card`) und HACS-Metadaten für den separaten Einsatz.
