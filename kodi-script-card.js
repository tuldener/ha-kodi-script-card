class KodiScriptCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("kodi-script-card-editor");
  }

  static getStubConfig() {
    return {
      type: "custom:kodi-script-card",
      icon: "mdi:script-text-play",
      debug: false,
      stop_before_run: false,
      entity: "",
      scripts: [
        {
          name: "Script 1",
          icon: "mdi:script-text-play",
          script: "/storage/.kodi/userdata/xyz.py",
        },
      ],
    };
  }

  setConfig(config) {
    const sanitizedConfig = { ...config };
    delete sanitizedConfig.playlist;
    delete sanitizedConfig.playlists;
    delete sanitizedConfig.open_mode;
    delete sanitizedConfig.window;
    delete sanitizedConfig.method;
    delete sanitizedConfig.params;

    if (!Array.isArray(sanitizedConfig.scripts) || sanitizedConfig.scripts.length === 0) {
      if (Array.isArray(config.playlists) && config.playlists.length > 0) {
        sanitizedConfig.scripts = config.playlists.map((item) => ({
          name: item.name || "Script",
          icon: item.icon || "mdi:script-text-play",
          script: item.script || item.playlist || "",
        }));
      } else if (config.playlist) {
        sanitizedConfig.scripts = [
          {
            name: config.name || "Script",
            icon: config.icon || "mdi:script-text-play",
            script: config.playlist,
          },
        ];
      } else {
        sanitizedConfig.scripts = [];
      }
    }

    this._config = {
      icon: "mdi:script-text-play",
      debug: false,
      stop_before_run: false,
      ...sanitizedConfig,
    };
    if (!Array.isArray(this._debugHistory)) {
      this._debugHistory = [];
    }

    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }

    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  connectedCallback() {
    if (!this._refreshTimer) {
      this._refreshTimer = setInterval(() => this._render(), 10000);
    }
  }

  disconnectedCallback() {
    if (this._refreshTimer) {
      clearInterval(this._refreshTimer);
      this._refreshTimer = null;
    }
  }

  getCardSize() {
    const count = this._getEntries().length;
    return Math.max(1, count);
  }

  _getEntries() {
    if (!this._config) {
      return [];
    }

    if (Array.isArray(this._config.scripts) && this._config.scripts.length > 0) {
      return this._config.scripts
        .filter(function (item) {
          return item && item.script;
        })
        .map(
          function (item) {
            return {
              name: item.name || item.script,
              script: item.script,
              icon: item.icon || this._config.icon,
            };
          }.bind(this)
        );
    }
    return [];
  }

  _render() {
    if (!this.shadowRoot || !this._config) {
      return;
    }

    const stateObj = this._hass && this._hass.states && this._hass.states[this._config.entity];
    const disabled = !this._hass || !stateObj;
    const entries = this._getEntries();
    const hasEntity = !!this._config.entity;
    const hasEntries = entries.length > 0;
    const entityTitle =
      (stateObj && stateObj.attributes && stateObj.attributes.friendly_name) || this._config.name || "Kodi";
    const mediaTitle = this._getNowPlayingTitle(stateObj);

    const rows = entries
      .map(
        function (entry, index) {
          return `
          <button class="script-row" data-index="${index}" ${disabled ? "disabled" : ""}>
            <ha-icon icon="${this._escape(entry.icon)}"></ha-icon>
            <div class="row-text">
              <div class="row-title">${this._escape(entry.name)}</div>
            </div>
          </button>
        `;
        }.bind(this)
      )
      .join("");

    const debugEntries = this._debugHistory && this._debugHistory.length > 0 ? this._debugHistory : [];
    const debugItems = debugEntries
      .map(
        function (entry, index) {
          const nr = debugEntries.length - index;
          const open = index === 0 ? "open" : "";
          return `<details class="debug-entry" ${open}>
            <summary>Eintrag ${nr}</summary>
            <pre>${this._escape(entry)}</pre>
          </details>`;
        }.bind(this)
      )
      .join("");
    const debugBlock =
      this._config.debug
        ? `<div class="debug">
            <div class="debug-title">Debug Rueckmeldungen (letzte 5)</div>
            ${debugItems || "<pre>Noch keine Rueckmeldung.</pre>"}
          </div>`
        : "";

    this.shadowRoot.innerHTML = `
      <ha-card>
        <div class="header">
          <div class="header-media-bg"></div>
          <div class="media-text">
            <div class="entity-title">${this._escape(entityTitle)}</div>
            <div class="now-title">${this._escape(mediaTitle)}</div>
          </div>
          <div class="header-actions">
            <button class="system-btn" data-system-method="System.Reboot" title="System Reboot" ${
              disabled ? "disabled" : ""
            }>
              <ha-icon icon="mdi:restart"></ha-icon>
            </button>
            <button class="system-btn" data-system-method="System.Shutdown" title="System Shutdown" ${
              disabled ? "disabled" : ""
            }>
              <ha-icon icon="mdi:power"></ha-icon>
            </button>
          </div>
        </div>
        <div class="list">${rows}</div>
        ${!hasEntity ? '<div class="hint">Bitte im Editor eine Kodi-Entity auswaehlen.</div>' : ""}
        ${!hasEntries ? '<div class="hint">Bitte mindestens ein Script konfigurieren.</div>' : ""}
        ${debugBlock}
      </ha-card>
      <style>
        :host { display: block; }
        ha-card { overflow: hidden; }

        .header {
          position: relative;
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          min-height: 96px;
          border-bottom: 1px solid var(--divider-color);
          overflow: hidden;
        }

        .header-media-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
          background-image: linear-gradient(
            110deg,
            color-mix(in srgb, var(--card-background-color) 95%, black 5%) 0%,
            color-mix(in srgb, var(--card-background-color) 85%, black 15%) 55%,
            color-mix(in srgb, var(--card-background-color) 70%, black 30%) 100%
          );
          background-size: cover;
          background-position: center;
          filter: saturate(1.02);
        }

        .media-text {
          position: relative;
          z-index: 1;
          min-width: 0;
        }

        .entity-title {
          font-size: 0.9rem;
          color: color-mix(in srgb, var(--primary-text-color) 90%, white 10%);
          line-height: 1.2;
        }

        .now-title {
          margin-top: 6px;
          font-weight: 600;
          font-size: 1.25rem;
          color: var(--primary-text-color);
          line-height: 1.2;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
        }

        .header-actions {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }

        .system-btn {
          width: 38px;
          height: 38px;
          border-radius: 999px;
          border: 1px solid color-mix(in srgb, var(--divider-color) 70%, white 30%);
          background: color-mix(in srgb, var(--card-background-color) 78%, black 22%);
          color: var(--primary-text-color);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 0;
        }

        .system-btn ha-icon {
          --mdc-icon-size: 20px;
        }

        .system-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .system-btn:hover:not(:disabled) {
          background: color-mix(in srgb, var(--card-background-color) 65%, black 35%);
        }

        .list {
          display: grid;
          grid-template-columns: 1fr;
        }

        .script-row {
          width: 100%;
          border: 0;
          border-bottom: 1px solid var(--divider-color);
          background: none;
          color: var(--primary-text-color);
          display: grid;
          grid-template-columns: 30px 1fr;
          gap: 12px;
          align-items: center;
          padding: 12px 16px;
          cursor: pointer;
          text-align: left;
        }

        .script-row:last-child { border-bottom: 0; }
        .script-row:disabled { cursor: not-allowed; opacity: 0.6; }

        ha-icon {
          color: var(--primary-color);
          --mdc-icon-size: 22px;
        }

        .row-title {
          font-weight: 500;
          line-height: 1.2;
        }

        .hint {
          border-top: 1px solid var(--divider-color);
          padding: 10px 16px;
          color: var(--secondary-text-color);
          font-size: 0.8rem;
        }

        .debug {
          border-top: 1px solid var(--divider-color);
          padding: 10px 16px;
        }

        .debug-title {
          font-size: 0.8rem;
          color: var(--secondary-text-color);
          margin-bottom: 6px;
        }

        .debug pre {
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
          font-size: 0.75rem;
          line-height: 1.3;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }

        .debug-entry {
          margin-top: 6px;
          border: 1px solid var(--divider-color);
          border-radius: 6px;
          padding: 4px 8px;
        }

        .debug-entry summary {
          cursor: pointer;
          font-size: 0.78rem;
          color: var(--secondary-text-color);
          margin: 2px 0;
        }
      </style>
    `;

    const buttons = this.shadowRoot.querySelectorAll("button.script-row");
    for (let i = 0; i < buttons.length; i += 1) {
      const button = buttons[i];
      button.addEventListener("click", () => this._handleTap(i));
    }

    const actionButtons = this.shadowRoot.querySelectorAll("button.system-btn");
    for (let i = 0; i < actionButtons.length; i += 1) {
      const button = actionButtons[i];
      const method = button.getAttribute("data-system-method");
      button.addEventListener("click", () => this._handleSystemAction(method));
    }

    this._setHeaderBackground(stateObj);
  }

  async _handleTap(index) {
    const config = this._config;
    if (!this._hass || !config) {
      return;
    }
    if (!config.entity) {
      this._showToast("Bitte zuerst eine Kodi-Entity konfigurieren.");
      return;
    }

    const entries = this._getEntries();
    const entry = entries[index];
    if (!entry) {
      return;
    }
    let serviceData = null;

    try {
      if (!this._isValidPythonScriptPath(entry.script)) {
        const validationMessage = "Ungueltiger Script-Pfad. Bitte einen .py Pfad angeben.";
        if (config.debug) {
          this._pushDebug(this._formatDebug("error", { script: entry.script }, null, validationMessage));
        }
        this._showToast(validationMessage);
        return;
      }
      if (config.stop_before_run) {
        const stopData = {
          entity_id: config.entity,
          method: "XBMC.ExecuteBuiltin",
          command: "PlayerControl(Stop)",
        };
        const stopResponse = await this._hass.callService("kodi", "call_method", stopData);
        if (config.debug) {
          this._pushDebug(this._formatDebug("success", stopData, stopResponse));
        }
        await this._sleep(700);
      }
      const command = this._buildBuiltinCommand(entry.script);
      serviceData = {
        entity_id: config.entity,
        method: "XBMC.ExecuteBuiltin",
        command: command,
      };

      const response = await this._hass.callService("kodi", "call_method", serviceData);
      if (config.debug) {
        this._pushDebug(this._formatDebug("success", serviceData, response));
      }

      this._showToast("Kodi-Aktion gesendet: " + entry.name);
      this._render();
    } catch (err) {
      const message = (err && err.message) || "Unbekannter Fehler";
      if (config.debug) {
        this._pushDebug(this._formatDebug("error", serviceData, null, err));
      }
      this._showToast("Fehler: " + message);
      this._render();
    }
  }

  async _handleSystemAction(method) {
    if (!this._hass || !this._config || !this._config.entity || !method) {
      this._showToast("Bitte zuerst eine Kodi-Entity konfigurieren.");
      return;
    }

    const serviceData = {
      entity_id: this._config.entity,
      method: method,
    };

    try {
      const response = await this._hass.callService("kodi", "call_method", serviceData);
      if (this._config.debug) {
        this._pushDebug(this._formatDebug("success", serviceData, response));
      }
      if (method === "System.Shutdown") {
        this._showToast("System.Shutdown gesendet.");
      } else {
        this._showToast("System.Reboot gesendet.");
      }
    } catch (err) {
      if (this._config.debug) {
        this._pushDebug(this._formatDebug("error", serviceData, null, err));
      }
      const message = (err && err.message) || "Unbekannter Fehler";
      this._showToast("Fehler: " + message);
    }
  }

  _showToast(message) {
    const event = new CustomEvent("hass-notification", {
      detail: { message: message },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  _buildBuiltinCommand(value) {
    const raw = String(value || "").trim();
    return "RunScript(" + raw + ")";
  }

  _isValidPythonScriptPath(value) {
    const raw = String(value || "").trim().toLowerCase();
    return raw.length > 3 && raw.endsWith(".py");
  }

  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  _getNowPlayingTitle(stateObj) {
    if (!stateObj || !stateObj.attributes) {
      return "Keine Wiedergabe";
    }
    const mediaTitle = stateObj.attributes.media_title;
    const mediaArtist = stateObj.attributes.media_artist;
    if (mediaTitle && mediaArtist) {
      return mediaArtist + " - " + mediaTitle;
    }
    if (mediaTitle) {
      return mediaTitle;
    }
    return "Keine Wiedergabe";
  }

  _setHeaderBackground(stateObj) {
    const bg = this.shadowRoot && this.shadowRoot.querySelector(".header-media-bg");
    if (!bg) {
      return;
    }
    const artwork = this._getArtworkUrl(stateObj);
    if (!artwork) {
      return;
    }
    const refreshedArtwork = this._withCacheBust(artwork);
    const safeArtwork = String(refreshedArtwork).replace(/"/g, "%22");
    bg.style.backgroundImage =
      'linear-gradient(100deg, rgba(17, 16, 12, 0.84) 0%, rgba(17, 16, 12, 0.70) 52%, rgba(17, 16, 12, 0.48) 100%), url("' +
      safeArtwork +
      '")';
  }

  _getArtworkUrl(stateObj) {
    if (!stateObj || !stateObj.attributes) {
      return "";
    }
    let artwork =
      stateObj.attributes.entity_picture ||
      stateObj.attributes.media_image_url ||
      stateObj.attributes.media_image ||
      "";
    if (!artwork) {
      return "";
    }
    if (typeof this._hass === "object" && typeof this._hass.hassUrl === "function" && artwork.startsWith("/")) {
      artwork = this._hass.hassUrl(artwork);
    }
    return artwork;
  }

  _withCacheBust(url) {
    if (!url) {
      return "";
    }
    const stamp = Math.floor(Date.now() / 10000);
    const separator = String(url).indexOf("?") === -1 ? "?" : "&";
    return String(url) + separator + "cb=" + stamp;
  }

  _escape(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  _formatDebug(status, requestPayload, responsePayload, err) {
    const parts = [];
    parts.push("status: " + status);
    parts.push("time: " + new Date().toISOString());
    if (requestPayload) {
      parts.push("request:");
      parts.push(this._toJsonString(requestPayload));
    }
    if (responsePayload !== undefined) {
      parts.push("response:");
      parts.push(this._toJsonString(responsePayload));
    }
    if (err) {
      parts.push("error:");
      parts.push((err && err.message) || String(err));
    }
    return parts.join("\n");
  }

  _toJsonString(value) {
    try {
      return JSON.stringify(value, null, 2);
    } catch (_error) {
      return String(value);
    }
  }

  _pushDebug(entryText) {
    if (!Array.isArray(this._debugHistory)) {
      this._debugHistory = [];
    }
    this._debugHistory.unshift(String(entryText));
    if (this._debugHistory.length > 5) {
      this._debugHistory = this._debugHistory.slice(0, 5);
    }
  }
}

class KodiScriptCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._hass = null;
    this.attachShadow({ mode: "open" });
  }

  setConfig(config) {
    this._config = {
      type: "custom:kodi-script-card",
      icon: "mdi:script-text-play",
      debug: false,
      stop_before_run: false,
      entity: "",
      ...config,
    };

    if (!Array.isArray(this._config.scripts) || this._config.scripts.length === 0) {
      if (Array.isArray(this._config.playlists) && this._config.playlists.length > 0) {
        this._config.scripts = this._config.playlists.map((item) => ({
          name: item.name || "Script",
          icon: item.icon || this._config.icon || "mdi:script-text-play",
          script: item.script || item.playlist || "",
        }));
      } else if (this._config.playlist) {
        this._config.scripts = [
          {
            name: this._config.name || "Script",
            icon: this._config.icon || "mdi:script-text-play",
            script: this._config.playlist,
          },
        ];
      } else {
        this._config.scripts = [
          {
            name: "Neues Script",
            icon: this._config.icon || "mdi:script-text-play",
            script: "",
          },
        ];
      }
    }
    this._config.scripts = (this._config.scripts || []).map((item) => ({
      ...item,
      icon: item.icon || this._config.icon || "mdi:script-text-play",
    }));
    delete this._config.playlist;
    delete this._config.playlists;
    delete this._config.method;
    delete this._config.params;
    delete this._config.open_mode;
    delete this._config.window;
    delete this._config.name;

    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.shadowRoot || !this.shadowRoot.innerHTML) {
      this._render();
      return;
    }
    this._syncIconPickersHass();
  }

  _emitConfig(config) {
    const normalized = this._normalizeConfigForSave(config);
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: normalized },
        bubbles: true,
        composed: true,
      })
    );
  }

  _normalizeConfigForSave(config) {
    const normalized = { ...config };
    delete normalized.name;
    delete normalized.playlist;
    delete normalized.playlists;
    delete normalized.method;
    delete normalized.params;
    delete normalized.open_mode;
    delete normalized.window;
    normalized.stop_before_run = !!normalized.stop_before_run;
    normalized.scripts = (normalized.scripts || [])
      .filter((item) => item && item.script)
      .map((item) => ({ name: item.name || item.script, icon: item.icon || normalized.icon, script: item.script }));

    return normalized;
  }

  _updateRootField(field, value) {
    let normalizedValue = value;
    if (field === "debug") {
      normalizedValue = value === "true";
    }
    if (field === "stop_before_run") {
      normalizedValue = value === "true";
    }
    const next = { ...this._config, [field]: normalizedValue };
    delete next.playlist;
    delete next.playlists;
    this._config = next;
    this._emitConfig(next);
    this._render();
  }

  _updateScriptField(index, field, value) {
    const scripts = (this._config.scripts || []).map(function (item) {
      return { ...item };
    });
    if (!scripts[index]) {
      return;
    }

    scripts[index][field] = value;

    const next = {
      ...this._config,
      scripts: scripts,
    };
    delete next.playlist;
    delete next.playlists;
    this._config = next;
    this._emitConfig(next);
    this._render();
  }

  _addScript() {
    const scripts = (this._config.scripts || []).concat([
      {
        name: "Neues Script",
        icon: this._config.icon || "mdi:script-text-play",
        script: "",
      },
    ]);

    const next = {
      ...this._config,
      scripts: scripts,
    };
    delete next.playlist;
    delete next.playlists;
    this._config = next;
    this._emitConfig(next);
    this._render();
  }

  _removeScript(index) {
    const scripts = (this._config.scripts || []).filter(function (_item, i) {
      return i !== index;
    });

    if (scripts.length === 0) {
      scripts.push({
        name: "Neues Script",
        icon: this._config.icon || "mdi:script-text-play",
        script: "",
      });
    }

    const next = {
      ...this._config,
      scripts: scripts,
    };
    delete next.playlist;
    delete next.playlists;
    this._config = next;
    this._emitConfig(next);
    this._render();
  }

  _render() {
    if (!this.shadowRoot) {
      return;
    }

    const scripts = this._config.scripts || [];
    const kodiEntities = this._getKodiEntities();
    const hasCurrentEntity = !!this._config.entity;
    const knownEntity = kodiEntities.some(
      function (item) {
        return item.entity_id === this._config.entity;
      }.bind(this)
    );
    const entityOptions = []
      .concat(
        hasCurrentEntity && !knownEntity
          ? [
              {
                entity_id: this._config.entity,
                name: this._config.entity + " (manuell)",
              },
            ]
          : []
      )
      .concat(kodiEntities)
      .map(
        function (item) {
          const selected = item.entity_id === this._config.entity ? "selected" : "";
          return `<option value="${this._escapeAttr(item.entity_id)}" ${selected}>${this._escape(
            item.name
          )} (${this._escape(item.entity_id)})</option>`;
        }.bind(this)
      )
      .join("");

    const scriptRows = scripts
      .map(
        function (item, index) {
          return `
            <div class="script-item" data-index="${index}">
              <div class="row-head">
                <div class="row-label">Script ${index + 1}</div>
                <button class="danger" type="button" data-action="remove" data-index="${index}">Entfernen</button>
              </div>
              <label>Name</label>
              <input data-field="name" data-index="${index}" type="text" value="${this._escapeAttr(item.name || "")}" />

              <label>Icon</label>
              <ha-icon-picker
                data-field="icon"
                data-index="${index}"
                value="${this._escapeAttr(item.icon || this._config.icon || "mdi:script-text-play")}"
              ></ha-icon-picker>

              <label>Script-Pfad (.py)</label>
              <input data-field="script" data-index="${index}" type="text" value="${this._escapeAttr(item.script || "")}" placeholder="/storage/.kodi/userdata/xyz.py" />
            </div>
          `;
        }.bind(this)
      )
      .join("");

    this.shadowRoot.innerHTML = `
      <div class="editor">
        <label>Kodi Entity (media_player...)</label>
        <select data-root="entity">
          <option value="" ${!this._config.entity ? "selected" : ""}>Bitte waehlen...</option>
          ${entityOptions}
        </select>

        <label>Debug</label>
        <select data-root="debug">
          <option value="false" ${this._config.debug ? "" : "selected"}>Aus</option>
          <option value="true" ${this._config.debug ? "selected" : ""}>Ein</option>
        </select>

        <label>Aktive Wiedergabe vorher stoppen</label>
        <select data-root="stop_before_run">
          <option value="false" ${this._config.stop_before_run ? "" : "selected"}>Aus</option>
          <option value="true" ${this._config.stop_before_run ? "selected" : ""}>Ein</option>
        </select>

        <div class="section-head">
          <div>Scripts</div>
          <button id="add" type="button">+ Script</button>
        </div>

        ${scriptRows}
      </div>

      <style>
        :host {
          display: block;
        }

        .editor {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
          padding: 8px 0;
        }

        .section-head,
        .row-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .section-head {
          margin-top: 8px;
          font-weight: 600;
        }

        .script-item {
          border: 1px solid var(--divider-color);
          border-radius: 8px;
          padding: 10px;
          display: grid;
          gap: 6px;
        }

        .row-label {
          font-weight: 600;
          font-size: 0.9rem;
        }

        label {
          color: var(--secondary-text-color);
          font-size: 0.82rem;
        }

        input {
          width: 100%;
          box-sizing: border-box;
          padding: 8px 10px;
          border: 1px solid var(--divider-color);
          border-radius: 6px;
          background: var(--card-background-color);
          color: var(--primary-text-color);
          font: inherit;
        }

        select {
          width: 100%;
          box-sizing: border-box;
          padding: 8px 10px;
          border: 1px solid var(--divider-color);
          border-radius: 6px;
          background: var(--card-background-color);
          color: var(--primary-text-color);
          font: inherit;
        }

        ha-icon-picker {
          width: 100%;
        }

        button {
          border: 1px solid var(--divider-color);
          background: var(--card-background-color);
          color: var(--primary-text-color);
          border-radius: 6px;
          padding: 6px 10px;
          cursor: pointer;
          font: inherit;
          font-size: 0.82rem;
        }

        button.danger {
          color: var(--error-color);
        }
      </style>
    `;

    const rootInputs = this.shadowRoot.querySelectorAll("input[data-root]");
    for (let i = 0; i < rootInputs.length; i += 1) {
      const input = rootInputs[i];
      input.addEventListener("change", () => {
        const field = input.getAttribute("data-root");
        this._updateRootField(field, input.value);
      });
    }
    const rootSelects = this.shadowRoot.querySelectorAll("select[data-root]");
    for (let i = 0; i < rootSelects.length; i += 1) {
      const select = rootSelects[i];
      select.addEventListener("change", () => {
        const field = select.getAttribute("data-root");
        this._updateRootField(field, select.value);
      });
    }

    const scriptInputs = this.shadowRoot.querySelectorAll("input[data-field]");
    for (let i = 0; i < scriptInputs.length; i += 1) {
      const input = scriptInputs[i];
      input.addEventListener("change", () => {
        const field = input.getAttribute("data-field");
        const index = Number(input.getAttribute("data-index"));
        this._updateScriptField(index, field, input.value);
      });
    }
    const scriptIconPickers = this.shadowRoot.querySelectorAll("ha-icon-picker[data-field='icon']");
    for (let i = 0; i < scriptIconPickers.length; i += 1) {
      const picker = scriptIconPickers[i];
      picker.addEventListener("value-changed", (event) => {
        const index = Number(picker.getAttribute("data-index"));
        const value =
          event &&
          event.detail &&
          typeof event.detail.value === "string"
            ? event.detail.value
            : "";
        this._updateScriptField(index, "icon", value);
      });
    }
    this._syncIconPickersHass();

    const removeButtons = this.shadowRoot.querySelectorAll("button[data-action='remove']");
    for (let i = 0; i < removeButtons.length; i += 1) {
      const button = removeButtons[i];
      button.addEventListener("click", () => {
        const index = Number(button.getAttribute("data-index"));
        this._removeScript(index);
      });
    }

    const addButton = this.shadowRoot.getElementById("add");
    if (addButton) {
      addButton.addEventListener("click", () => this._addScript());
    }
  }

  _escapeAttr(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  _escape(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  _syncIconPickersHass() {
    if (!this.shadowRoot || !this._hass) {
      return;
    }
    const scriptIconPickers = this.shadowRoot.querySelectorAll("ha-icon-picker[data-field='icon']");
    for (let i = 0; i < scriptIconPickers.length; i += 1) {
      scriptIconPickers[i].hass = this._hass;
    }
  }

  _getKodiEntities() {
    if (!this._hass || !this._hass.states) {
      return [];
    }

    const allMediaPlayers = Object.keys(this._hass.states)
      .filter(
        function (entityId) {
          return entityId.indexOf("media_player.") === 0;
        }.bind(this)
      )
      .map(
        function (entityId) {
          const stateObj = this._hass.states[entityId];
          const friendlyName =
            (stateObj && stateObj.attributes && stateObj.attributes.friendly_name) || entityId;
          return {
            entity_id: entityId,
            name: friendlyName,
            is_kodi: /kodi/i.test(entityId + " " + friendlyName),
          };
        }.bind(this)
      )
      .sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });

    const kodiMatches = allMediaPlayers.filter(function (item) {
        return item.is_kodi;
      });

    return kodiMatches.length > 0 ? kodiMatches : allMediaPlayers;
  }
}

customElements.define("kodi-script-card", KodiScriptCard);
customElements.define("kodi-script-card-editor", KodiScriptCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "kodi-script-card",
  name: "Kodi Script Card",
  description: "Startet eine oder mehrere Kodi Scripts via XBMC.ExecuteBuiltin RunScript.",
});
