// Color selection dialog and recent colors.

class ColorPanel {
  constructor(options) {
    this.state = options.state;
    this.selectionTool = options.selectionTool;
    this.drawLines = options.drawLines;

    this.btnColorDialog = document.getElementById("btnColorDialog");
    this.colorDialog = document.getElementById("colorDialog");
    this.colorDialogClose = document.getElementById("colorDialogClose");
    this.colorDialogConfirm = document.getElementById("colorDialogConfirm");
    this.colorHexInput = document.getElementById("colorHexInput");
    this.colorPickerHost = document.getElementById("colorPickerHost");
    this.colorSwatch = document.getElementById("colorSwatch");
    this.colorSwatchDialog = document.getElementById("colorSwatchDialog");
    this.colorRecent = document.getElementById("colorRecent");

    this.pendingColor = this.state.currentColor;
    this.recentColors = this.loadRecentColors();
    this.colorPicker = null;

    this.bindEvents();
    this.initColorPicker();
  }

  bindEvents() {
    this.btnColorDialog.addEventListener("click", () => {
      this.openColorDialog();
    });

    this.colorDialogClose.addEventListener("click", () => {
      this.closeColorDialog();
    });

    this.colorDialogConfirm.addEventListener("click", () => {
      this.applyColor(this.pendingColor);
      this.addRecentColor(this.pendingColor);
      this.closeColorDialog();
    });

    this.colorHexInput.addEventListener("input", (e) => {
      const next = this.normalizeHex(e.target.value);
      if (!next) return;
      this.pendingColor = next;
      this.colorPicker.color.hexString = next;
      this.colorSwatchDialog.style.background = next;
    });
  }

  setEnabled(enabled) {
    this.btnColorDialog.disabled = !enabled;
  }

  setSwatch(hex) {
    this.colorSwatch.style.background = hex;
  }

  initColorPicker() {
    this.colorPicker = new iro.ColorPicker(this.colorPickerHost, {
      width: 140,
      color: this.state.currentColor,
      layout: [
        { component: iro.ui.Wheel },
        { component: iro.ui.Slider, options: { sliderType: "value" } }
      ]
    });

    this.colorPicker.on("color:change", (color) => {
      const hex = color.hexString.toUpperCase();
      this.pendingColor = hex;
      this.colorSwatchDialog.style.background = hex;
      this.colorHexInput.value = hex;
    });

    this.renderRecentColors();
  }

  normalizeHex(value) {
    const raw = String(value || "").trim();
    if (!raw) return null;
    const withHash = raw.startsWith("#") ? raw : `#${raw}`;
    if (!/^#([0-9a-fA-F]{6})$/.test(withHash)) return null;
    return withHash.toUpperCase();
  }

  getActiveColor() {
    const selected = this.selectionTool.getSelectedItem();
    if (this.state.tool === "select" && selected) {
      if (selected.kind === "line") return selected.data.color || this.state.currentColor;
      if (selected.kind === "text") return selected.data.color || this.state.currentColor;
    }
    return this.state.currentColor;
  }

  openColorDialog() {
    const active = this.getActiveColor();
    this.pendingColor = active;
    this.colorPicker.color.hexString = active;
    this.colorHexInput.value = active;
    this.colorSwatchDialog.style.background = active;
    if (this.colorDialog && typeof this.colorDialog.showModal === "function") {
      this.colorDialog.showModal();
    } else if (this.colorDialog) {
      this.colorDialog.setAttribute("open", "open");
    }
  }

  closeColorDialog() {
    if (this.colorDialog && typeof this.colorDialog.close === "function") {
      this.colorDialog.close();
    } else if (this.colorDialog) {
      this.colorDialog.removeAttribute("open");
    }
  }

  applyColor(hex) {
    const selected = this.selectionTool.getSelectedItem();
    if (this.state.tool === "select" && selected) {
      if (selected.kind === "line") {
        this.state.lines[selected.index].color = hex;
      } else if (selected.kind === "text") {
        this.state.texts[selected.index].color = hex;
      }
      this.drawLines();
      this.setSwatch(hex);
      return;
    }
    this.state.currentColor = hex;
    this.setSwatch(hex);
  }

  loadRecentColors() {
    try {
      const raw = localStorage.getItem("recentColors");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((c) => typeof c === "string").slice(0, 20);
      }
    } catch (err) {
      return [];
    }
    return [];
  }

  saveRecentColors() {
    try {
      localStorage.setItem("recentColors", JSON.stringify(this.recentColors));
    } catch (err) {
      // Ignore storage failures.
    }
  }

  addRecentColor(hex) {
    const normalized = this.normalizeHex(hex);
    if (!normalized) return;
    this.recentColors = [normalized, ...this.recentColors.filter((c) => c !== normalized)].slice(0, 20);
    this.saveRecentColors();
    this.renderRecentColors();
  }

  renderRecentColors() {
    this.colorRecent.innerHTML = "";
    this.recentColors.forEach((hex) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.title = hex;
      btn.style.background = hex;
      btn.addEventListener("click", () => {
        this.pendingColor = hex;
        this.colorPicker.color.hexString = hex;
        this.colorHexInput.value = hex;
        this.colorSwatchDialog.style.background = hex;
      });
      this.colorRecent.appendChild(btn);
    });
  }
}

window.ColorPanel = ColorPanel;
