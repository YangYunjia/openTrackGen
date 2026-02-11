// Properties panel behavior (selection info + editable properties).

class PropertiesPanel {
  constructor(options) {
    this.state = options.state;
    this.selectionTool = options.selectionTool;
    this.rebuildSelectionIndex = options.rebuildSelectionIndex;
    this.drawLines = options.drawLines;
    this.drawAll = options.drawAll;
    this.colorPanel = options.colorPanel;

    this.lineWidthSelect = document.getElementById("lineWidthSelect");
    this.lineStyleSelect = document.getElementById("lineStyleSelect");
    this.lineStartCapSelect = document.getElementById("lineStartCapSelect");
    this.lineEndCapSelect = document.getElementById("lineEndCapSelect");
    this.lineStartOffset = document.getElementById("lineStartOffset");
    this.lineEndOffset = document.getElementById("lineEndOffset");
    this.lineStartOffsetY = document.getElementById("lineStartOffsetY");
    this.lineEndOffsetY = document.getElementById("lineEndOffsetY");
    this.textOffset = document.getElementById("textOffset");
    this.textOffsetY = document.getElementById("textOffsetY");
    this.lineStartOffsetValue = document.getElementById("lineStartOffsetValue");
    this.lineEndOffsetValue = document.getElementById("lineEndOffsetValue");
    this.lineStartOffsetYValue = document.getElementById("lineStartOffsetYValue");
    this.lineEndOffsetYValue = document.getElementById("lineEndOffsetYValue");
    this.textOffsetValue = document.getElementById("textOffsetValue");
    this.textOffsetYValue = document.getElementById("textOffsetYValue");
    this.propStatus = document.getElementById("propStatus");
    this.propType = document.getElementById("propType");
    this.propId = document.getElementById("propId");
    this.linePresetSelect = document.getElementById("linePresetSelect");
    this.propText = document.getElementById("propText");
    this.btnDeleteSelected = document.getElementById("btnDeleteSelected");

    this.lineOffsetControls = [
      { input: this.lineStartOffset, valueEl: this.lineStartOffsetValue, index: 0, axis: 0 },
      { input: this.lineStartOffsetY, valueEl: this.lineStartOffsetYValue, index: 0, axis: 1 },
      { input: this.lineEndOffset, valueEl: this.lineEndOffsetValue, index: 1, axis: 0 },
      { input: this.lineEndOffsetY, valueEl: this.lineEndOffsetYValue, index: 1, axis: 1 }
    ];
    this.textOffsetControls = [
      { input: this.textOffset, valueEl: this.textOffsetValue, axis: 0 },
      { input: this.textOffsetY, valueEl: this.textOffsetYValue, axis: 1 }
    ];
    this.linePresets = [];

    this.bindEvents();
    this.loadPresets();
  }

  bindEvents() {
    this.btnDeleteSelected.addEventListener("click", () => {
      const item = this.selectionTool.getSelectedItem();
      if (!item) return;
      if (item.kind === "line") {
        this.state.lines.splice(item.index, 1);
      }
      if (item.kind === "text") {
        this.state.texts.splice(item.index, 1);
      }
      this.rebuildSelectionIndex();
      this.selectionTool.clearSelection();
      this.update();
      this.drawAll();
    });

    this.propText.addEventListener("input", (e) => {
      const item = this.selectionTool.getSelectedItem();
      if (!item || item.kind !== "text") return;
      this.state.texts[item.index].text = e.target.value;
      this.rebuildSelectionIndex();
      this.drawAll();
    });

    this.lineWidthSelect.addEventListener("change", (e) => {
      const value = Number(e.target.value);
      if (this.state.tool === "select") {
        const item = this.selectionTool.getSelectedItem();
        if (item && item.kind === "line") {
          this.state.lines[item.index].width = value;
          this.rebuildSelectionIndex();
          this.drawLines();
          return;
        }
      }
      this.state.lineWidth = value;
    });

    this.lineStyleSelect.addEventListener("change", (e) => {
      const value = e.target.value;
      if (this.state.tool === "select") {
        const item = this.selectionTool.getSelectedItem();
        if (item && item.kind === "line") {
          this.state.lines[item.index].style = value;
          this.rebuildSelectionIndex();
          this.drawLines();
          return;
        }
      }
      this.state.lineStyle = value;
    });

    this.lineStartCapSelect.addEventListener("change", (e) => {
      const value = e.target.value;
      if (this.state.tool === "select") {
        const item = this.selectionTool.getSelectedItem();
        if (item && item.kind === "line") {
          this.state.lines[item.index].startCapStyle = value;
          this.rebuildSelectionIndex();
          this.drawLines();
          return;
        }
      }
      this.state.lineStartCapStyle = value;
    });

    this.linePresetSelect.addEventListener("change", (e) => {
      const value = e.target.value;
      if (!value) return;
      const applied = this.applyLinePreset(value);
      if (applied) {
        this.linePresetSelect.value = "";
      }
    });

    this.lineEndCapSelect.addEventListener("change", (e) => {
      const value = e.target.value;
      if (this.state.tool === "select") {
        const item = this.selectionTool.getSelectedItem();
        if (item && item.kind === "line") {
          this.state.lines[item.index].endCapStyle = value;
          this.rebuildSelectionIndex();
          this.drawLines();
          return;
        }
      }
      this.state.lineEndCapStyle = value;
    });

    this.lineOffsetControls.forEach((control) => {
      control.input.addEventListener("input", (e) => {
        const value = Number(e.target.value) || 0;
        control.valueEl.textContent = String(value);
        if (this.state.tool === "select") {
          const item = this.selectionTool.getSelectedItem();
          if (item && item.kind === "line") {
            const offsets = Array.isArray(item.data.offsets) ? item.data.offsets : [[0, 0], [0, 0]];
            offsets[control.index][control.axis] = value;
            this.state.lines[item.index].offsets = offsets;
            this.rebuildSelectionIndex();
            this.drawLines();
            return;
          }
        }
        this.state.lineOffsets[control.index][control.axis] = value;
      });
    });

    this.textOffsetControls.forEach((control) => {
      control.input.addEventListener("input", (e) => {
        const value = Number(e.target.value) || 0;
        control.valueEl.textContent = String(value);
        if (this.state.tool === "select") {
          const item = this.selectionTool.getSelectedItem();
          if (item && item.kind === "text") {
            const offset = Array.isArray(item.data.offset) ? item.data.offset : [0, 0];
            offset[control.axis] = value;
            this.state.texts[item.index].offset = offset;
            this.rebuildSelectionIndex();
            this.drawLines();
            return;
          }
        }
        this.state.textOffset[control.axis] = value;
      });
    });

  }

  setOffsetControl(input, valueEl, value) {
    const v = Number(value) || 0;
    input.value = String(v);
    valueEl.textContent = String(v);
  }

  updateLineControlsForContext() {
    const selected = this.selectionTool.getSelectedItem();
    const isDraw = this.state.tool === "draw";
    const isText = this.state.tool === "text";
    const canEditLine =
      isDraw ||
      (this.state.tool === "select" && selected && selected.kind === "line");
    const canEditText =
      isText ||
      (this.state.tool === "select" && selected && selected.kind === "text");

    this.lineWidthSelect.disabled = !canEditLine;
    this.lineStyleSelect.disabled = !canEditLine;
    this.lineStartCapSelect.disabled = !canEditLine;
    this.lineEndCapSelect.disabled = !canEditLine;
    this.lineOffsetControls.forEach((control) => {
      control.input.disabled = !canEditLine;
    });
    this.textOffsetControls.forEach((control) => {
      control.input.disabled = !canEditText;
    });
    this.colorPanel.setEnabled(canEditLine || canEditText);

    if (isDraw) {
      this.lineWidthSelect.value = String(this.state.lineWidth);
      this.lineStyleSelect.value = this.state.lineStyle;
      this.lineStartCapSelect.value = this.state.lineStartCapStyle;
      this.lineEndCapSelect.value = this.state.lineEndCapStyle;
      this.lineOffsetControls.forEach((control) => {
        this.setOffsetControl(
          control.input,
          control.valueEl,
          this.state.lineOffsets[control.index][control.axis]
        );
      });
    }

    if (isText) {
      this.textOffsetControls.forEach((control) => {
        this.setOffsetControl(
          control.input,
          control.valueEl,
          this.state.textOffset[control.axis]
        );
      });
    }
  }

  update() {
    if (this.selectionTool.selectedIndex === null) {
      this.propStatus.textContent = "None";
      this.propType.textContent = "-";
      this.propId.textContent = "-";
      this.propText.value = "";
      this.propText.disabled = true;
      this.btnDeleteSelected.disabled = true;
      this.colorPanel.setSwatch(this.state.currentColor);
      this.updateLineControlsForContext();
      return;
    }
    const item = this.selectionTool.getSelectedItem();
    if (!item) {
      this.propStatus.textContent = "None";
      this.propType.textContent = "-";
      this.propId.textContent = "-";
      this.propText.value = "";
      this.propText.disabled = true;
      this.btnDeleteSelected.disabled = true;
      this.colorPanel.setSwatch(this.state.currentColor);
      this.updateLineControlsForContext();
      return;
    }
    this.propStatus.textContent = "Selected";
    this.propType.textContent = item.kind;
    this.propId.textContent = String(item.index);
    if (item.kind === "line") {
      const line = item.data;
      this.lineWidthSelect.value = String(line.width || 1);
      this.lineStyleSelect.value = line.style || "solid";
      this.lineStartCapSelect.value = line.startCapStyle || "none";
      this.lineEndCapSelect.value = line.endCapStyle || "none";
      const offsets = Array.isArray(line.offsets) ? line.offsets : [[0, 0], [0, 0]];
      this.lineOffsetControls.forEach((control) => {
        this.setOffsetControl(
          control.input,
          control.valueEl,
          offsets[control.index][control.axis]
        );
      });
      this.colorPanel.setSwatch(line.color || this.state.currentColor);
      this.propText.value = "";
      this.propText.disabled = true;
    } else {
      const text = item.data;
      this.propText.value = text.text;
      this.propText.disabled = false;
      const offset = Array.isArray(text.offset) ? text.offset : [text.offsetX || 0, text.offsetY || 0];
      this.textOffsetControls.forEach((control) => {
        this.setOffsetControl(
          control.input,
          control.valueEl,
          offset[control.axis]
        );
      });
      this.colorPanel.setSwatch(text.color || this.state.currentColor);
    }
    this.btnDeleteSelected.disabled = false;
    this.updateLineControlsForContext();
  }

  applyLinePreset(presetId) {
    const config = this.linePresets.find((preset) => preset.id === presetId);
    if (!config) return false;
    if (this.state.tool === "select") {
      const item = this.selectionTool.getSelectedItem();
      if (!item || item.kind !== "line") return false;
      this.state.lines[item.index].width = config.width;
      this.state.lines[item.index].style = config.style;
      this.state.lines[item.index].offsets = config.offsets.map((pair) => [pair[0], pair[1]]);
      this.state.lines[item.index].startCapStyle = config.startCapStyle;
      this.state.lines[item.index].endCapStyle = config.endCapStyle;
      this.rebuildSelectionIndex();
      this.drawLines();
      this.update();
      return true;
    }
    this.state.lineWidth = config.width;
    this.state.lineStyle = config.style;
    this.state.lineOffsets = config.offsets.map((pair) => [pair[0], pair[1]]);
    this.state.lineStartCapStyle = config.startCapStyle;
    this.state.lineEndCapStyle = config.endCapStyle;
    this.updateLineControlsForContext();
    return true;
  }

  async loadPresets() {
    if (Array.isArray(window.LINE_PRESETS)) {
      this.linePresets = window.LINE_PRESETS.filter((preset) => preset && preset.id && preset.label);
      this.renderLinePresetOptions();
      return;
    }
    this.renderPresetLoadError();
  }

  renderLinePresetOptions() {
    while (this.linePresetSelect.options.length > 1) {
      this.linePresetSelect.remove(1);
    }
    this.linePresets.forEach((preset) => {
      const option = document.createElement("option");
      option.value = preset.id;
      option.textContent = preset.label;
      this.linePresetSelect.appendChild(option);
    });
  }

  renderPresetLoadError() {
    while (this.linePresetSelect.options.length > 1) {
      this.linePresetSelect.remove(1);
    }
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Failed to load presets";
    option.disabled = true;
    this.linePresetSelect.appendChild(option);
  }

  init() {
    this.lineWidthSelect.value = String(this.state.lineWidth);
    this.lineStyleSelect.value = this.state.lineStyle;
    this.lineStartCapSelect.value = this.state.lineStartCapStyle;
    this.lineEndCapSelect.value = this.state.lineEndCapStyle;
    this.lineOffsetControls.forEach((control) => {
      const value = this.state.lineOffsets[control.index][control.axis];
      control.input.value = String(value);
      control.valueEl.textContent = String(value);
    });
    this.textOffsetControls.forEach((control) => {
      const value = this.state.textOffset[control.axis];
      control.input.value = String(value);
      control.valueEl.textContent = String(value);
    });
    this.colorPanel.setSwatch(this.state.currentColor);
    this.update();
  }
}

window.PropertiesPanel = PropertiesPanel;
