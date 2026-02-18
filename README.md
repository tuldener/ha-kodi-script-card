# Kodi Script Card (Home Assistant)

Eine Lovelace-Kachel für Kodi Builtin-Aufrufe über `kodi.call_method`.

## Features

- Mehrere Scripts in einer Card
- Aufruf via `XBMC.ExecuteBuiltin`
- Strikte Validierung: nur Script-Pfade mit `.py`
- Optional: `stop_before_run: true` stoppt zuerst die aktuelle Wiedergabe
- Visueller Lovelace-Editor (GUI)
- Icon-Auswahl pro Script
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
stop_before_run: true
scripts:
  - name: Mein Script
    icon: mdi:script-text-play
    script: /storage/.kodi/userdata/xyz.py
```

## Gesendeter Service-Aufruf

```yaml
service: kodi.call_method
data:
  entity_id: media_player.dein_kodi
  method: XBMC.ExecuteBuiltin
  command: RunScript(/storage/.kodi/userdata/xyz.py)
```
